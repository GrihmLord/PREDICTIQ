import {
  parseArticle,
  parseGeoFeatures,
  cleanHeadline,
  classifyCategory,
  classifySeverity,
  stableId,
} from '../services/FeedService';
import {Emitter} from '../lib/emitter';

describe('cleanHeadline', () => {
  it('strips a trailing publisher suffix', () => {
    expect(cleanHeadline('Border talks collapse overnight - Reuters')).toBe(
      'Border talks collapse overnight',
    );
  });

  it('keeps a hyphenated phrase that is part of a short headline', () => {
    // The separator is only treated as a publisher suffix well into the string.
    expect(cleanHeadline('Q - Day')).toBe('Q - Day');
  });

  it('tolerates a missing title without throwing', () => {
    expect(cleanHeadline(undefined as unknown as string)).toBe('');
  });
});

describe('classification', () => {
  it.each([
    ['Ransomware group breaches utility', 'CYBER'],
    ['Zoonotic pathogen outbreak widens', 'BIO'],
    ['Oil market slides on tariff news', 'MARKET'],
    ['Mass protest paralyses capital', 'CIVIL UNREST'],
    ['Envoys meet over disputed border', 'GEOPOLITICAL'],
  ])('classifies %s as %s', (title, expected) => {
    expect(classifyCategory(title)).toBe(expected);
  });

  it.each([
    ['Dozens killed in border clash', 'CRITICAL'],
    ['Cyber attack halts rail network', 'HIGH'],
    ['Minister warns of rising tension', 'MEDIUM'],
    ['Delegates sign cultural accord', 'LOW'],
  ])('rates %s as %s', (title, expected) => {
    expect(classifySeverity(title)).toBe(expected);
  });

  it('never throws on a missing title', () => {
    expect(classifyCategory(undefined as unknown as string)).toBe(
      'GEOPOLITICAL',
    );
    expect(classifySeverity(undefined as unknown as string)).toBe('LOW');
  });

  // Substring matching rated "warns" as CRITICAL because it contains "war",
  // and "flush"/"conflate" style words tripped other rules the same way.
  describe('word-boundary matching', () => {
    it('does not let a term match inside a longer word', () => {
      expect(classifySeverity('Minister warns of rising tension')).toBe(
        'MEDIUM',
      );
      expect(classifySeverity('Warsaw hosts a cultural summit')).toBe('LOW');
      expect(classifySeverity('Deadline set for trade talks')).toBe('LOW');
    });

    it('still matches the intended stems', () => {
      expect(classifySeverity('Two killed in border clash')).toBe('CRITICAL');
      expect(classifySeverity('Residents evacuated after blast')).toBe('HIGH');
      expect(classifyCategory('Cyberattack disrupts port')).toBe('CYBER');
    });

    it('is case-insensitive', () => {
      expect(classifySeverity('WAR DECLARED')).toBe('CRITICAL');
    });
  });
});

describe('stableId', () => {
  it('is stable for the same input', () => {
    expect(stableId('https://example.com/a')).toBe(
      stableId('https://example.com/a'),
    );
  });

  it('differs for different inputs', () => {
    expect(stableId('https://example.com/a')).not.toBe(
      stableId('https://example.com/b'),
    );
  });
});

describe('parseArticle', () => {
  it('parses a well-formed article', () => {
    const item = parseArticle({
      url: 'https://example.com/story',
      title: 'Ransomware group targets grid - Wire',
      domain: 'example.com',
    });

    expect(item).not.toBeNull();
    expect(item!.headline).toBe('Ransomware group targets grid');
    expect(item!.category).toBe('CYBER');
    expect(item!.source).toBe('example.com');
    expect(item!.isLive).toBe(true);
  });

  // The previous implementation called .split() directly on article.title,
  // so an article without one threw and killed the whole poll cycle.
  it('returns null instead of throwing when the title is missing', () => {
    expect(parseArticle({url: 'https://example.com/x'})).toBeNull();
    expect(
      parseArticle({url: 'https://example.com/x', title: '   '}),
    ).toBeNull();
  });

  it('returns null when the url is missing', () => {
    expect(parseArticle({title: 'Something happened'})).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(parseArticle(null)).toBeNull();
    expect(parseArticle('a string')).toBeNull();
  });

  it('falls back to a placeholder source', () => {
    const item = parseArticle({
      url: 'https://example.com/y',
      title: 'Headline',
    });
    expect(item!.source).toBe('Unattributed');
  });
});

describe('parseGeoFeatures', () => {
  const feature = (coordinates: unknown, count?: number) => ({
    geometry: {coordinates},
    properties: count === undefined ? {} : {count},
  });

  it('reads lng/lat in GeoJSON order', () => {
    const points = parseGeoFeatures({features: [feature([31.16, 48.37])]});
    expect(points).toHaveLength(1);
    expect(points[0].lat).toBeCloseTo(48.37);
    expect(points[0].lng).toBeCloseTo(31.16);
  });

  it('scales intensity from the mention count', () => {
    const [low, high] = parseGeoFeatures({
      features: [feature([0, 0], 2), feature([1, 1], 500)],
    });
    expect(high.value).toBeGreaterThan(low.value);
    expect(high.value).toBeLessThanOrEqual(1);
  });

  it('discards features with unusable geometry', () => {
    const points = parseGeoFeatures({
      features: [
        feature(undefined),
        feature([]),
        feature(['a', 'b']),
        {},
        null,
        feature([200, 100]), // out of range
        feature([10, 20]),
      ],
    });
    expect(points).toHaveLength(1);
  });

  it('returns an empty list for a malformed payload', () => {
    expect(parseGeoFeatures(null)).toEqual([]);
    expect(parseGeoFeatures({})).toEqual([]);
    expect(parseGeoFeatures({features: 'nope'})).toEqual([]);
  });
});

describe('Emitter', () => {
  interface Events {
    ping: number;
    [key: string]: unknown;
  }

  it('delivers payloads to every listener', () => {
    const emitter = new Emitter<Events>();
    const seen: number[] = [];
    emitter.on('ping', value => seen.push(value));
    emitter.on('ping', value => seen.push(value * 2));
    emitter.emit('ping', 3);
    expect(seen).toEqual([3, 6]);
  });

  it('returns an unsubscribe function', () => {
    const emitter = new Emitter<Events>();
    const seen: number[] = [];
    const off = emitter.on('ping', value => seen.push(value));
    off();
    emitter.emit('ping', 1);
    expect(seen).toEqual([]);
    expect(emitter.listenerCount('ping')).toBe(0);
  });

  it('lets a listener unsubscribe during dispatch without disturbing the others', () => {
    const emitter = new Emitter<Events>();
    const seen: string[] = [];
    const off = emitter.on('ping', () => {
      seen.push('first');
      off();
    });
    emitter.on('ping', () => seen.push('second'));

    emitter.emit('ping', 1);
    expect(seen).toEqual(['first', 'second']);

    emitter.emit('ping', 2);
    expect(seen).toEqual(['first', 'second', 'second']);
  });

  it('contains a throwing listener so the rest still run', () => {
    const emitter = new Emitter<Events>();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const seen: string[] = [];

    emitter.on('ping', () => {
      throw new Error('boom');
    });
    emitter.on('ping', () => seen.push('survived'));

    expect(() => emitter.emit('ping', 1)).not.toThrow();
    expect(seen).toEqual(['survived']);
    spy.mockRestore();
  });

  it('ignores emits for events with no listeners', () => {
    const emitter = new Emitter<Events>();
    expect(() => emitter.emit('ping', 1)).not.toThrow();
  });
});
