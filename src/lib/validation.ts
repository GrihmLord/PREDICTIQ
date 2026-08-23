// src/lib/validation.ts
// Validation for data that crosses a trust boundary: imported files, restored
// store contents, and anything else that was not produced by this session.

import {PredictionResult} from '../services/predictionService';

/** Keys that would let a crafted payload reach Object.prototype. */
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 20000;

export interface ValidationOutcome<T> {
  ok: boolean;
  value: T | null;
  /** Human-readable reason, safe to show in the UI. */
  error: string | null;
  /** Records that were dropped because they did not validate. */
  skipped: number;
}

/**
 * Rebuilds a value from scratch, keeping only JSON-representable data and
 * dropping any prototype-reaching key. The result shares no object identity
 * with the input.
 */
export function sanitizeDeep(value: unknown, depth = 0): unknown {
  if (depth > 64 || value === null) {
    return null;
  }

  const type = typeof value;
  if (type === 'string' || type === 'boolean') {
    return value;
  }
  if (type === 'number') {
    return Number.isFinite(value as number) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeDeep(item, depth + 1));
  }
  if (type === 'object') {
    const source = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      if (FORBIDDEN_KEYS.indexOf(key) !== -1) {
        continue;
      }
      clean[key] = sanitizeDeep(source[key], depth + 1);
    }
    return clean;
  }

  return null;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function asStringArray(value: unknown, limit = 64): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(item => typeof item === 'string')
    .slice(0, limit)
    .map(item => (item as string).slice(0, 512));
}

/**
 * Coerces one untrusted record into a PredictionResult, or returns null when it
 * cannot be salvaged. Fields are clamped rather than trusted, because every
 * screen downstream renders them directly.
 */
export function coercePredictionRecord(
  input: unknown,
): PredictionResult | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  const record = sanitizeDeep(input) as Record<string, unknown>;

  const id =
    typeof record.id === 'string' && record.id ? record.id.slice(0, 128) : null;
  const timestamp = asTimestamp(record.timestamp);
  if (!id || timestamp === null) {
    return null;
  }

  const factors = Array.isArray(record.factors)
    ? (record.factors as unknown[])
        .slice(0, 64)
        .map(entry => {
          if (entry === null || typeof entry !== 'object') {
            return null;
          }
          const factor = entry as Record<string, unknown>;
          const name =
            typeof factor.name === 'string' ? factor.name.slice(0, 256) : null;
          if (!name) {
            return null;
          }
          return {
            name,
            impact:
              factor.impact === 'positive'
                ? ('positive' as const)
                : ('negative' as const),
            weight: clamp(asFiniteNumber(factor.weight, 0), 0, 100),
          };
        })
        .filter(
          (entry): entry is PredictionResult['factors'][number] =>
            entry !== null,
        )
    : [];

  return {
    id,
    scenario:
      typeof record.scenario === 'string'
        ? record.scenario.slice(0, 4096)
        : 'Untitled analysis',
    probability: clamp(
      Math.round(asFiniteNumber(record.probability, 0)),
      0,
      100,
    ),
    confidence: clamp(Math.round(asFiniteNumber(record.confidence, 0)), 0, 100),
    factors,
    timestamp: new Date(timestamp),
    status:
      record.status === 'Pending' || record.status === 'Draft'
        ? (record.status as PredictionResult['status'])
        : 'Verified',
    type: isPredictionType(record.type) ? record.type : 'Strategy',
    defconLevel: clamp(Math.round(asFiniteNumber(record.defconLevel, 5)), 1, 5),
    expertConsensus:
      typeof record.expertConsensus === 'string'
        ? record.expertConsensus.slice(0, 2048)
        : 'No consensus recorded.',
    activeThreats: asStringArray(record.activeThreats),
  };
}

function isPredictionType(value: unknown): value is PredictionResult['type'] {
  return (
    value === 'Financial' ||
    value === 'Product' ||
    value === 'Strategy' ||
    value === 'Metric' ||
    value === 'Geopolitical'
  );
}

/**
 * Parses and validates an exported history file. Anything unparseable is
 * rejected outright; individual bad records are dropped and counted so the user
 * is told what happened instead of silently losing rows.
 */
export function parseHistoryImport(
  jsonContent: string,
): ValidationOutcome<PredictionResult[]> {
  if (typeof jsonContent !== 'string' || jsonContent.trim() === '') {
    return {ok: false, value: null, error: 'The file is empty.', skipped: 0};
  }
  if (jsonContent.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      value: null,
      error:
        'The file is larger than the ' +
        Math.round(MAX_IMPORT_BYTES / 1024 / 1024) +
        ' MB import limit.',
      skipped: 0,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: 'The file is not valid JSON.',
      skipped: 0,
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      value: null,
      error: 'Expected an array of prediction records.',
      skipped: 0,
    };
  }
  if (parsed.length > MAX_IMPORT_RECORDS) {
    return {
      ok: false,
      value: null,
      error: 'The file holds more than ' + MAX_IMPORT_RECORDS + ' records.',
      skipped: 0,
    };
  }

  const records: PredictionResult[] = [];
  let skipped = 0;
  for (const entry of parsed) {
    const record = coercePredictionRecord(entry);
    if (record) {
      records.push(record);
    } else {
      skipped += 1;
    }
  }

  if (records.length === 0 && parsed.length > 0) {
    return {
      ok: false,
      value: null,
      error: 'No record in the file matched the expected format.',
      skipped,
    };
  }

  return {ok: true, value: records, error: null, skipped};
}

/** Applies the same validation to whatever the store handed back at startup. */
export function coerceHistory(raw: unknown): PredictionResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const records: PredictionResult[] = [];
  for (const entry of raw.slice(0, MAX_IMPORT_RECORDS)) {
    const record = coercePredictionRecord(entry);
    if (record) {
      records.push(record);
    }
  }
  return records;
}
