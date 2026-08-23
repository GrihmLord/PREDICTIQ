'use strict';

const http = require('http');
const crypto = require('crypto');
const {URL, URLSearchParams} = require('url');
const {shell} = require('electron');

const secrets = require('./secrets');
const store = require('./store');
const {ContractError} = require('./validate');

/**
 * OAuth 2.0 authorization code flow with PKCE (RFC 7636) against an OIDC
 * provider, run entirely in the main process.
 *
 * The browser half happens in the user's real browser, not an embedded window,
 * so the app never sees the credentials. Tokens land in the OS keystore; the
 * renderer only ever receives identity claims.
 *
 * Configuration comes from the environment so nothing is baked into the build:
 *   PREDICTIQ_OIDC_ISSUER     e.g. https://login.microsoftonline.com/<tenant>/v2.0
 *   PREDICTIQ_OIDC_CLIENT_ID  the public client id registered with the IdP
 *   PREDICTIQ_OIDC_SCOPES     optional, defaults to "openid profile email"
 *
 * With no issuer configured the flow reports itself as unconfigured rather than
 * pretending to authenticate.
 */

const DEFAULT_SCOPES = 'openid profile email';
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 15000;

function readConfig() {
  const issuer = (process.env.PREDICTIQ_OIDC_ISSUER || '').trim();
  const clientId = (process.env.PREDICTIQ_OIDC_CLIENT_ID || '').trim();
  const scopes = (process.env.PREDICTIQ_OIDC_SCOPES || DEFAULT_SCOPES).trim();

  if (!issuer || !clientId) {
    return {configured: false, issuer: null, clientId: null, scopes};
  }

  let parsed;
  try {
    parsed = new URL(issuer);
  } catch (error) {
    return {
      configured: false,
      issuer: null,
      clientId: null,
      scopes,
      error: 'Issuer is not a valid URL',
    };
  }
  if (parsed.protocol !== 'https:') {
    return {
      configured: false,
      issuer: null,
      clientId: null,
      scopes,
      error: 'Issuer must use https',
    };
  }

  return {
    configured: true,
    issuer: parsed.origin + parsed.pathname.replace(/\/$/, ''),
    clientId,
    scopes,
  };
}

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createPkcePair() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(
    crypto.createHash('sha256').update(verifier).digest(),
  );
  return {verifier, challenge};
}

async function fetchJson(url, options = {}, timeoutMs = DISCOVERY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      url,
      Object.assign({}, options, {signal: controller.signal}),
    );
    const body = await response.text();
    let parsed = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch (error) {
      throw new Error('Identity provider returned a non-JSON response');
    }
    if (!response.ok) {
      const detail =
        parsed && parsed.error_description
          ? parsed.error_description
          : response.status;
      throw new Error('Identity provider error: ' + detail);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

async function discover(issuer) {
  const metadata = await fetchJson(
    issuer + '/.well-known/openid-configuration',
  );
  for (const field of ['authorization_endpoint', 'token_endpoint']) {
    if (typeof metadata[field] !== 'string') {
      throw new Error('Discovery document is missing ' + field);
    }
  }
  return metadata;
}

const RESPONSE_OK =
  '<!doctype html><meta charset="utf-8"><title>PREDICTIQ</title>' +
  '<body style="font-family:system-ui;background:#0F172A;color:#F8FAFC;display:flex;' +
  'align-items:center;justify-content:center;height:100vh;margin:0">' +
  '<p>Signed in. You can close this tab and return to PREDICTIQ.</p></body>';

const RESPONSE_FAIL =
  '<!doctype html><meta charset="utf-8"><title>PREDICTIQ</title>' +
  '<body style="font-family:system-ui;background:#0F172A;color:#F8FAFC;display:flex;' +
  'align-items:center;justify-content:center;height:100vh;margin:0">' +
  '<p>Sign-in failed. Return to PREDICTIQ and try again.</p></body>';

/**
 * The loopback listener and the authorization URL depend on each other: the
 * redirect URI is only known once the port is bound. Bind first, then hand the
 * URI back alongside a promise for the code.
 */
function startLoopbackListener(expectedState) {
  return new Promise((resolveOuter, rejectOuter) => {
    const server = http.createServer();
    let settled = false;
    let timer = null;

    const codePromise = new Promise((resolveCode, rejectCode) => {
      const finish = (error, value) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        server.close();
        if (error) {
          rejectCode(error);
        } else {
          resolveCode(value);
        }
      };

      timer = setTimeout(
        () => finish(new Error('Sign-in timed out')),
        LOGIN_TIMEOUT_MS,
      );

      server.on('request', (req, res) => {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        if (requestUrl.pathname !== '/callback') {
          res.writeHead(404).end();
          return;
        }

        const code = requestUrl.searchParams.get('code');
        const state = requestUrl.searchParams.get('state');
        const failure = requestUrl.searchParams.get('error');
        const ok = !failure && Boolean(code) && state === expectedState;

        res.writeHead(ok ? 200 : 400, {
          'Content-Type': 'text/html; charset=utf-8',
        });
        res.end(ok ? RESPONSE_OK : RESPONSE_FAIL);

        if (failure) {
          finish(new Error('Identity provider returned: ' + failure));
        } else if (!code) {
          finish(new Error('Identity provider returned no authorization code'));
        } else if (state !== expectedState) {
          finish(
            new Error('State mismatch; the sign-in response was not trusted'),
          );
        } else {
          finish(null, code);
        }
      });

      server.on('error', error => finish(error));
    });

    // Swallow the rejection here so an early failure does not surface as an
    // unhandled rejection before the caller attaches its own handler.
    codePromise.catch(() => {});

    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolveOuter({
        redirectUri: 'http://127.0.0.1:' + port + '/callback',
        codePromise,
        cancel: () => {
          if (!settled) {
            settled = true;
            if (timer) {
              clearTimeout(timer);
            }
            server.close();
          }
        },
      });
    });

    server.on('error', rejectOuter);
  });
}

