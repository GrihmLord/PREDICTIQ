'use strict';

/**
 * Single source of truth for the main <-> renderer contract.
 *
 * Every channel the renderer can reach is listed here, and every persisted key
 * the renderer can address is listed here. Anything absent is unreachable from
 * the renderer by construction rather than by convention.
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

/**
 * Persisted keys the renderer may address, with the validation each value must
 * satisfy before it is written. `maxBytes` is measured against the JSON
 * encoding so a runaway renderer cannot grow the store without bound.
 */
const STORE_KEYS = {
  predictionHistory: {type: 'array', maxBytes: 8 * 1024 * 1024},
  userSettings: {type: 'object', maxBytes: 128 * 1024},
  brandTheme: {type: 'object', maxBytes: 8 * 1024},
  authProfile: {type: 'object', maxBytes: 32 * 1024},
};

/** Secrets are encrypted at rest and are never readable by the renderer. */
const SECRET_NAMES = {
  aiApiKey: true,
  oidcTokens: true,
};

/** Hosts the app is permitted to reach. Everything else is blocked outright. */
const NETWORK_ALLOWLIST = [
  'api.gdeltproject.org',
  'api.anthropic.com',
  'api.openai.com',
];

/** Custom scheme the production renderer is served from. */
const APP_SCHEME = 'app';
const APP_HOST = 'predictiq';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const DEV_ORIGIN = 'http://127.0.0.1:8080';

const MAX_SAVE_BYTES = 32 * 1024 * 1024;
const MAX_SECRET_BYTES = 8 * 1024;
const MAX_PROMPT_CHARS = 24 * 1024;

module.exports = {
  CHANNELS,
  STORE_KEYS,
  SECRET_NAMES,
  NETWORK_ALLOWLIST,
  APP_SCHEME,
  APP_HOST,
  APP_ORIGIN,
  DEV_ORIGIN,
  MAX_SAVE_BYTES,
  MAX_SECRET_BYTES,
  MAX_PROMPT_CHARS,
};
