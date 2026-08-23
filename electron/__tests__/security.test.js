'use strict';

const fs = require('fs');
const path = require('path');

const {
  ContractError,
  sanitize,
  assertStoreKey,
  assertSecretName,
  assertStoreValue,
} = require('../lib/validate');
const {CHANNELS, STORE_KEYS, NETWORK_ALLOWLIST} = require('../lib/contract');
const {
  isAllowedOrigin,
  isAllowedRequestHost,
  PROD_CSP,
  DEV_CSP,
} = require('../lib/security');

describe('store key allowlist', () => {
  it('accepts every declared key', () => {
    for (const key of Object.keys(STORE_KEYS)) {
      expect(() => assertStoreKey(key)).not.toThrow();
    }
  });

  it('rejects anything not declared', () => {
    expect(() => assertStoreKey('secrets.aiApiKey')).toThrow(ContractError);
    expect(() => assertStoreKey('__proto__')).toThrow(ContractError);
    expect(() => assertStoreKey(null)).toThrow(ContractError);
    expect(() => assertStoreKey(42)).toThrow(ContractError);
  });

  // A renderer must never be able to address a secret through the store
  // channel; secrets have their own write-only channel.
  it('does not expose the secret namespace as a store key', () => {
    for (const key of Object.keys(STORE_KEYS)) {
      expect(key.startsWith('secrets.')).toBe(false);
    }
  });
});

describe('secret name allowlist', () => {
  it('accepts the declared secrets', () => {
    expect(() => assertSecretName('aiApiKey')).not.toThrow();
    expect(() => assertSecretName('oidcTokens')).not.toThrow();
  });

  it('rejects anything else', () => {
    expect(() => assertSecretName('someOtherKey')).toThrow(ContractError);
    expect(() => assertSecretName('__proto__')).toThrow(ContractError);
  });
});

describe('sanitize', () => {
  it('drops prototype-reaching keys', () => {
    const hostile = JSON.parse('{"ok":1,"__proto__":{"pwned":true}}');
    const clean = sanitize(hostile);

    expect(clean.ok).toBe(1);
    expect({}.pwned).toBeUndefined();
  });

  it('rejects functions and other non-JSON values', () => {
    expect(() => sanitize({fn: () => 1})).toThrow(ContractError);
    expect(() => sanitize({big: BigInt(1)})).toThrow(ContractError);
  });

  it('rejects non-finite numbers', () => {
    expect(() => sanitize({n: Number.NaN})).toThrow(ContractError);
  });

  it('refuses runaway nesting', () => {
    let deep = 'leaf';
    for (let i = 0; i < 100; i++) {
      deep = {next: deep};
    }
    expect(() => sanitize(deep)).toThrow(ContractError);
  });

  it('copies rather than aliases', () => {
    const source = {nested: {value: 1}};
    const clean = sanitize(source);
    expect(clean).toEqual(source);
    expect(clean.nested).not.toBe(source.nested);
  });
});

describe('assertStoreValue', () => {
  it('enforces the declared shape', () => {
    expect(() => assertStoreValue('predictionHistory', {})).toThrow(
      ContractError,
    );
    expect(() => assertStoreValue('userSettings', [])).toThrow(ContractError);
    expect(() => assertStoreValue('predictionHistory', [])).not.toThrow();
    expect(() => assertStoreValue('userSettings', {a: 1})).not.toThrow();
  });

  it('enforces the size budget', () => {
    const oversized = {blob: 'x'.repeat(STORE_KEYS.brandTheme.maxBytes + 100)};
    expect(() => assertStoreValue('brandTheme', oversized)).toThrow(/limit/i);
  });

  it('returns a sanitised copy for writing', () => {
    const clean = assertStoreValue(
      'userSettings',
      JSON.parse('{"a":1,"__proto__":{"x":1}}'),
    );
    expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(
      false,
    );
    expect(clean.a).toBe(1);
  });
});

