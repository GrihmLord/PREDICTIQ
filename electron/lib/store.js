'use strict';

/**
 * Persistence for the main process.
 *
 * electron-store ships as ESM in current releases, so a plain `require` throws
 * ERR_REQUIRE_ESM. Load it either way and keep the resolved instance behind a
 * promise so callers never observe a half-initialised store.
 */

let storePromise = null;

async function resolveStoreConstructor() {
  try {
    const mod = require('electron-store');
    return mod && mod.default ? mod.default : mod;
  } catch (error) {
    if (error && error.code !== 'ERR_REQUIRE_ESM') {
      throw error;
    }
    const mod = await import('electron-store');
    return mod && mod.default ? mod.default : mod;
  }
}

async function createStore() {
  const Store = await resolveStoreConstructor();
  return new Store({
    name: 'predictiq',
    // Written by the main process only; the renderer reaches it exclusively
    // through the allowlisted IPC surface in electron/lib/ipc.js.
    clearInvalidConfig: true,
  });
}

function getStore() {
  if (!storePromise) {
    storePromise = createStore();
  }
  return storePromise;
}

async function get(key, defaultValue = null) {
  const store = await getStore();
  const value = store.get(key);
  return value === undefined ? defaultValue : value;
}

async function set(key, value) {
  const store = await getStore();
  store.set(key, value);
}

async function remove(key) {
  const store = await getStore();
  store.delete(key);
}

async function describe() {
  const store = await getStore();
  return {backend: 'electron-store', path: store.path};
}

module.exports = {getStore, get, set, remove, describe};
