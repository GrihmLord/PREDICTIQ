'use strict';

const fs = require('fs/promises');
const path = require('path');
const {ipcMain, dialog, app, BrowserWindow} = require('electron');

const store = require('./store');
const secrets = require('./secrets');
const ai = require('./ai');
const oidc = require('./oidc');
const {CHANNELS, MAX_SAVE_BYTES} = require('./contract');
const {
  ContractError,
  assertStoreKey,
  assertStoreValue,
  assertSecretName,
  sanitize,
} = require('./validate');

/**
 * Every renderer-reachable operation lives here.
 *
 * Two rules hold across the whole surface:
 *  - Arguments crossing the boundary are untrusted and are validated before use.
 *  - Failures come back as a tagged result rather than a rejected promise, so
 *    internal stack traces never reach the renderer.
 */

function ok(data) {
  return {ok: true, data};
}

function fail(error) {
  const expected =
    error instanceof ContractError || error instanceof ai.ProviderError;
  if (!expected) {
    console.error('[ipc] unexpected failure:', error);
  }
  return {
    ok: false,
    error: {
      message: expected
        ? error.message
        : 'The operation could not be completed.',
      retryable: Boolean(error && error.retryable),
    },
  };
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return ok(await handler(event, ...args));
    } catch (error) {
      return fail(error);
    }
  });
}

const FORBIDDEN_NAME_CHARS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

/**
 * Reduces a renderer-supplied name to a single safe path segment. Control
 * characters and the characters Windows forbids are replaced rather than
 * dropped, so two distinct names cannot collapse into one.
 */
function safeFileName(name) {
  const base = path.basename(String(name || 'export'));

  let cleaned = '';
  for (const char of base) {
    const code = char.codePointAt(0);
    const unsafe =
      code < 0x20 || code === 0x7f || FORBIDDEN_NAME_CHARS.has(char);
    cleaned += unsafe ? '_' : char;
  }
  cleaned = cleaned.trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new ContractError('Invalid file name');
  }
  return cleaned.slice(0, 180);
}

function registerIpcHandlers() {
  handle(CHANNELS.STORE_GET, async (_event, key) => {
    assertStoreKey(key);
    return store.get(key, null);
  });

  handle(CHANNELS.STORE_SET, async (_event, key, value) => {
    const clean = assertStoreValue(key, value);
    await store.set(key, clean);
    return true;
  });

  handle(CHANNELS.STORE_DELETE, async (_event, key) => {
    assertStoreKey(key);
    await store.remove(key);
    return true;
  });

  handle(CHANNELS.SECRET_SET, async (_event, name, value) => {
    await secrets.write(name, value);
    return true;
  });

  handle(CHANNELS.SECRET_HAS, async (_event, name) => secrets.has(name));

  handle(CHANNELS.SECRET_CLEAR, async (_event, name) => {
    assertSecretName(name);
    await secrets.clear(name);
    return true;
  });

  handle(CHANNELS.FILE_SAVE, async (event, request) => {
    const payload = sanitize(request);
    const contents =
      payload && typeof payload.contents === 'string' ? payload.contents : null;
    if (contents === null) {
      throw new ContractError('File contents must be a string');
    }

    // Binary exports (PDF, PPTX) arrive base64-encoded because the IPC
    // channel carries structured-clone data, not Buffers.
    const encoding = payload.encoding === 'base64' ? 'base64' : 'utf8';
    if (Buffer.byteLength(contents, 'utf8') > MAX_SAVE_BYTES) {
      throw new ContractError('File exceeds the maximum export size');
    }

    let body;
    if (encoding === 'base64') {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(contents)) {
        throw new ContractError('File contents are not valid base64');
      }
      body = Buffer.from(contents, 'base64');
    } else {
      body = contents;
    }

    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(window, {
      defaultPath: path.join(
        app.getPath('documents'),
        safeFileName(payload.defaultName),
      ),
      filters: Array.isArray(payload.filters) ? payload.filters : undefined,
    });

    if (result.canceled || !result.filePath) {
      return {saved: false, path: null};
    }

    await fs.writeFile(
      result.filePath,
      body,
      encoding === 'base64' ? undefined : {encoding: 'utf8'},
    );
    return {saved: true, path: result.filePath};
  });

  handle(CHANNELS.APP_INFO, async () => {
    const described = await store.describe();
    return {
      version: app.getVersion(),
      platform: process.platform,
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
      },
      storage: {
        backend: described.backend,
        encryptedSecrets: secrets.isEncryptionAvailable(),
      },
    };
  });

  handle(CHANNELS.AI_COMPLETE, async (_event, request) => {
    const payload = sanitize(request);
    return ai.complete({
      provider: payload ? payload.provider : null,
      model: payload ? payload.model : null,
      system: payload ? payload.system : null,
      prompt: payload ? payload.prompt : null,
    });
  });

  handle(CHANNELS.AUTH_STATUS, async () => oidc.status());
  handle(CHANNELS.AUTH_LOGIN, async () => oidc.login());
  handle(CHANNELS.AUTH_LOGOUT, async () => oidc.logout());
}

module.exports = {registerIpcHandlers, safeFileName};
