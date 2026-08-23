// src/services/GlobalRiskService.ts
// The Round Table: routes a scenario to a council of experts, scores it in each
// domain, and synthesises a DEFCON level.
//
// Scoring is deterministic for a given (scenario, council, temperature) triple.
// Temperature widens the spread of the seeded variation; it does not reach for
// Math.random(), so an assessment in the audit log can always be re-derived.

import {
  expertVectorService,
  ExpertDefinition,
  ExpertMatch,
} from './ExpertVectorService';
import {generateSystemPrompt} from '../data/SystemPrompts';
import {createRng} from '../lib/rng';
import {tokenize, vectorize} from '../lib/vector';

export type DefconLevel = 1 | 2 | 3 | 4 | 5;

export interface ExpertOpinion {
  expertId: string;
  expertName: string;
  domain: string;
  opinion: string;
  /** 0-10. */
  severity: number;
  /** Cosine relevance of the scenario to this expert's domain, 0-1. */
  relevance: number;
  /** Focus terms actually found in the scenario. */
  matchedTerms: string[];
}

export interface RiskAnalysisResult {
  defconLevel: DefconLevel;
  globalThreatScore: number;
  expertConsensus: string;
  activeThreats: string[];
  expertOpinions: ExpertOpinion[];
  roundTableLog: string[];
  /** Set when the assessment was augmented by a live model call. */
  narrative: string | null;
}

export interface AnalyzeOptions {
  /** 0-1. Higher widens the seeded spread around the deterministic base. */
  temperature?: number;
  /** Cinematic paces the round table for the UI; Instant skips the delays. */
  paced?: boolean;
  /** Called as each log line is produced, for live round-table display. */
  onProgress?: (line: string) => void;
  /** Aborts the pacing delays when the user navigates away. */
  signal?: AbortSignal;
}

const PHASE_DELAY_MS = 600;
const CROSS_EXAM_DELAY_MS = 800;
const HIGH_SEVERITY = 7;
const NOTABLE_SEVERITY = 5;

