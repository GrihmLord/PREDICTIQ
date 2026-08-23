# Changelog

All notable changes to PREDICTIQ are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

A hardening and completion pass across the whole application. Several features
that the README described as finished were not reachable at runtime; those are
now implemented rather than removed.

### Fixed — features that did not work

- **Desktop persistence was dead.** `preload.js` called
  `require('electron-store')` inside a sandboxed preload, where `require` is a
  limited polyfill that cannot resolve arbitrary modules. The preload threw,
  `window.electron` was never installed, and every store call silently fell
  back to `localStorage`. Persistence now runs over validated IPC to the main
  process, which owns the store.
- **Storage never detected the desktop.** `storageService` tested
  `'require' in window`, which is always false under context isolation, so the
  desktop path was unreachable even if the bridge had loaded.
- **Export to disk was dead.** The settings screen called `window.require('fs')`,
  which cannot exist under context isolation, so JSON and CSV export always
  reported "Export available on Desktop only". Exports now go through the OS
  save dialog in the main process.
- **CSV export referenced fields that do not exist** (`riskScore`, `experts`)
  and would have thrown had it ever run.
- **Case-sensitive import paths.** `storageService.ts` and the web dashboard
  imported `./PredictionService` while the file is `predictionService.ts`. This
  builds on Windows and fails on Linux and case-sensitive macOS.
- **The project had never been typechecked.** `tsc` reported 60+ errors,
  including a whole screen subtree (`src/screens/`) calling service methods that
  did not exist — `predictionService.getHistoricalData`,
  `.calculateProbability`, `.analyzeFactors`, and `storageService.clearAll`.
  Those methods are now implemented and the tree compiles.
- **The Authentication card rendered unstyled**, referencing nine style keys
  that were never defined.
- **The globe never auto-rotated.** Rotation was configured in a mount effect
  where the ref was still null.
- **The GeoJSON feed query was self-contradictory**
  (`sourcecountry:US minus:sourcecountry:US`), so the globe always drew fallback
  points while labelling them as live GDELT data.
- **A missing article title crashed the feed poll cycle** — `.split()` was
  called directly on `article.title`.
- `disconnect()` left the poll interval reference set, and polling continued
  while the window was hidden.
- `babel.config.js` declared `presets` twice; `ExpertSelector` declared `color`
  twice in one style object.
- Assessment IDs were `Date.now().toString()` and collided when two assessments
  were saved in the same millisecond, which the Instant analysis speed makes
  reachable.

### Security

- **API keys are no longer stored in plaintext.** Keys are encrypted with the OS
  keystore via Electron `safeStorage` and held in the main process. The renderer
  can set, test for, and clear a key, but there is no channel to read one back.
  If the keystore is unavailable, storage is refused rather than downgraded.
- **The IPC surface is allowlisted.** The preload previously exposed
  `store.get/set/delete` over the entire store, so any script injection in the
  renderer could read every key. Keys are now allowlisted and values are
  shape- and size-validated in the main process.
- **Prototype-pollution defence** on every value crossing the IPC boundary and
  on every imported record.
- **Electron hardening**: navigation and redirect guards, `setWindowOpenHandler`
  denying all in-app windows (https links open in the system browser), webview
  attachment denied, all renderer permissions denied, certificate errors
  rejected, single-instance lock, default menu removed, `app.enableSandbox()`.
- **The renderer is served over a custom `app://` scheme** instead of `file://`,
  giving it a real origin and letting the main process set security headers on
  every response.
- **Content Security Policy split by environment.** Production is
  `default-src 'none'` with no `eval`, no inline script, and no dev websocket —
  the previous policy shipped `unsafe-eval`, `unsafe-inline`, and
  `ws://localhost:8080` to users.
- **Outbound network allowlist** enforced in the main process; anything not
  explicitly permitted is cancelled.
- **CSV formula injection** (`=`, `+`, `-`, `@`, leading tab/CR) is neutralised
  on export, and quotes and separators are escaped so a scenario cannot forge
  columns or rows.
