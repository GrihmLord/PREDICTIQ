// src/services/predictionService.ts
// Turns a scenario into a stored assessment.
//
// This is the single entry point the UI calls: it reads the user's engine
// settings, runs the expert council, optionally augments the result with a
// live model narrative, and returns a record ready for the audit log.

import {
  globalRiskService,
  DefconLevel,
  ExpertOpinion,
} from './GlobalRiskService';
import {storageService} from './storageService';
import {aiService} from './aiService';
import {createRng} from '../lib/rng';
import {
  ScenarioParameters,
  ScenarioFactor,
  calculateProbability,
  analyzeFactors,
} from '../lib/scenarioScoring';

export type {ScenarioParameters, ScenarioFactor};

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative';
  /** 0-100. */
  weight: number;
}

export interface PredictionResult {
  id: string;
  scenario: string;
  /**
   * Assessed threat probability, 0-100. Higher is worse — this tracks the
   * council's severity, and is the number the DEFCON banding is drawn from.
   * Note this is the opposite polarity to `Scenario.probability` in the guided
   * builder, which is a *success* probability.
   */
  probability: number;
  /** 0-100 confidence in the assessment itself. */
  confidence: number;
  factors: PredictionFactor[];
  timestamp: Date;
  status: 'Verified' | 'Pending' | 'Draft';
  type: 'Financial' | 'Product' | 'Strategy' | 'Metric' | 'Geopolitical';
  defconLevel: number;
  expertConsensus: string;
  activeThreats: string[];
  /** Present when a configured provider augmented the assessment. */
  narrative?: string | null;
}

export interface AnalyzeRequest {
  scenario: string;
  expertIds?: string[];
  onProgress?: (line: string) => void;
  signal?: AbortSignal;
}

export interface AnalyzeOutcome {
  result: PredictionResult;
  roundTableLog: string[];
  expertOpinions: ExpertOpinion[];
  /** Set when a provider was configured but the call did not succeed. */
  providerError: string | null;
}

