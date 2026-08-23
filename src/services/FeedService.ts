// src/services/FeedService.ts
// Live intelligence feed backed by the GDELT project, with a clearly-labelled
// simulation fallback when the network is unavailable.

import {Emitter} from '../lib/emitter';

export type NewsCategory =
  | 'GEOPOLITICAL'
  | 'CYBER'
  | 'MARKET'
  | 'BIO'
  | 'CIVIL UNREST';
export type NewsSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  category: NewsCategory;
  severity: NewsSeverity;
  timestamp: number;
  /** False when the item came from the offline fallback, never hidden from the UI. */
  isLive: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  value: number;
}

export interface FeedStatus {
  connected: boolean;
  live: boolean;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
  lastError: string | null;
}

interface FeedEvents {
  news: NewsItem;
  status: FeedStatus;
  [key: string]: unknown;
}

const POLL_INTERVAL_MS = 60000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const MAX_SEEN_URLS = 500;
const MAX_ARTICLES = 15;
const MAX_GEO_POINTS = 500;
const MAX_HEADLINE_CHARS = 300;

const GDELT_DOC_API =
  'https://api.gdeltproject.org/api/v2/doc/doc' +
  '?query=(protest%20OR%20riot%20OR%20conflict%20OR%20terror%20OR%20diplomatic)' +
  '&mode=ArtList&maxrecords=' +
  MAX_ARTICLES +
  '&format=json&timespan=60min&trans=googtrans';

// The previous query asked for `sourcecountry:US minus:sourcecountry:US`, which
// is self-contradictory and returned nothing, so the globe was always drawing
// the fallback points while claiming live GDELT data.
const GDELT_GEO_API =
  'https://api.gdeltproject.org/api/v1/gkg_geojson' +
  '?QUERY=(conflict%20OR%20protest%20OR%20unrest)&TIMESPAN=1440';

const SIMULATED_HEADLINES: {
  headline: string;
  category: NewsCategory;
  severity: NewsSeverity;
}[] = [
  {
    headline: 'OPEC+ announces surprise production cut',
    category: 'MARKET',
    severity: 'MEDIUM',
  },
  {
    headline: 'Large-scale DDoS disrupts European banking sector',
    category: 'CYBER',
    severity: 'HIGH',
  },
  {
    headline: 'New avian influenza strain detected in Southeast Asia',
    category: 'BIO',
    severity: 'MEDIUM',
  },
  {
    headline: 'Diplomatic talks break down in the South China Sea',
    category: 'GEOPOLITICAL',
    severity: 'HIGH',
  },
  {
    headline: 'Technology equities rally on AI capability news',
    category: 'MARKET',
    severity: 'LOW',
  },
  {
    headline: 'Global supply chain disruptions forecast to widen',
    category: 'MARKET',
    severity: 'MEDIUM',
  },
  {
    headline: 'Ransomware group targets critical infrastructure',
    category: 'CYBER',
    severity: 'CRITICAL',
  },
  {
    headline: 'Ceasefire agreement signed in emerging conflict zone',
    category: 'GEOPOLITICAL',
    severity: 'LOW',
  },
];

/** Known conflict zones, used only when the live feed cannot be reached. */
const FALLBACK_GEO_POINTS: GeoPoint[] = [
  {lat: 48.3794, lng: 31.1656, value: 0.8},
  {lat: 31.5, lng: 34.4667, value: 0.9},
  {lat: 12.8628, lng: 30.2176, value: 0.7},
  {lat: 23.6978, lng: 120.9605, value: 0.5},
  {lat: 33.2232, lng: 43.6793, value: 0.6},
  {lat: 15.5527, lng: 48.5164, value: 0.6},
];

/**
 * Terms are matched on word boundaries, not as substrings. Plain substring
 * matching classified "Minister warns of rising tension" as CRITICAL, because
 * "warns" contains "war". A trailing `*` opts a term into prefix matching where
 * that is genuinely wanted, e.g. evacuate / evacuated / evacuation.
 */
function buildMatcher(terms: string[]): RegExp {
  const alternatives = terms.map(term => {
    const prefix = term.endsWith('*');
    const literal = (prefix ? term.slice(0, -1) : term).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    return prefix ? literal + '[a-z]*' : literal;
  });
  return new RegExp('\\b(?:' + alternatives.join('|') + ')\\b', 'i');
}