describe('navigation allowlist', () => {
  // `app:` is a non-special scheme, so its URL origin is the string "null".
  // Comparing origins rejected the app's own pages; scheme and host are what
  // actually identify them.
  it('permits the app scheme and host', () => {
    expect(isAllowedOrigin('app://predictiq/index.html', false)).toBe(true);
    expect(
      isAllowedOrigin('app://predictiq/assets/globe/earth-night.jpg', false),
    ).toBe(true);
  });

  it('refuses another host on the app scheme', () => {
    expect(isAllowedOrigin('app://elsewhere/index.html', false)).toBe(false);
  });

  it('permits the dev server, by either loopback spelling, only in development', () => {
    expect(isAllowedOrigin('http://127.0.0.1:8080/', true)).toBe(true);
    expect(isAllowedOrigin('http://localhost:8080/', true)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:8080/', false)).toBe(false);
    expect(isAllowedOrigin('http://localhost:8080/', false)).toBe(false);
  });

  it('refuses another port on loopback', () => {
    expect(isAllowedOrigin('http://127.0.0.1:9999/', true)).toBe(false);
  });

  it('refuses everything else', () => {
    expect(isAllowedOrigin('https://evil.example/', true)).toBe(false);
    expect(isAllowedOrigin('file:///etc/passwd', true)).toBe(false);
    expect(isAllowedOrigin('not a url', true)).toBe(false);
  });
});

describe('outbound request allowlist', () => {
  it('permits the declared API hosts', () => {
    for (const host of NETWORK_ALLOWLIST) {
      expect(isAllowedRequestHost('https://' + host + '/v1/thing')).toBe(true);
    }
  });

  it('permits the app scheme and inline data', () => {
    expect(isAllowedRequestHost('app://predictiq/bundle.web.js')).toBe(true);
    expect(isAllowedRequestHost('data:image/png;base64,AAAA')).toBe(true);
    expect(isAllowedRequestHost('blob:app://predictiq/abc')).toBe(true);
  });

  it('refuses an undeclared host', () => {
    expect(isAllowedRequestHost('https://evil.example/collect')).toBe(false);
    // The globe textures used to be pulled from this CDN on every launch.
    expect(
      isAllowedRequestHost('https://unpkg.com/three-globe/earth.jpg'),
    ).toBe(false);
  });

  it('refuses a lookalike host', () => {
    expect(
      isAllowedRequestHost('https://api.gdeltproject.org.evil.example/'),
    ).toBe(false);
  });

  it('refuses non-web schemes', () => {
    expect(isAllowedRequestHost('file:///etc/passwd')).toBe(false);
    expect(isAllowedRequestHost('ftp://example.com/x')).toBe(false);
  });
});

describe('content security policy', () => {
  it('denies everything by default in both policies', () => {
    expect(PROD_CSP).toContain("default-src 'none'");
    expect(DEV_CSP).toContain("default-src 'none'");
  });

  it('never ships eval or the dev websocket to production', () => {
    expect(PROD_CSP).not.toContain('unsafe-eval');
    expect(PROD_CSP).not.toContain('ws://');
    expect(PROD_CSP).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('blocks framing, plugins, and base-tag rewrites', () => {
    expect(PROD_CSP).toContain("frame-ancestors 'none'");
    expect(PROD_CSP).toContain("object-src 'none'");
    expect(PROD_CSP).toContain("base-uri 'none'");
  });

  it('does not let the renderer reach the provider APIs directly', () => {
    // Provider calls run in the main process precisely so the key never
    // enters the renderer; allowing these in connect-src would undo that.
    expect(PROD_CSP).not.toContain('api.anthropic.com');
    expect(PROD_CSP).not.toContain('api.openai.com');
  });
});

describe('preload contract', () => {
  // The preload runs sandboxed, where require() cannot resolve a relative
  // module, so the channel names are duplicated there literally. This keeps
  // the copy honest.
  const preloadSource = fs.readFileSync(
    path.join(__dirname, '..', 'preload.js'),
    'utf8',
  );

  it('exposes exactly the channels the contract declares', () => {
    const declared = Object.values(CHANNELS).sort();
    const found = Array.from(
      preloadSource.matchAll(/'(predictiq:[a-z:]+)'/g),
    ).map(match => match[1]);

    expect(Array.from(new Set(found)).sort()).toEqual(declared);
  });

  it('never requires a relative module, which a sandboxed preload cannot load', () => {
    expect(preloadSource).not.toMatch(/require\(['"]\.\.?\//);
  });

  it('does not expose a way to read a secret back', () => {
    expect(preloadSource).not.toContain('SECRET_GET');
    expect(preloadSource).not.toMatch(/secrets:\s*\{[^}]*\bget\b/);
  });

  it('does not expose a generic invoke escape hatch', () => {
    expect(preloadSource).not.toMatch(/invoke:\s*\(/);
  });
});

describe('main process configuration', () => {
  const mainSource = fs.readFileSync(
    path.join(__dirname, '..', 'main.js'),
    'utf8',
  );

  it('keeps the renderer sandboxed and isolated', () => {
    expect(mainSource).toMatch(/contextIsolation:\s*true/);
    expect(mainSource).toMatch(/nodeIntegration:\s*false/);
    expect(mainSource).toMatch(/sandbox:\s*true/);
    expect(mainSource).toMatch(/webviewTag:\s*false/);
  });

  it('rejects certificate errors instead of accepting them', () => {
    expect(mainSource).toContain('certificate-error');
    expect(mainSource).toContain('callback(false)');
  });
});
