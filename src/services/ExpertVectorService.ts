// src/services/ExpertVectorService.ts
// Routes a scenario to the experts whose domain actually matches it.

import {RiskDomain} from '../types/RiskTypes';
import {
  SparseVector,
  buildProfileVector,
  cosineSimilarity,
  tokenize,
  vectorize,
} from '../lib/vector';

export interface ExpertDefinition {
  id: string;
  name: string;
  domain: RiskDomain;
  /** Terms that pull the expert toward a scenario. */
  focusKeywords: string[];
  /** Terms the expert explicitly does not cover; they push the score down. */
  blindSpots: string[];
}

export interface ExpertMatch {
  expert: ExpertDefinition;
  /** Cosine similarity after the blind-spot penalty, clamped to [0, 1]. */
  score: number;
}

const EXPERTS: ExpertDefinition[] = [
  {
    id: 'exp_geo_2026',
    name: 'Geopolitical Strategist',
    domain: 'Geopolitical',
    focusKeywords: [
      'border',
      'treaty',
      'sanction',
      'election',
      'proxy',
      'sovereignty',
      'territory',
      'diplomacy',
      'alliance',
      'embargo',
      'annexation',
    ],
    blindSpots: [
      'server logs',
      'code',
      'encryption',
      'stock prices',
      'latency',
    ],
  },
  {
    id: 'exp_cyber_8200',
    name: 'Unit 8200 Cyber Analyst',
    domain: 'Cyber',
    focusKeywords: [
      'exploit',
      'zero-day',
      'grid',
      'latency',
      'apt',
      'ddos',
      'ransomware',
      'backdoor',
      'infrastructure',
      'intrusion',
      'malware',
      'breach',
    ],
    blindSpots: [
      'cultural sentiment',
      'stock prices',
      'polling',
      'trade tariffs',
    ],
  },
  {
    id: 'exp_bio_shield',
    name: 'Synthetic Bio-Shield',
    domain: 'Bio-Security',
    focusKeywords: [
      'crispr',
      'gain-of-function',
      'genomic',
      'pathogen',
      'r0',
      'transmission',
      'zoonotic',
      'outbreak',
      'vaccine',
      'quarantine',
      'biosafety',
    ],
    blindSpots: [
      'political polling',
      'trade tariffs',
      'interest rates',
      'missile',
    ],
  },
  {
    id: 'exp_ai_sentinel',
    name: 'AI Alignment Sentinel',
    domain: 'AI Safety',
    focusKeywords: [
      'recursive',
      'containment',
      'alignment',
      'weights',
      'agi',
      'asi',
      'singularity',
      'hallucination',
      'reward-hacking',
      'autonomy',
      'inference',
    ],
    blindSpots: ['human resources', 'tax policy', 'supply chain', 'weather'],
  },
  {
    id: 'exp_orbital',
    name: 'Orbital Defense Command',
    domain: 'Orbital',
    focusKeywords: [
      'kessler',
      'asat',
      'debris',
      'telemetry',
      'leo',
      'geo',
      'satellite',
      'collision',
      'launch',
      'constellation',
      'downlink',
    ],
    blindSpots: ['ground infantry', 'viral trends', 'submarines', 'currency'],
  },
  {
    id: 'exp_quantum',
    name: 'Quantum Cryptanalyst',
    domain: 'Quantum',
    focusKeywords: [
      'q-day',
      'lattice',
      'decryption',
      'entropy',
      'qubit',
      'superposition',
      'shor',
      'encryption',
      'post-quantum',
      'keypair',
    ],
    blindSpots: ['conventional ballistics', 'biological agents', 'propaganda'],
  },
];

/** Similarity below this is treated as no match at all. */
export const DEFAULT_MATCH_THRESHOLD = 0.05;

/** How much a blind-spot hit subtracts from the similarity score. */
const BLIND_SPOT_PENALTY = 0.15;

interface ExpertProfile {
  definition: ExpertDefinition;
  focusVector: SparseVector;
  blindSpotTerms: Set<string>;
}

export class ExpertVectorService {
  private profiles: ExpertProfile[];

  constructor(definitions: ExpertDefinition[] = EXPERTS) {
    this.profiles = definitions.map(definition => ({
      definition,
      focusVector: buildProfileVector(definition.focusKeywords),
      blindSpotTerms: new Set(
        definition.blindSpots.reduce<string[]>(
          (terms, phrase) => terms.concat(tokenize(phrase)),
          [],
        ),
      ),
    }));
  }

  /**
   * Scores every expert against the scenario by cosine similarity, then
   * subtracts a penalty for each blind-spot term present. Returns all experts,
   * ranked, so callers can decide how many to take.
   */
  public scoreExperts(inputText: string): ExpertMatch[] {
    const queryVector = vectorize(tokenize(inputText));

    return this.profiles
      .map(profile => {
        const similarity = cosineSimilarity(queryVector, profile.focusVector);

        let penalty = 0;
        profile.blindSpotTerms.forEach(term => {
          if (queryVector.has(term)) {
            penalty += BLIND_SPOT_PENALTY;
          }
        });

        return {
          expert: profile.definition,
          score: Math.min(1, Math.max(0, similarity - penalty)),
        };
      })
      .sort(
        (a, b) => b.score - a.score || a.expert.id.localeCompare(b.expert.id),
      );
  }

  public findRelevantExperts(
    inputText: string,
    threshold: number = DEFAULT_MATCH_THRESHOLD,
  ): ExpertDefinition[] {
    return this.scoreExperts(inputText)
      .filter(match => match.score > threshold)
      .map(match => match.expert);
  }

  /**
   * Picks a council of at least `minimum` experts. Genuine matches come first;
   * if the scenario is too vague to match anyone, the highest-ranked remainder
   * fills the quorum deterministically rather than at random.
   */
  public selectCouncil(
    inputText: string,
    minimum = 3,
    maximum = 5,
    threshold: number = DEFAULT_MATCH_THRESHOLD,
  ): ExpertDefinition[] {
    const ranked = this.scoreExperts(inputText);
    const matched = ranked
      .filter(match => match.score > threshold)
      .map(match => match.expert);

    if (matched.length >= minimum) {
      return matched.slice(0, maximum);
    }

    const council = matched.slice();
    for (const match of ranked) {
      if (council.length >= minimum) {
        break;
      }
      if (!council.some(expert => expert.id === match.expert.id)) {
        council.push(match.expert);
      }
    }
    return council;
  }

  public getAllExperts(): ExpertDefinition[] {
    return this.profiles.map(profile => profile.definition);
  }

  public getExpertById(id: string): ExpertDefinition | null {
    const profile = this.profiles.find(entry => entry.definition.id === id);
    return profile ? profile.definition : null;
  }
}

export const expertVectorService = new ExpertVectorService();