const CATEGORY_RULES: {category: NewsCategory; matcher: RegExp}[] = [
  {
    category: 'CYBER',
    matcher: buildMatcher([
      'cyber*',
      'hack*',
      'ransomware',
      'malware',
      'breach*',
      'phishing',
      'intrusion',
    ]),
  },
  {
    category: 'BIO',
    matcher: buildMatcher([
      'virus',
      'viral',
      'outbreak',
      'influenza',
      'flu',
      'pathogen*',
      'epidemic',
      'pandemic',
      'vaccine*',
    ]),
  },
  {
    category: 'MARKET',
    matcher: buildMatcher([
      'market*',
      'stock*',
      'oil',
      'inflation',
      'tariff*',
      'equities',
      'currency',
      'currencies',
    ]),
  },
  {
    category: 'CIVIL UNREST',
    matcher: buildMatcher([
      'protest*',
      'riot*',
      'strike*',
      'demonstration*',
      'unrest',
    ]),
  },
];

const SEVERITY_RULES: {severity: NewsSeverity; matcher: RegExp}[] = [
  {
    severity: 'CRITICAL',
    matcher: buildMatcher([
      'war',
      'wars',
      'warfare',
      'kill*',
      'dead',
      'deaths',
      'critical',
      'massacre*',
      'invasion',
    ]),
  },
  {
    severity: 'HIGH',
    matcher: buildMatcher([
      'attack*',
      'crisis',
      'breach*',
      'emergency',
      'strike*',
      'evacuat*',
    ]),
  },
  {
    severity: 'MEDIUM',
    matcher: buildMatcher([
      'tension*',
      'warn*',
      'threat*',
      'sanction*',
      'dispute*',
    ]),
  },
];

/** Fetch with a hard timeout. A hung request must not stall the poll loop. */
async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function classifyCategory(title: string): NewsCategory {
  const text = String(title || '');
  for (const rule of CATEGORY_RULES) {
    if (rule.matcher.test(text)) {
      return rule.category;
    }
  }
  return 'GEOPOLITICAL';
}

export function classifySeverity(title: string): NewsSeverity {
  const text = String(title || '');
  for (const rule of SEVERITY_RULES) {
    if (rule.matcher.test(text)) {
      return rule.severity;
    }
  }
  return 'LOW';
}

/** Strips the trailing " - Publisher" many aggregators append. */
export function cleanHeadline(title: string): string {
  const text = String(title || '').trim();
  const separator = text.lastIndexOf(' - ');
  const trimmed = separator > 20 ? text.slice(0, separator) : text;
  return trimmed.trim().slice(0, MAX_HEADLINE_CHARS);
}

export function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 16);
}

/**
 * Converts one GDELT article into a NewsItem, or null when the payload is not
 * shaped as expected. The previous version called .split() straight on
 * article.title, which threw whenever an article arrived without one.
 */
export function parseArticle(raw: unknown): NewsItem | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const article = raw as Record<string, unknown>;
  const url = typeof article.url === 'string' ? article.url : null;
  const title = typeof article.title === 'string' ? article.title : null;
  if (!url || !title || title.trim().length === 0) {
    return null;
  }

  return {
    id: stableId(url),
    headline: cleanHeadline(title),
    source:
      typeof article.domain === 'string' && article.domain
        ? article.domain.slice(0, 120)
        : 'Unattributed',
    category: classifyCategory(title),
    severity: classifySeverity(title),
    // GDELT article timestamps lag ingestion; the arrival time is what the
    // ticker is actually reporting.
    timestamp: Date.now(),
    isLive: true,
  };
}

/** Extracts plottable points, discarding anything without usable coordinates. */
export function parseGeoFeatures(raw: unknown): GeoPoint[] {
  if (raw === null || typeof raw !== 'object') {
    return [];
  }
  const features = (raw as Record<string, unknown>).features;
  if (!Array.isArray(features)) {
    return [];
  }

  const points: GeoPoint[] = [];
  for (const feature of features) {
    if (feature === null || typeof feature !== 'object') {
      continue;
    }
    const geometry = (feature as Record<string, unknown>).geometry;
    if (geometry === null || typeof geometry !== 'object') {
      continue;
    }
    const coordinates = (geometry as Record<string, unknown>).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      continue;
    }

    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      continue;
    }

    const properties = (feature as Record<string, unknown>).properties;
    const count =
      properties !== null && typeof properties === 'object'
        ? Number((properties as Record<string, unknown>).count)
        : NaN;
    // Intensity comes from the mention count where GDELT supplies one, rather
    // than the random value the previous implementation drew per point.
    const value =
      Number.isFinite(count) && count > 0
        ? Math.min(1, Math.log10(count + 1) / 2)
        : 0.25;

    points.push({lat, lng, value});
    if (points.length >= MAX_GEO_POINTS) {
      break;
    }
  }
  return points;
}

