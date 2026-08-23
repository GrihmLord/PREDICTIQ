import {createRng, hashSeed} from '../lib/rng';
import {
  tokenize,
  vectorize,
  cosineSimilarity,
  buildProfileVector,
} from '../lib/vector';
import {ExpertVectorService} from '../services/ExpertVectorService';
import {globalRiskService} from '../services/GlobalRiskService';
import {
  deriveProbability,
  deriveConfidence,
  deriveFactors,
} from '../services/predictionService';
import {calculateProbability, analyzeFactors} from '../lib/scenarioScoring';

describe('rng', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRng('scenario|expert|0.70');
    const b = createRng('scenario|expert|0.70');
    const drawA = [a.next(), a.next(), a.next()];
    const drawB = [b.next(), b.next(), b.next()];
    expect(drawA).toEqual(drawB);
  });

  it('produces different streams for different seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });

  it('stays inside its declared ranges', () => {
    const rng = createRng('range-check');
    for (let i = 0; i < 500; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);

      const int = rng.int(3, 7);
      expect(int).toBeGreaterThanOrEqual(3);
      expect(int).toBeLessThanOrEqual(7);

      expect(Math.abs(rng.jitter(2))).toBeLessThanOrEqual(2);
    }
  });

  it('hashes to an unsigned 32-bit seed', () => {
    const seed = hashSeed('anything at all');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('vector', () => {
  it('drops stop words and single characters', () => {
    expect(tokenize('The exploit is in the grid')).toEqual(['exploit', 'grid']);
  });

  it('keeps hyphenated domain terms intact', () => {
    expect(tokenize('a zero-day and gain-of-function risk')).toEqual([
      'zero-day',
      'gain-of-function',
      'risk',
    ]);
  });

  it('counts repeated terms', () => {
    expect(vectorize(tokenize('grid grid exploit')).get('grid')).toBe(2);
  });

  it('scores an identical document at 1 and a disjoint one at 0', () => {
    const a = vectorize(tokenize('satellite collision debris'));
    const b = vectorize(tokenize('satellite collision debris'));
    const c = vectorize(tokenize('vaccine outbreak pathogen'));

    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
    expect(cosineSimilarity(a, c)).toBe(0);
  });

  it('is symmetric', () => {
    const a = vectorize(tokenize('exploit grid ransomware'));
    const b = buildProfileVector(['exploit', 'grid']);
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  it('returns zero for an empty document', () => {
    expect(
      cosineSimilarity(vectorize([]), buildProfileVector(['exploit'])),
    ).toBe(0);
  });
});

describe('ExpertVectorService', () => {
  const service = new ExpertVectorService();

  it('routes a cyber scenario to the cyber analyst', () => {
    const ranked = service.scoreExperts(
      'A zero-day exploit against grid SCADA firmware enabled a ransomware intrusion.',
    );
    expect(ranked[0].expert.domain).toBe('Cyber');
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('routes a biological scenario to the bio expert', () => {
    const ranked = service.scoreExperts(
      'A zoonotic pathogen outbreak with rising transmission is straining quarantine capacity.',
    );
    expect(ranked[0].expert.domain).toBe('Bio-Security');
  });

  it('penalises experts whose blind spots are named in the scenario', () => {
    const withoutBlindSpot = service.scoreExperts(
      'satellite collision debris in leo',
    );
    const withBlindSpot = service.scoreExperts(
      'satellite collision debris in leo and currency markets',
    );

    const orbitalBefore = withoutBlindSpot.find(
      m => m.expert.domain === 'Orbital',
    )!.score;
    const orbitalAfter = withBlindSpot.find(
      m => m.expert.domain === 'Orbital',
    )!.score;
    expect(orbitalAfter).toBeLessThan(orbitalBefore);
  });

  it('ranks deterministically for the same input', () => {
    const first = service
      .scoreExperts('border treaty sanction')
      .map(m => m.expert.id);
    const second = service
      .scoreExperts('border treaty sanction')
      .map(m => m.expert.id);
    expect(first).toEqual(second);
  });

  it('fills a quorum even when nothing matches', () => {
    const council = service.selectCouncil('lorem ipsum dolor sit amet', 3, 5);
    expect(council).toHaveLength(3);
    expect(new Set(council.map(e => e.id)).size).toBe(3);
  });

  it('caps the council at the requested maximum', () => {
    const council = service.selectCouncil(
      'exploit grid pathogen outbreak satellite debris qubit lattice border treaty alignment agi',
      3,
      5,
    );
    expect(council.length).toBeLessThanOrEqual(5);
  });

  it('looks experts up by id and reports unknown ids as null', () => {
    expect(service.getExpertById('exp_cyber_8200')).not.toBeNull();
    expect(service.getExpertById('nope')).toBeNull();
  });
});

describe('globalRiskService', () => {
  const scenario =
    'A zero-day exploit against grid SCADA firmware is being traded openly.';
  const council = ['exp_cyber_8200', 'exp_geo_2026', 'exp_quantum'];

  it('rejects an empty scenario', async () => {
    await expect(
      globalRiskService.analyzeGlobalRisk('   ', council),
    ).rejects.toThrow(/scenario/i);
  });

  it('produces the same assessment for the same inputs', async () => {
    const [first, second] = await Promise.all([
      globalRiskService.analyzeGlobalRisk(scenario, council, {
        paced: false,
        temperature: 0.7,
      }),
      globalRiskService.analyzeGlobalRisk(scenario, council, {
        paced: false,
        temperature: 0.7,
      }),
    ]);

    expect(first.defconLevel).toBe(second.defconLevel);
    expect(first.globalThreatScore).toBe(second.globalThreatScore);
    expect(first.expertOpinions.map(o => o.severity)).toEqual(
      second.expertOpinions.map(o => o.severity),
    );
  });

  it('keeps severities inside 1-10 and DEFCON inside 1-5', async () => {
    const result = await globalRiskService.analyzeGlobalRisk(
      scenario,
      council,
      {
        paced: false,
        temperature: 1,
      },
    );

    expect(result.defconLevel).toBeGreaterThanOrEqual(1);
    expect(result.defconLevel).toBeLessThanOrEqual(5);
    for (const opinion of result.expertOpinions) {
      expect(opinion.severity).toBeGreaterThanOrEqual(1);
      expect(opinion.severity).toBeLessThanOrEqual(10);
    }
  });

  it('rates an on-domain expert above an off-domain one', async () => {
    const result = await globalRiskService.analyzeGlobalRisk(
      scenario,
      council,
      {paced: false},
    );
    const cyber = result.expertOpinions.find(o => o.domain === 'Cyber')!;
    const quantum = result.expertOpinions.find(o => o.domain === 'Quantum')!;
    expect(cyber.relevance).toBeGreaterThan(quantum.relevance);
  });

  it('streams progress lines in the same order as the transcript', async () => {
    const seen: string[] = [];
    const result = await globalRiskService.analyzeGlobalRisk(
      scenario,
      council,
      {
        paced: false,
        onProgress: line => seen.push(line),
      },
    );
    expect(seen).toEqual(result.roundTableLog);
  });

  it('routes automatically when no council is supplied', async () => {
    const result = await globalRiskService.analyzeGlobalRisk(scenario, [], {
      paced: false,
    });
    expect(result.expertOpinions.length).toBeGreaterThanOrEqual(3);
  });

  it('honours an abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      globalRiskService.analyzeGlobalRisk(scenario, council, {
        paced: true,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });
});

describe('prediction derivations', () => {
  it('lowers probability as mean severity rises', () => {
    const low = deriveProbability(2, 'Balanced', 0, 'seed');
    const high = deriveProbability(9, 'Balanced', 0, 'seed');
    expect(high).toBeGreaterThan(low);
  });

  it('shifts with sensitivity', () => {
    const conservative = deriveProbability(5, 'Conservative', 0, 'seed');
    const aggressive = deriveProbability(5, 'Aggressive', 0, 'seed');
    expect(aggressive).toBeGreaterThan(conservative);
  });

  it('stays within 0-100', () => {
    expect(deriveProbability(10, 'Aggressive', 1, 'seed')).toBeLessThanOrEqual(
      100,
    );
    expect(
      deriveProbability(0, 'Conservative', 1, 'seed'),
    ).toBeGreaterThanOrEqual(0);
  });

  it('reports lower confidence when the council disagrees', () => {
    const agreeing = deriveConfidence([7, 7, 7], 0);
    const split = deriveConfidence([1, 5, 10], 0);
    expect(agreeing).toBeGreaterThan(split);
  });

  it('reports lower confidence at higher temperature', () => {
    expect(deriveConfidence([5, 5, 5], 0)).toBeGreaterThan(
      deriveConfidence([5, 5, 5], 1),
    );
  });

  it('builds factors from the council rather than a fixed list', () => {
    const factors = deriveFactors([
      {
        expertId: 'a',
        expertName: 'A',
        domain: 'Cyber',
        opinion: '',
        severity: 9,
        relevance: 0.8,
        matchedTerms: ['exploit'],
      },
      {
        expertId: 'b',
        expertName: 'B',
        domain: 'Orbital',
        opinion: '',
        severity: 2,
        relevance: 0.1,
        matchedTerms: [],
      },
    ]);

    expect(factors[0].name).toContain('Cyber');
    expect(factors[0].impact).toBe('negative');
    expect(factors[1].impact).toBe('positive');
    expect(factors[0].weight).toBeGreaterThan(factors[1].weight);
  });
});

describe('scenarioScoring', () => {
  const base = {confidence: 50, risk: 30, experience: 5, preparation: true};

  it('is deterministic', () => {
    expect(calculateProbability(base)).toBe(calculateProbability(base));
  });

  it('rises with confidence and falls with risk', () => {
    expect(calculateProbability({...base, confidence: 90})).toBeGreaterThan(
      calculateProbability(base),
    );
    expect(calculateProbability({...base, risk: 90})).toBeLessThan(
      calculateProbability(base),
    );
  });

  it('rewards preparation', () => {
    expect(calculateProbability({...base, preparation: false})).toBeLessThan(
      calculateProbability(base),
    );
  });

  it('saturates experience past the ceiling', () => {
    expect(calculateProbability({...base, experience: 20})).toBe(
      calculateProbability({...base, experience: 45}),
    );
  });

  it('clamps to 0-100 at the extremes', () => {
    expect(
      calculateProbability({
        confidence: 100,
        risk: 0,
        experience: 50,
        preparation: true,
      }),
    ).toBeLessThanOrEqual(100);
    expect(
      calculateProbability({
        confidence: 0,
        risk: 100,
        experience: 0,
        preparation: false,
      }),
    ).toBeGreaterThanOrEqual(0);
  });

  it('tolerates missing and non-numeric parameters', () => {
    expect(() => calculateProbability({})).not.toThrow();
    expect(
      calculateProbability({confidence: NaN as unknown as number}),
    ).toBeGreaterThanOrEqual(0);
  });

  it('explains the score with factors that sort by magnitude', () => {
    const factors = analyzeFactors({...base, confidence: 95, risk: 95});
    expect(factors.length).toBeGreaterThan(0);
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i - 1].impact).toBeGreaterThanOrEqual(factors[i].impact);
    }
    expect(factors.some(f => f.direction === 'negative')).toBe(true);
  });
});
