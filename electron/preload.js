'use strict';

const {contextBridge, ipcRenderer} = require('electron');

/**
 * The only bridge between the renderer and the main process.
 *
 * This file runs in a sandboxed renderer, where `require` is a limited polyfill
 * that resolves `electron` and a handful of builtins and nothing else. It
 * therefore cannot import electron/lib/contract.js, so the channel names are
 * repeated here literally. `electron/__tests__/preload.test.js` asserts this
 * list stays identical to the contract, so the duplication cannot drift.
 *
 * An earlier version of this file required electron-store here. A sandboxed
 * preload cannot load that, so the require threw, the bridge was never
 * installed, and every store call in the app silently fell back to
 * localStorage. Keep this file dependency-free.
 */
const CHANNELS = {
  STORE_GET: 'predictiq:store:get',
  STORE_SET: 'predictiq:store:set',
  STORE_DELETE: 'predictiq:store:delete',

  SECRET_SET: 'predictiq:secret:set',
  SECRET_HAS: 'predictiq:secret:has',
  SECRET_CLEAR: 'predictiq:secret:clear',

  FILE_SAVE: 'predictiq:file:save',

  APP_INFO: 'predictiq:app:info',

  AI_COMPLETE: 'predictiq:ai:complete',

  AUTH_STATUS: 'predictiq:auth:status',
  AUTH_LOGIN: 'predictiq:auth:login',
  AUTH_LOGOUT: 'predictiq:auth:logout',
};

async function call(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (!result || result.ok !== true) {
    const message =
      result && result.error ? result.error.message : 'Request failed';
    const error = new Error(message);
    error.retryable = Boolean(result && result.error && result.error.retryable);
    throw error;
  }
  return result.data;
}

contextBridge.exposeInMainWorld('predictiq', {
  /** Persisted application data. Keys are allowlisted in the main process. */
  store: {
    get: key => call(CHANNELS.STORE_GET, key),
    set: (key, value) => call(CHANNELS.STORE_SET, key, value),
    delete: key => call(CHANNELS.STORE_DELETE, key),
  },

  /**
   * Secrets are write-only from here by design: they can be set, tested for
   * presence, and cleared, but never read back into the renderer.
   */
  secrets: {
    set: (name, value) => call(CHANNELS.SECRET_SET, name, value),
    has: name => call(CHANNELS.SECRET_HAS, name),
    clear: name => call(CHANNELS.SECRET_CLEAR, name),
  },

  /** Writes a file through the OS save dialog. The user picks the path. */
  files: {
    save: request => call(CHANNELS.FILE_SAVE, request),
  },

  /** Runs a model completion in the main process, where the key lives. */
  ai: {
    complete: request => call(CHANNELS.AI_COMPLETE, request),
  },

  auth: {
    status: () => call(CHANNELS.AUTH_STATUS),
    login: () => call(CHANNELS.AUTH_LOGIN),
    logout: () => call(CHANNELS.AUTH_LOGOUT),
  },

  app: {
    info: () => call(CHANNELS.APP_INFO),
  },
});
