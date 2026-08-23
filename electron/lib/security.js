'use strict';

const path = require('path');
const fs = require('fs');
const {URL} = require('url');
const {shell, protocol, net} = require('electron');
const {
  APP_SCHEME,
  APP_HOST,
  DEV_ORIGIN,
  NETWORK_ALLOWLIST,
} = require('./contract');

/**
 * Renderer capabilities are denied by default and re-granted only where the app
 * genuinely needs them. The production renderer talks to GDELT and nothing
 * else; provider API calls run in the main process, so the renderer never needs
 * to reach api.anthropic.com or api.openai.com.
 */
const PROD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.gdeltproject.org",
  "worker-src 'self' blob:",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * The dev server needs eval (webpack's eval-source-map) and a websocket for hot
 * reload. Neither is ever served to a production build.
 */
const DEV_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.gdeltproject.org ws://127.0.0.1:8080 " +
    DEV_ORIGIN,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Must run before app.whenReady(). Gives the app scheme the same powers as
 * https so the renderer gets a real, stable origin instead of the quirks of a
 * file:// load.
 */
function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

function toFileUrl(absolutePath) {
  return 'file://' + absolutePath.split(path.sep).join('/');
}

/**
 * Serves the built renderer over the app scheme. Resolving through the real
 * path and re-checking containment means a crafted URL cannot escape dist/,
 * including by way of a symlink.
 */
function serveAppScheme(rootDir) {
  const root = fs.realpathSync(rootDir);

  protocol.handle(APP_SCHEME, async request => {
    const url = new URL(request.url);
    if (url.host !== APP_HOST) {
      return new Response('Not found', {status: 404});
    }

    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const candidate = path.resolve(
      root,
      relative === '' ? 'index.html' : relative,
    );

    let resolved;
    try {
      resolved = fs.realpathSync(candidate);
    } catch (error) {
      return new Response('Not found', {status: 404});
    }
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      return new Response('Forbidden', {status: 403});
    }
    if (!fs.statSync(resolved).isFile()) {
      return new Response('Not found', {status: 404});
    }

    const response = await net.fetch(toFileUrl(resolved));
    const headers = new Headers();
    headers.set(
      'Content-Type',
      MIME_TYPES[path.extname(resolved).toLowerCase()] ||
        'application/octet-stream',
    );
    headers.set('Content-Security-Policy', PROD_CSP);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');

    return new Response(response.body, {status: 200, headers});
  });
}

/**
 * Compares scheme and host rather than `origin`. A non-special scheme like
 * `app:` has an opaque origin — `new URL('app://predictiq/x').origin` is the
 * string "null" — so an origin comparison rejects the app's own pages.
 */
function isAllowedOrigin(rawUrl, isDev) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return false;
  }

  if (parsed.protocol === APP_SCHEME + ':' && parsed.host === APP_HOST) {
    return true;
  }
  if (!isDev || parsed.protocol !== 'http:') {
    return false;
  }

  // The dev server binds 127.0.0.1, but either spelling may reach the window
  // depending on how the URL was resolved.
  const devPort = new URL(DEV_ORIGIN).port;
  return (
    parsed.port === devPort &&
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
  );
}

function isAllowedRequestHost(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return false;
  }
  if (parsed.protocol === APP_SCHEME + ':' || parsed.protocol === 'devtools:') {
    return true;
  }
  if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
    return true;
  }
  if (!['https:', 'http:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    return false;
  }
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return true;
  }
  return NETWORK_ALLOWLIST.includes(parsed.hostname);
}

/**
 * Denies every renderer permission request. The app uses no camera,
 * microphone, geolocation, notifications, or clipboard reads, so there is
 * nothing to grant.
 */
function applySessionHardening(session, isDev) {
  session.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  session.setPermissionCheckHandler(() => false);
  if (typeof session.setDevicePermissionHandler === 'function') {
    session.setDevicePermissionHandler(() => false);
  }

  // The dev server has no headers of its own worth trusting, so stamp the dev
  // CSP on everything it serves. Production responses are stamped by
  // serveAppScheme instead.
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: Object.assign({}, details.responseHeaders, {
        'Content-Security-Policy': [isDev ? DEV_CSP : PROD_CSP],
        'X-Content-Type-Options': ['nosniff'],
      }),
    });
  });

  // Outbound allowlist. Anything not explicitly permitted never leaves the box.
  session.webRequest.onBeforeRequest((details, callback) => {
    callback({cancel: !isAllowedRequestHost(details.url)});
  });
}

/**
 * Locks a window to its own origin. In-app navigation anywhere else is
 * cancelled, and a genuine external link is handed to the system browser rather
 * than opened in an Electron window.
 */
function applyWindowHardening(window, isDev) {
  const {webContents} = window;

  webContents.on('will-navigate', (event, url) => {
    if (!isAllowedOrigin(url, isDev)) {
      event.preventDefault();
    }
  });

  webContents.on('will-redirect', (event, url) => {
    if (!isAllowedOrigin(url, isDev)) {
      event.preventDefault();
    }
  });

  webContents.setWindowOpenHandler(({url}) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      return {action: 'deny'};
    }
    if (parsed.protocol === 'https:') {
      shell.openExternal(url);
    }
    return {action: 'deny'};
  });

  webContents.on('will-attach-webview', event => {
    event.preventDefault();
  });
}

module.exports = {
  PROD_CSP,
  DEV_CSP,
  registerAppScheme,
  serveAppScheme,
  applySessionHardening,
  applyWindowHardening,
  isAllowedOrigin,
  isAllowedRequestHost,
};