- **Import validation.** Imported history was previously accepted if the first
  record had an `id`. Every record is now validated and clamped field by field,
  with a size cap and a record cap, and skipped records are reported.
- **The dev server no longer sends `Access-Control-Allow-Origin: *`** and is
  bound to loopback with an explicit `allowedHosts` list, closing a
  DNS-rebinding path.
- **Globe textures are bundled** rather than fetched from `unpkg.com` on every
  launch, removing a third-party CDN from the startup path of an app that
  claims to work offline.
- CI now runs typecheck, lint, tests, a production build, and a dependency
  audit alongside the existing gitleaks scan.

### Added

- **Real OIDC sign-in.** `AuthService` was a hardcoded fake that granted
  `role: 'ADMIN'` after a 1.5 s timer. It is replaced by OAuth 2.0
  authorization code with PKCE, run in the main process through the system
  browser with a loopback redirect. Tokens go to the OS keystore; the renderer
  receives claims only. With no issuer configured the UI says so rather than
  manufacturing a session.
- **Live provider calls.** The `aiProvider` / `apiKey` / `model` settings had no
  consumer anywhere in the codebase — a stored secret that did nothing. A
  configured provider now adds a written synthesis on top of the council's
  findings, called from the main process. A provider failure degrades the
  assessment to local output instead of failing it.
- **Scenario input on the dashboard.** The "Global Threat Assessment" ran
  against a hardcoded string and ignored the operator entirely.
- **Live round-table transcript**, streamed as each expert node reports.
- **React error boundary**, so one failing panel no longer white-screens the app.
- **Diagnostics panel**: version, runtime, storage backend, and whether OS-backed
  secret encryption is available.
- Test suite covering the analysis engine, expert routing, CSV escaping, import
  validation, feed parsing, and the main-process security boundary — including a
  test that keeps the preload's duplicated channel list in step with the
  contract.
- `npm run typecheck`, `npm run verify`, `npm run test:coverage`,
  `npm run audit:deps`.

### Changed

- **Scoring is deterministic.** Severity, probability, and confidence were drawn
  from `Math.random()`, so the same scenario produced a different DEFCON level on
  every run and a stored assessment could never be re-derived. Scores are now
  seeded from the scenario, the council, and the temperature setting;
  temperature widens the spread rather than introducing true randomness.
- **Expert routing uses real cosine similarity** over term-frequency vectors.
  The previous implementation described itself as cosine similarity while
  counting substring hits, and the `vector` field on every expert was never read.
- **Prediction factors are derived from the council's findings** instead of a
  hardcoded list of three.
- **Retention pruning runs at start-up**, not on every settings write — it
  previously walked the entire history on each keystroke in the settings inputs.
- **Dashboard "Previous Assessments" reads from stored history** instead of two
  hardcoded rows.
- **History domain distribution** is computed from recorded factors rather than
  a substring search over prose the same engine had written.
- Feed requests have timeouts, abort handling, and exponential backoff; the seen
  set is a true LRU; polling pauses while the window is hidden.
- Node's `events` module replaced with a dependency-free typed emitter; it was
  being imported into a web bundle with no webpack fallback entry and resolved
  only by accident through a transitive dependency.
- `alert()` / `confirm()` replaced with in-app notices and a typed confirmation
  dialog.
- Version is injected from `package.json` at build time. The UI previously
  displayed `v1.2.0`, the manifest said `0.0.1`, and the README said `v2.2`.
- Jest no longer uses the React Native preset: nothing under test imports React
  Native, and the preset's module crawl walked `android/`, `ios/`, and an
  unpacked installer in `release/`.

### Removed

- `App.tsx` at the repository root and its snapshot test — the unmodified React
  Native "Welcome" template screen, unreferenced by either entry point.
- `src/sample.ts` — an `add(a, b)` demo that broke `isolatedModules`.
- The `vector: number[]` field on expert definitions, which was never read;
  vectors are now built from the focus keywords at construction.
