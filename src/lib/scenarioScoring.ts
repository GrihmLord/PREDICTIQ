// src/lib/scenarioScoring.ts
// Parameter-driven scenario scoring for the guided scenario builder.
//
// The builder screens have always called predictionService.calculateProbability
// and .analyzeFactors, but neither method existed, so those screens threw as
// soon as they were reached. This is the model behind them: an explicit,
// documented weighting over the four parameters the form collects.

export interface ScenarioParameters {
  /** Subjective confidence in the plan, 0-100. */
  confidence: number;
  /** Assessed downside risk, 0-100. Higher is worse. */
  risk: number;
  /** Relevant experience in years, 0-50. */
  experience: number;
  /** Whether preparation work has been completed. */
  preparation: boolean;
}

export interface ScenarioFactor {
  factor: string;
  /** Magnitude of the contribution in probability points, 0-100. */
  impact: number;
  direction: 'positive' | 'negative';
}

/** Neutral starting point before any parameter is applied. */
const BASELINE = 50;

/** Experience stops adding signal past this many years. */
const EXPERIENCE_CEILING_YEARS = 20;

const WEIGHTS = {
  confidence: 0.35,
  risk: 0.3,
  experienceRange: 20,
  experienceFloor: -5,
  preparation: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalise(
  params: Partial<ScenarioParameters> | null | undefined,
): ScenarioParameters {
  const input = params || {};
  return {
    confidence: clamp(Number(input.confidence) || 0, 0, 100),
    risk: clamp(Number(input.risk) || 0, 0, 100),
    experience: clamp(Number(input.experience) || 0, 0, 50),
    preparation: input.preparation === true,
  };
}

/** Confidence pulls away from the baseline in either direction. */
function confidenceTerm(params: ScenarioParameters): number {
  return (params.confidence - BASELINE) * WEIGHTS.confidence;
}

/** Risk is inverted: high assessed risk lowers the success probability. */
function riskTerm(params: ScenarioParameters): number {
  return -(params.risk - BASELINE) * WEIGHTS.risk;
}

/**
 * Experience saturates. The first few years matter a great deal and the
 * twentieth adds nothing, which is why this is capped rather than linear.
 */
function experienceTerm(params: ScenarioParameters): number {
  const saturated =
    Math.min(params.experience, EXPERIENCE_CEILING_YEARS) /
    EXPERIENCE_CEILING_YEARS;
  return saturated * WEIGHTS.experienceRange + WEIGHTS.experienceFloor;
}

function preparationTerm(params: ScenarioParameters): number {
  return params.preparation ? WEIGHTS.preparation : -WEIGHTS.preparation;
}

/** Success probability in [0, 100]. Deterministic: same inputs, same output. */
export function calculateProbability(
  params: Partial<ScenarioParameters>,
): number {
  const normalised = normalise(params);
  const total =
    BASELINE +
    confidenceTerm(normalised) +
    riskTerm(normalised) +
    experienceTerm(normalised) +
    preparationTerm(normalised);

  return clamp(Math.round(total), 0, 100);
}

/**
 * Breaks the score into its contributing terms, so the results screen can show
 * why a scenario scored the way it did rather than only what it scored.
 */
export function analyzeFactors(
  params: Partial<ScenarioParameters>,
): ScenarioFactor[] {
  const normalised = normalise(params);

  const terms: {factor: string; value: number}[] = [
    {factor: 'Stated confidence', value: confidenceTerm(normalised)},
    {factor: 'Assessed risk exposure', value: riskTerm(normalised)},
    {factor: 'Relevant experience', value: experienceTerm(normalised)},
    {
      factor: normalised.preparation
        ? 'Preparation completed'
        : 'Preparation incomplete',
      value: preparationTerm(normalised),
    },
  ];

  return terms
    .map(term => ({
      factor: term.factor,
      impact: Math.round(Math.abs(term.value)),
      direction:
        term.value >= 0 ? ('positive' as const) : ('negative' as const),
    }))
    .filter(factor => factor.impact > 0)
    .sort((a, b) => b.impact - a.impact);
}