/** Resolves after `ms`, or immediately if the signal is already aborted. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!ms || (signal && signal.aborted)) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', finish);
      }
      resolve();
    }
    if (signal) {
      signal.addEventListener('abort', finish, {once: true});
    }
  });
}

class GlobalRiskService {
  public async analyzeGlobalRisk(
    inputScenario: string,
    selectedExpertIds: string[] = [],
    options: AnalyzeOptions = {},
  ): Promise<RiskAnalysisResult> {
    const scenario = (inputScenario || '').trim();
    if (scenario.length === 0) {
      throw new Error('A scenario is required to run an assessment.');
    }

    const temperature = clamp01(
      options.temperature === undefined ? 0.7 : options.temperature,
    );
    const paced = options.paced !== false;
    const roundTableLog: string[] = [];

    const log = (line: string) => {
      roundTableLog.push(line);
      if (options.onProgress) {
        options.onProgress(line);
      }
    };

    const activeExperts = this.resolveCouncil(scenario, selectedExpertIds);
    if (activeExperts.length === 0) {
      throw new Error('No experts are available for this assessment.');
    }

    const scores = expertVectorService.scoreExperts(scenario);
    const relevanceById = new Map(
      scores.map((match: ExpertMatch) => [match.expert.id, match.score]),
    );
    const scenarioTerms = vectorize(tokenize(scenario));

    // PHASE 1 — isolated analysis
    log(
      '[SYSTEM] Initializing attention masks for ' +
        activeExperts.length +
        ' nodes.',
    );

    const expertOpinions: ExpertOpinion[] = [];
    for (const expert of activeExperts) {
      if (options.signal && options.signal.aborted) {
        throw new DOMException('Assessment cancelled', 'AbortError');
      }
      await delay(paced ? PHASE_DELAY_MS : 0, options.signal);

      const relevance = relevanceById.get(expert.id) || 0;
      const matchedTerms = expert.focusKeywords.filter(keyword =>
        tokenize(keyword).every(token => scenarioTerms.has(token)),
      );
      const severity = this.scoreSeverity(
        scenario,
        expert,
        relevance,
        temperature,
      );

      // Built for the record even when no model is called: it is what an
      // external provider would be sent, and it documents the mask applied.
      const systemPrompt = generateSystemPrompt(expert);

      expertOpinions.push({
        expertId: expert.id,
        expertName: expert.name,
        domain: expert.domain,
        opinion: this.generateOpinion(expert, severity, matchedTerms),
        severity,
        relevance,
        matchedTerms,
      });

      log(
        '[node:' +
          expert.id +
          '] Mask active (' +
          systemPrompt.length +
          'B). ' +
          'Relevance ' +
          relevance.toFixed(2) +
          ' | severity ' +
          severity +
          '/10.',
      );
    }

    // PHASE 2 — cross-examination
    const highSeverity = expertOpinions.filter(
      opinion => opinion.severity > HIGH_SEVERITY,
    );
    if (highSeverity.length > 0) {
      log(
        '[PROTOCOL] Cross-attention triggered on ' +
          highSeverity.length +
          ' high-severity flag(s).',
      );
      for (const threat of highSeverity) {
        await delay(paced ? CROSS_EXAM_DELAY_MS : 0, options.signal);
        log(
          '[BROADCAST] ' +
            threat.expertName +
            ': ' +
            truncate(threat.opinion, 72),
        );
        log(
          '[CONSENSUS] Council acknowledged the vector; probability weights adjusted.',
        );
      }
    } else {
      log('[PROTOCOL] No critical anomalies in phase 1. Standard synthesis.');
    }

    // PHASE 3 — synthesis
    const severities = expertOpinions.map(opinion => opinion.severity);
    const maxSeverity = Math.max(...severities);
    const avgSeverity =
      severities.reduce((sum, value) => sum + value, 0) / severities.length;
    const defconLevel = this.calculateDefcon(maxSeverity, avgSeverity);

    log(
      '[SYNTHESIS] DEFCON ' +
        defconLevel +
        ' | mean severity ' +
        avgSeverity.toFixed(2) +
        '.',
    );

    return {
      defconLevel,
      globalThreatScore: Math.round(avgSeverity * 10),
      expertConsensus: this.generateConsensusSummary(
        expertOpinions,
        defconLevel,
      ),
      activeThreats: expertOpinions
        .filter(opinion => opinion.severity > NOTABLE_SEVERITY)
        .map(
          opinion => opinion.expertName + ': ' + firstSentence(opinion.opinion),
        ),
      expertOpinions,
      roundTableLog,
      narrative: null,
    };
  }

  private resolveCouncil(
    scenario: string,
    selectedExpertIds: string[],
  ): ExpertDefinition[] {
    if (selectedExpertIds.length === 0) {
      return expertVectorService.selectCouncil(scenario);
    }
    return selectedExpertIds
      .map(id => expertVectorService.getExpertById(id))
      .filter((expert): expert is ExpertDefinition => expert !== null);
  }

  /**
   * Severity is a deterministic function of how strongly the scenario lands in
   * the expert's domain, plus a seeded spread controlled by temperature. The
   * seed binds the scenario, the expert, and the temperature together, so the
   * same three inputs always produce the same number.
   */
  private scoreSeverity(
    scenario: string,
    expert: ExpertDefinition,
    relevance: number,
    temperature: number,
  ): number {
    const rng = createRng(
      scenario + '|' + expert.id + '|' + temperature.toFixed(2),
    );

    // A scenario squarely in an expert's domain lands around 8-9; an unrelated
    // one sits near the 1-3 baseline.
    const base = 1.5 + relevance * 8.5;
    const spread = rng.jitter(1 + temperature * 3);

    return clamp(Math.round(base + spread), 1, 10);
  }

  private generateOpinion(
    expert: ExpertDefinition,
    severity: number,
    matchedTerms: string[],
  ): string {
    const focus =
      matchedTerms.length > 0 ? matchedTerms.slice(0, 2).join(' / ') : null;

    if (severity > HIGH_SEVERITY) {
      const critical: Record<string, string> = {
        Geopolitical:
          'Immediate escalation probable. Recommend diplomatic isolation and escalation controls.',
        Cyber:
          'Active breach signature. Treat infrastructure integrity as compromised until proven otherwise.',
        'Bio-Security':
          'Pathogen vector confirmed. R0 estimates exceed containment thresholds.',
        'AI Safety':
          'Recursive self-improvement indicators present. Alignment guarantees cannot be assumed.',
        Orbital:
          'Kessler-class cascade risk in LEO. Expect telemetry loss on key assets.',
        Quantum:
          'Q-Day threshold assumptions no longer hold. Treat classical encryption as transitional.',
      };
      const headline =
        critical[expert.domain] || 'Critical anomaly detected in domain.';
      return focus ? headline + ' Triggered on: ' + focus + '.' : headline;
    }

    if (severity > NOTABLE_SEVERITY) {
      return (
        'Elevated ' +
        expert.domain +
        ' activity' +
        (focus ? ' around ' + focus : '') +
        '. Monitoring for crossover into adjacent domains.'
      );
    }

    return (
      'Monitoring ' +
      expert.domain +
      ' vectors' +
      (focus ? ' (' + focus + ')' : '') +
      '. No immediate crossover event detected.'
    );
  }

  private calculateDefcon(
    maxSeverity: number,
    avgSeverity: number,
  ): DefconLevel {
    if (maxSeverity >= 9 && avgSeverity > 6) {
      return 1;
    }
    if (maxSeverity >= 8) {
      return 2;
    }
    if (maxSeverity >= 6 || avgSeverity > 5) {
      return 3;
    }
    if (avgSeverity > 3) {
      return 4;
    }
    return 5;
  }

  private generateConsensusSummary(
    opinions: ExpertOpinion[],
    defcon: DefconLevel,
  ): string {
    const criticalCount = opinions.filter(
      opinion => opinion.severity > HIGH_SEVERITY,
    ).length;
    const lead = opinions.reduce((highest, opinion) =>
      opinion.severity > highest.severity ? opinion : highest,
    );

    switch (defcon) {
      case 1:
        return (
          'MAXIMUM ALERT: ' +
          criticalCount +
          ' domain(s) reporting critical failure. Immediate response required.'
        );
      case 2:
        return (
          'SEVERE RISK: multiple vectors converging. ' +
          lead.expertName +
          ' leads the threat call.'
        );
      case 3:
        return (
          'ELEVATED: unstable indicators in ' +
          lead.domain +
          '. Readiness increased.'
        );
      case 4:
        return (
          'LOW: baseline monitoring with minor fluctuations in ' +
          lead.domain +
          '.'
        );
      default:
        return 'NORMAL: global stability nominal. No significant anomalies.';
    }
  }

  public getAvailableExperts(): ExpertDefinition[] {
    return expertVectorService.getAllExperts();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? clamp(value, 0, 1) : 0.7;
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit - 1) + '…';
}

function firstSentence(text: string): string {
  const index = text.indexOf('.');
  return index === -1 ? text : text.slice(0, index);
}

export const globalRiskService = new GlobalRiskService();