const SENSITIVITY_BIAS: Record<string, number> = {
  // Conservative reads the same evidence as less alarming; aggressive, more.
  Conservative: -10,
  Balanced: 0,
  Aggressive: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Threat probability tracks the council's mean severity. Sensitivity shifts the
 * whole curve — a conservative reading of the same evidence scores lower — and
 * temperature adds a seeded spread, so the result varies between engine
 * settings but never between runs at the same settings.
 */
export function deriveProbability(
  meanSeverity: number,
  sensitivity: string,
  temperature: number,
  seed: string,
): number {
  const bias =
    SENSITIVITY_BIAS[sensitivity] !== undefined
      ? SENSITIVITY_BIAS[sensitivity]
      : 0;
  const base = meanSeverity * 10 + bias;
  const spread = createRng(seed + '|probability').jitter(temperature * 12);
  return clamp(Math.round(base + spread), 0, 100);
}

/**
 * Confidence rises when the council agrees. Wide disagreement between experts,
 * or a high temperature, lowers it.
 */
export function deriveConfidence(
  severities: number[],
  temperature: number,
): number {
  if (severities.length === 0) {
    return 0;
  }
  const mean =
    severities.reduce((sum, value) => sum + value, 0) / severities.length;
  const variance =
    severities.reduce(
      (sum, value) => sum + (value - mean) * (value - mean),
      0,
    ) / severities.length;
  const spreadPenalty = Math.min(30, Math.sqrt(variance) * 8);
  const temperaturePenalty = temperature * 15;
  return clamp(Math.round(95 - spreadPenalty - temperaturePenalty), 0, 100);
}

/**
 * Factors are the council's own findings, not a fixed list. Each expert becomes
 * one factor weighted by its severity, so the stored record explains itself.
 */
export function deriveFactors(opinions: ExpertOpinion[]): PredictionFactor[] {
  return opinions
    .slice()
    .sort((a, b) => b.severity - a.severity)
    .map(opinion => ({
      name:
        opinion.domain +
        (opinion.matchedTerms.length > 0
          ? ' (' + opinion.matchedTerms.slice(0, 2).join(', ') + ')'
          : ''),
      impact:
        opinion.severity > 5 ? ('negative' as const) : ('positive' as const),
      weight: clamp(Math.round(opinion.severity * 10), 0, 100),
    }));
}

function buildProviderPrompt(
  scenario: string,
  opinions: ExpertOpinion[],
): string {
  const findings = opinions
    .map(
      opinion =>
        '- ' +
        opinion.expertName +
        ' (' +
        opinion.domain +
        ', severity ' +
        opinion.severity +
        '/10): ' +
        opinion.opinion,
    )
    .join('\n');

  return (
    'Scenario under assessment:\n' +
    scenario +
    '\n\n' +
    'Council findings:\n' +
    findings +
    '\n\n' +
    'Write a short executive summary (under 150 words) of the combined risk picture. ' +
    'Identify the dominant vector and the single most useful mitigation. ' +
    'Do not invent findings that are not supported above.'
  );
}

class PredictionService {
  /**
   * Runs a full assessment. A provider failure degrades the result to the local
   * council output rather than failing the whole analysis.
   */
  async analyzeScenario(request: AnalyzeRequest): Promise<AnalyzeOutcome> {
    const scenario = (request.scenario || '').trim();
    if (scenario.length === 0) {
      throw new Error('Enter a scenario before running an assessment.');
    }

    const settings = storageService.getSettings();
    const analysis = await globalRiskService.analyzeGlobalRisk(
      scenario,
      request.expertIds || [],
      {
        temperature: settings.temperature,
        paced: settings.analysisSpeed === 'Cinematic',
        onProgress: request.onProgress,
        signal: request.signal,
      },
    );

    const severities = analysis.expertOpinions.map(opinion => opinion.severity);
    const meanSeverity =
      severities.reduce((sum, value) => sum + value, 0) / severities.length;
    const seed =
      scenario +
      '|' +
      (request.expertIds || []).join(',') +
      '|' +
      settings.riskSensitivity;

    let narrative: string | null = null;
    let providerError: string | null = null;

    if (settings.aiProvider !== 'Local') {
      const augmentation = await aiService.summarize({
        provider: settings.aiProvider,
        model: settings.model,
        prompt: buildProviderPrompt(scenario, analysis.expertOpinions),
      });
      narrative = augmentation.text;
      providerError = augmentation.error;
      if (narrative && request.onProgress) {
        request.onProgress(
          '[PROVIDER] Narrative synthesised by ' + augmentation.model + '.',
        );
      } else if (providerError && request.onProgress) {
        request.onProgress('[PROVIDER] Unavailable: ' + providerError);
      }
    }

    const result: PredictionResult = {
      id: createId(seed),
      scenario,
      probability: deriveProbability(
        meanSeverity,
        settings.riskSensitivity,
        settings.temperature,
        seed,
      ),
      confidence: deriveConfidence(severities, settings.temperature),
      factors: deriveFactors(analysis.expertOpinions),
      timestamp: new Date(),
      status: 'Verified',
      type: 'Geopolitical',
      defconLevel: analysis.defconLevel as DefconLevel,
      expertConsensus: analysis.expertConsensus,
      activeThreats: analysis.activeThreats,
      narrative,
    };

    return {
      result,
      roundTableLog: analysis.roundTableLog,
      expertOpinions: analysis.expertOpinions,
      providerError,
    };
  }

  // --- Guided scenario builder ---------------------------------------------
  // These back the parameter-driven screens in src/screens. They were called
  // there long before they existed; the model is in lib/scenarioScoring.ts.

  /** Success probability for a parameter-driven scenario, 0-100. */
  async calculateProbability(
    params: Partial<ScenarioParameters>,
  ): Promise<number> {
    return calculateProbability(params);
  }

  /** The contributing terms behind that probability, largest first. */
  async analyzeFactors(
    scenario:
      | {parameters?: Record<string, unknown>}
      | Partial<ScenarioParameters>,
  ): Promise<ScenarioFactor[]> {
    const source =
      scenario &&
      typeof scenario === 'object' &&
      'parameters' in scenario &&
      scenario.parameters
        ? (scenario.parameters as Partial<ScenarioParameters>)
        : (scenario as Partial<ScenarioParameters>);
    return analyzeFactors(source || {});
  }

  /**
   * Daily probability series drawn from the stored audit log. Days with no
   * assessment are omitted rather than interpolated, so the chart never implies
   * data that was not recorded.
   */
  async getHistoricalData(
    category: string = 'general',
    days: number = 7,
  ): Promise<{date: string; probability: number}[]> {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
    const wanted = String(category || 'general').toLowerCase();
    const matchesAll = wanted === 'general' || wanted === 'all';

    const buckets = new Map<string, {total: number; count: number}>();

    for (const record of storageService.getHistory()) {
      const time = new Date(record.timestamp).getTime();
      if (!Number.isFinite(time) || time < cutoff) {
        continue;
      }
      if (!matchesAll && String(record.type).toLowerCase() !== wanted) {
        continue;
      }

      const day = new Date(time).toISOString().slice(0, 10);
      const bucket = buckets.get(day) || {total: 0, count: 0};
      bucket.total += record.probability;
      bucket.count += 1;
      buckets.set(day, bucket);
    }

    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, bucket]) => ({
        date,
        probability: Math.round(bucket.total / bucket.count),
      }));
  }
}

/**
 * Identifiers are unique, not reproducible — two assessments of the same
 * scenario are distinct records even though they score identically. The clock
 * alone collided when two were saved inside the same millisecond, which the
 * Instant analysis speed makes reachable, so a random suffix is mixed in.
 */
function createId(seed: string): string {
  const suffix = createRng(seed + '|' + Math.random())
    .int(0, 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return Date.now().toString(36) + '-' + suffix;
}

export const predictionService = new PredictionService();