class FeedService extends Emitter<FeedEvents> {
  private connected = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seenUrls: string[] = [];
  private seenSet = new Set<string>();
  private consecutiveFailures = 0;
  private lastSuccessAt: number | null = null;
  private lastError: string | null = null;
  private live = false;
  private simulationIndex = 0;

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.consecutiveFailures = 0;
    void this.poll();
  }

  disconnect(): void {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emitStatus();
  }

  getStatus(): FeedStatus {
    return {
      connected: this.connected,
      live: this.live,
      lastSuccessAt: this.lastSuccessAt,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
    };
  }

  private emitStatus(): void {
    this.emit('status', this.getStatus());
  }

  /**
   * Exponential backoff after failures, capped, so a sustained GDELT outage
   * settles into an occasional retry instead of hammering it every minute.
   */
  private nextDelay(): number {
    if (this.consecutiveFailures === 0) {
      return POLL_INTERVAL_MS;
    }
    const backoff =
      POLL_INTERVAL_MS * Math.pow(2, Math.min(this.consecutiveFailures, 6));
    return Math.min(backoff, MAX_BACKOFF_MS);
  }

  private scheduleNext(): void {
    if (!this.connected) {
      return;
    }
    this.timer = setTimeout(() => {
      void this.poll();
    }, this.nextDelay());
  }

  private async poll(): Promise<void> {
    if (!this.connected) {
      return;
    }

    // Polling a hidden window burns quota for output nobody can see.
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      this.scheduleNext();
      return;
    }

    try {
      const payload = await fetchJsonWithTimeout(
        GDELT_DOC_API,
        REQUEST_TIMEOUT_MS,
      );
      const articles =
        payload !== null &&
        typeof payload === 'object' &&
        Array.isArray((payload as Record<string, unknown>).articles)
          ? ((payload as Record<string, unknown>).articles as unknown[])
          : [];

      const emitted = this.emitArticles(articles);
      this.consecutiveFailures = 0;
      this.lastSuccessAt = Date.now();
      this.lastError = null;
      this.live = true;

      // A successful but empty response is still a live feed; only fall back to
      // simulation when nothing at all has ever arrived.
      if (emitted === 0 && this.seenSet.size === 0) {
        this.emitSimulated();
      }
    } catch (error) {
      this.consecutiveFailures += 1;
      this.lastError =
        error instanceof Error ? error.message : 'Feed unavailable';
      this.live = false;
      this.emitSimulated();
    }

    this.emitStatus();
    this.scheduleNext();
  }

  private emitArticles(articles: unknown[]): number {
    let emitted = 0;

    // Reversed so the oldest of a new batch reaches the ticker first.
    for (const raw of articles.slice().reverse()) {
      const item = parseArticle(raw);
      if (!item || this.seenSet.has(item.id)) {
        continue;
      }
      this.remember(item.id);
      this.emit('news', item);
      emitted += 1;
    }
    return emitted;
  }

  /** True LRU eviction; the previous Set-based version evicted arbitrarily. */
  private remember(id: string): void {
    this.seenSet.add(id);
    this.seenUrls.push(id);
    while (this.seenUrls.length > MAX_SEEN_URLS) {
      const oldest = this.seenUrls.shift();
      if (oldest !== undefined) {
        this.seenSet.delete(oldest);
      }
    }
  }

  /** Cycles deterministically so the fallback cannot repeat the same headline. */
  private emitSimulated(): void {
    const entry =
      SIMULATED_HEADLINES[this.simulationIndex % SIMULATED_HEADLINES.length];
    this.simulationIndex += 1;

    this.emit('news', {
      id: 'sim-' + this.simulationIndex + '-' + stableId(entry.headline),
      headline: entry.headline,
      source: 'SIMULATION',
      category: entry.category,
      severity: entry.severity,
      timestamp: Date.now(),
      isLive: false,
    });
  }

  async fetchGeoMetricData(): Promise<GeoPoint[]> {
    try {
      const payload = await fetchJsonWithTimeout(
        GDELT_GEO_API,
        REQUEST_TIMEOUT_MS,
      );
      const points = parseGeoFeatures(payload);
      if (points.length > 0) {
        return points;
      }
    } catch (error) {
      console.warn(
        '[FeedService] GeoJSON unavailable, plotting known zones.',
        error,
      );
    }
    return FALLBACK_GEO_POINTS.slice();
  }
}

export const feedService = new FeedService();
