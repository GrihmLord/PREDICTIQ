'use strict';

const {safeStorage} = require('electron');
const store = require('./store');
const {assertSecretName, ContractError} = require('./validate');
const {MAX_SECRET_BYTES} = require('./contract');

/**
 * Secrets at rest.
 *
 * Values are encrypted with the OS keystore (DPAPI on Windows, Keychain on
 * macOS, libsecret on Linux) and stored as base64 ciphertext. Nothing in this
 * module is reachable from the renderer: `read` is deliberately not exposed
 * over IPC, so a compromised renderer can set or clear a secret but can never
 * read one back.
 */

const PREFIX = 'secrets.';

function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

async function write(name, plaintext) {
  assertSecretName(name);
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new ContractError('Secret value must be a non-empty string');
  }
  if (Buffer.byteLength(plaintext, 'utf8') > MAX_SECRET_BYTES) {
    throw new ContractError('Secret value exceeds the size limit');
  }
  if (!isEncryptionAvailable()) {
    throw new ContractError(
      'OS-backed encryption is unavailable; refusing to store the secret in plaintext',
    );
  }

  const ciphertext = safeStorage.encryptString(plaintext);
  await store.set(`${PREFIX}${name}`, ciphertext.toString('base64'));
}

/** Main-process only. Never wire this to an IPC channel. */
async function read(name) {
  assertSecretName(name);
  const encoded = await store.get(`${PREFIX}${name}`, null);
  if (typeof encoded !== 'string' || encoded.length === 0) {
    return null;
  }
  if (!isEncryptionAvailable()) {
    return null;
  }
  try {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  } catch (error) {
    // A key rotation or profile move invalidates the ciphertext. Drop it
    // rather than leaving an undecryptable value behind forever.
    await store.remove(`${PREFIX}${name}`);
    return null;
  }
}

async function has(name) {
  assertSecretName(name);
  const encoded = await store.get(`${PREFIX}${name}`, null);
  return typeof encoded === 'string' && encoded.length > 0;
}

async function clear(name) {
  assertSecretName(name);
  await store.remove(`${PREFIX}${name}`);
}

module.exports = {write, read, has, clear, isEncryptionAvailable};