function decodeIdTokenClaims(idToken) {
  if (typeof idToken !== 'string') {
    return {};
  }
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return {};
  }
  try {
    const payload = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function toProfile(claims) {
  return {
    id: String(claims.sub || claims.oid || ''),
    name: String(
      claims.name ||
        claims.preferred_username ||
        claims.email ||
        'Unknown operator',
    ),
    email: String(claims.email || claims.preferred_username || ''),
    organization: String(claims.organization || claims.tid || claims.iss || ''),
    // Role comes from the provider or not at all. The app never invents one.
    role: normaliseRole(claims),
  };
}

function normaliseRole(claims) {
  const raw = claims.roles || claims.role || claims.groups;
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? [raw]
    : [];
  const upper = values.map(value => String(value).toUpperCase());
  if (upper.some(value => value.includes('ADMIN'))) {
    return 'ADMIN';
  }
  if (upper.some(value => value.includes('ANALYST'))) {
    return 'ANALYST';
  }
  return 'VIEWER';
}

async function status() {
  const config = readConfig();
  if (!config.configured) {
    return {
      configured: false,
      issuer: null,
      authenticated: false,
      profile: null,
      reason:
        config.error ||
        'PREDICTIQ_OIDC_ISSUER and PREDICTIQ_OIDC_CLIENT_ID are not set',
    };
  }

  const authenticated = await secrets.has('oidcTokens');
  const profile = authenticated ? await store.get('authProfile', null) : null;
  return {configured: true, issuer: config.issuer, authenticated, profile};
}

async function login() {
  const config = readConfig();
  if (!config.configured) {
    throw new ContractError(
      config.error ||
        'No identity provider is configured. Set PREDICTIQ_OIDC_ISSUER and PREDICTIQ_OIDC_CLIENT_ID.',
    );
  }

  const metadata = await discover(config.issuer);
  const {verifier, challenge} = createPkcePair();
  const state = base64Url(crypto.randomBytes(16));
  const nonce = base64Url(crypto.randomBytes(16));

  const listener = await startLoopbackListener(state);

  try {
    const authorizeUrl = new URL(metadata.authorization_endpoint);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', listener.redirectUri);
    authorizeUrl.searchParams.set('scope', config.scopes);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('nonce', nonce);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    await shell.openExternal(authorizeUrl.toString());
    const code = await listener.codePromise;

    const tokens = await fetchJson(metadata.token_endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: listener.redirectUri,
        client_id: config.clientId,
        code_verifier: verifier,
      }).toString(),
    });

    const claims = decodeIdTokenClaims(tokens.id_token);
    if (claims.nonce && claims.nonce !== nonce) {
      throw new Error('Nonce mismatch; the identity token was not trusted');
    }

    const profile = toProfile(claims);
    await secrets.write('oidcTokens', JSON.stringify(tokens));
    await store.set('authProfile', profile);

    return {
      configured: true,
      issuer: config.issuer,
      authenticated: true,
      profile,
    };
  } finally {
    listener.cancel();
  }
}

async function logout() {
  await secrets.clear('oidcTokens');
  await store.remove('authProfile');
  const config = readConfig();
  return {
    configured: config.configured,
    issuer: config.issuer,
    authenticated: false,
    profile: null,
  };
}

module.exports = {
  status,
  login,
  logout,
  readConfig,
  toProfile,
  normaliseRole,
  decodeIdTokenClaims,
};
