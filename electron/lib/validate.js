'use strict';

const {STORE_KEYS, SECRET_NAMES} = require('./contract');

/** Keys that let a crafted payload reach Object.prototype. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractError';
  }
}

/**
 * Rebuilds a value from scratch, keeping only JSON-representable data and
 * dropping any key that could reach a prototype. The result never shares an
 * object identity with the input, so a malicious getter cannot observe or
 * mutate what is finally written.
 */
function sanitize(value, depth = 0) {
  if (depth > 64) {
    throw new ContractError('Value nests too deeply');
  }
  if (value === null) {
    return null;
  }

  const type = typeof value;
  if (type === 'string' || type === 'boolean') {
    return value;
  }
  if (type === 'number') {
    if (!Number.isFinite(value)) {
      throw new ContractError('Non-finite numbers cannot be persisted');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitize(item, depth + 1));
  }
  if (type === 'object') {
    const clean = Object.create(null);
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        continue;
      }
      clean[key] = sanitize(value[key], depth + 1);
    }
    // Hand back a plain object so downstream JSON serialisation behaves.
    return Object.assign({}, clean);
  }

  throw new ContractError(`Unsupported value type: ${type}`);
}

function assertStoreKey(key) {
  if (
    typeof key !== 'string' ||
    !Object.prototype.hasOwnProperty.call(STORE_KEYS, key)
  ) {
    throw new ContractError(`Rejected store key: ${String(key)}`);
  }
  return STORE_KEYS[key];
}

function assertSecretName(name) {
  if (
    typeof name !== 'string' ||
    !Object.prototype.hasOwnProperty.call(SECRET_NAMES, name)
  ) {
    throw new ContractError(`Rejected secret name: ${String(name)}`);
  }
  return name;
}

/** Validates a value against its key's declared shape and size budget. */
function assertStoreValue(key, value) {
  const spec = assertStoreKey(key);
  const clean = sanitize(value);

  if (spec.type === 'array' && !Array.isArray(clean)) {
    throw new ContractError(`${key} must be an array`);
  }
  if (
    spec.type === 'object' &&
    (clean === null || typeof clean !== 'object' || Array.isArray(clean))
  ) {
    throw new ContractError(`${key} must be an object`);
  }

  const encoded = JSON.stringify(clean);
  if (encoded === undefined) {
    throw new ContractError(`${key} is not serialisable`);
  }
  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes > spec.maxBytes) {
    throw new ContractError(
      `${key} is ${bytes} bytes, over the ${spec.maxBytes} byte limit`,
    );
  }

  return clean;
}

module.exports = {
  ContractError,
  sanitize,
  assertStoreKey,
  assertSecretName,
  assertStoreValue,
};
