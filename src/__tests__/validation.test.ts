import {
  sanitizeDeep,
  coercePredictionRecord,
  parseHistoryImport,
  coerceHistory,
  MAX_IMPORT_RECORDS,
} from '../lib/validation';

const validRecord = {
  id: 'rec-1',
  scenario: 'Grid firmware exploit traded openly',
  probability: 62,
  confidence: 80,
  factors: [{name: 'Cyber', impact: 'negative', weight: 90}],
  timestamp: '2026-08-01T10:00:00.000Z',
  status: 'Verified',
  type: 'Geopolitical',
  defconLevel: 2,
  expertConsensus: 'SEVERE RISK',
  activeThreats: ['Cyber: active breach signature'],
};

describe('sanitizeDeep', () => {
  it('drops prototype-reaching keys', () => {
    const hostile = JSON.parse('{"a":1,"__proto__":{"polluted":true}}');
    const clean = sanitizeDeep(hostile) as Record<string, unknown>;

    expect(clean.a).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(
      false,
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('returns a structure that shares no identity with the input', () => {
    const source = {nested: {value: 1}};
    const clean = sanitizeDeep(source) as {nested: {value: number}};

    expect(clean).toEqual(source);
    expect(clean.nested).not.toBe(source.nested);
  });

  it('replaces non-finite numbers with null', () => {
    expect(sanitizeDeep(Number.NaN)).toBeNull();
    expect(sanitizeDeep(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('stops runaway nesting', () => {
    let deep: unknown = 'leaf';
    for (let i = 0; i < 200; i++) {
      deep = {next: deep};
    }
    expect(() => sanitizeDeep(deep)).not.toThrow();
  });
});

describe('coercePredictionRecord', () => {
  it('accepts a well-formed record', () => {
    const record = coercePredictionRecord(validRecord);
    expect(record).not.toBeNull();
    expect(record!.id).toBe('rec-1');
    expect(record!.defconLevel).toBe(2);
    expect(record!.timestamp instanceof Date).toBe(true);
  });

  it('rejects records with no id or no usable timestamp', () => {
    expect(coercePredictionRecord({...validRecord, id: undefined})).toBeNull();
    expect(
      coercePredictionRecord({...validRecord, timestamp: 'not-a-date'}),
    ).toBeNull();
  });

  it('rejects non-objects outright', () => {
    expect(coercePredictionRecord(null)).toBeNull();
    expect(coercePredictionRecord('a string')).toBeNull();
    expect(coercePredictionRecord([validRecord])).toBeNull();
  });

  it('clamps out-of-range numbers rather than trusting them', () => {
    const record = coercePredictionRecord({
      ...validRecord,
      probability: 5000,
      confidence: -20,
      defconLevel: 99,
    });

    expect(record!.probability).toBe(100);
    expect(record!.confidence).toBe(0);
    expect(record!.defconLevel).toBe(5);
  });

  it('drops factors that are not shaped like factors', () => {
    const record = coercePredictionRecord({
      ...validRecord,
      factors: [{name: 'Cyber', weight: 10}, {weight: 10}, null, 'nope'],
    });
    expect(record!.factors).toHaveLength(1);
    expect(record!.factors[0].name).toBe('Cyber');
  });

  it('falls back to a safe status and type for unknown values', () => {
    const record = coercePredictionRecord({
      ...validRecord,
      status: 'Hacked',
      type: 'Alien',
    });
    expect(record!.status).toBe('Verified');
    expect(record!.type).toBe('Strategy');
  });
});

describe('parseHistoryImport', () => {
  it('imports a valid array', () => {
    const outcome = parseHistoryImport(JSON.stringify([validRecord]));
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toHaveLength(1);
    expect(outcome.skipped).toBe(0);
  });

  it('reports how many records it had to skip', () => {
    const outcome = parseHistoryImport(
      JSON.stringify([validRecord, {junk: true}, 42]),
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toHaveLength(1);
    expect(outcome.skipped).toBe(2);
  });

  it('rejects malformed JSON with a message worth showing', () => {
    const outcome = parseHistoryImport('{not json');
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/valid JSON/i);
  });

  it('rejects an empty file', () => {
    expect(parseHistoryImport('   ').ok).toBe(false);
  });

  it('rejects a payload that is not an array', () => {
    const outcome = parseHistoryImport(JSON.stringify({records: []}));
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/array/i);
  });

  it('rejects a file whose records are all unusable', () => {
    const outcome = parseHistoryImport(JSON.stringify([{junk: true}]));
    expect(outcome.ok).toBe(false);
    expect(outcome.skipped).toBe(1);
  });

  it('accepts an explicitly empty history', () => {
    const outcome = parseHistoryImport('[]');
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toEqual([]);
  });

  it('refuses a record count above the cap', () => {
    const oversized = JSON.stringify(
      new Array(MAX_IMPORT_RECORDS + 1).fill(validRecord),
    );
    const outcome = parseHistoryImport(oversized);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/records/i);
  });

  it('does not pollute Object.prototype from an imported payload', () => {
    parseHistoryImport('[{"id":"x","timestamp":0,"__proto__":{"pwned":true}}]');
    expect(({} as Record<string, unknown>).pwned).toBeUndefined();
  });
});

describe('coerceHistory', () => {
  it('returns an empty list for anything that is not an array', () => {
    expect(coerceHistory(null)).toEqual([]);
    expect(coerceHistory({})).toEqual([]);
  });

  it('keeps only the records that validate', () => {
    expect(coerceHistory([validRecord, 'junk'])).toHaveLength(1);
  });
});
