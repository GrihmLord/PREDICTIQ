# PREDICTIQ — Desktop Predictive Analytics Platform

![Platform](https://img.shields.io/badge/platform-desktop%20%7C%20web-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

PREDICTIQ is an offline-first desktop console for multi-domain risk assessment,
built with **Electron** and **React Native Web**. You describe a scenario, pick a
council of domain experts, and the engine scores it across their domains and
synthesises a DEFCON level with a full transcript of how it got there.

Assessments are **reproducible**: the same scenario, council, and engine settings
always produce the same result, so a stored assessment can be re-derived and
defended rather than merely re-run.

## ✨ Features

- **🖥️ Desktop first** — Electron shell with a hardened, sandboxed renderer.
- **🧠 Council of experts** — six domain specialists (Geopolitical, Cyber,
  Bio-Security, AI Safety, Orbital, Quantum) routed by cosine similarity over
  the scenario text.
- **🔁 Deterministic scoring** — seeded from the inputs; the *Variance*
  setting widens the spread without making results unrepeatable.
- **🛡️ DEFCON synthesis** — round-table protocol with a live transcript.
- **📡 Live intelligence** — GDELT news feed with an explicitly-labelled
  simulation fallback when the network is unavailable.
- **🌍 3D war room** — WebGL globe over GDELT geographic data, textures bundled
  locally so the app never phones a CDN.
- **📊 Interactive charts** — trend, domain distribution, and expert activation.
- **📑 Enterprise reporting** — PDF audit logs and PPTX briefing decks through
  the OS save dialog.
- **💾 Local persistence** — `electron-store` behind a validated IPC boundary,
  with retention policy and JSON import/export.
- **🔐 Secrets in the OS keystore** — API keys encrypted via `safeStorage`;
  never readable from the interface.
- **🏢 Real enterprise sign-in** — OAuth 2.0 + PKCE against your own OIDC
  provider, through the system browser.

## 🏗️ Architecture

The security boundary is the process boundary. The renderer displays untrusted
content (live headlines, imported files) and therefore holds no secrets, has no
filesystem access, and can reach exactly one external host.

```text
PREDICTIQ/
├── electron/                 # Main process — the trusted side
│   ├── main.js               # Window lifecycle and hardening
│   ├── preload.js            # The only bridge; named channels, no generic invoke
│   └── lib/
│       ├── contract.js       # Channel + key allowlists (single source of truth)
│       ├── validate.js       # Shape, size, prototype-pollution checks
│       ├── security.js       # CSP, navigation guards, app:// protocol, net allowlist
│       ├── store.js          # electron-store adapter
│       ├── secrets.js        # safeStorage; read() is never wired to IPC
│       ├── ipc.js            # Handler registration
│       ├── ai.js             # Provider calls (keys never leave this process)
│       └── oidc.js           # OAuth 2.0 authorization code + PKCE
├── src/                      # Renderer — the untrusted side
│   ├── lib/                  # Pure logic: rng, vector, csv, validation, scoring
│   ├── services/             # Engine, storage, feed, reports, bridge façade
│   ├── screens_web/          # Desktop screens
│   ├── components/           # Charts, globe, ticker, error boundary
│   └── App.tsx               # Shell and bootstrap
└── .github/workflows/        # typecheck · lint · test · build · audit · gitleaks
```

## 🚀 Getting started

### Prerequisites

- Node.js >= 18
- Windows, macOS, or Linux

### Installation

```bash
git clone https://github.com/GrihmLord/PREDICTIQ.git
cd PREDICTIQ
npm install
```

### Running

```bash
npm run electron:dev     # dev with hot reload
npm run electron:build   # production build + installer
```

### Verifying

```bash
npm run verify           # typecheck, lint, and tests
npm run test:coverage
npm run audit:deps
```

## ⚙️ Configuration

### Enterprise sign-in (optional)

Sign-in is inert until you point it at an identity provider. Set these before
launching; with no issuer configured the Settings screen reports
**NOT CONFIGURED** rather than offering a login that does nothing.

| Variable | Required | Notes |
| --- | --- | --- |
| `PREDICTIQ_OIDC_ISSUER` | yes | Must be `https`. e.g. `https://login.microsoftonline.com/<tenant>/v2.0` |
| `PREDICTIQ_OIDC_CLIENT_ID` | yes | A **public** client — no secret is used or stored |
| `PREDICTIQ_OIDC_SCOPES` | no | Defaults to `openid profile email` |

Register `http://127.0.0.1/callback` as a loopback redirect URI. The port is
chosen at runtime; most providers ignore the port for loopback redirects, as
RFC 8252 requires.

The role shown in the UI comes from the provider's `roles`, `role`, or `groups`
claim. PREDICTIQ never invents one.

### Analysis provider (optional)

Under **Settings → Connectivity**, choose `OpenAI` or `Anthropic` and save a key.
The key is encrypted by the OS keystore and used only inside the main process;
it cannot be read back into the interface, so it is not displayable after
saving. A configured provider adds a written synthesis on top of the local
council output — if the call fails, the assessment still completes locally.

Provider configuration requires the desktop app. The browser build has no OS
keystore, so it declines to store credentials rather than holding them in
plaintext.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for the full model and reporting process.

- **Context isolation, sandbox, no node integration, no webviews** in the renderer.
- **Allowlisted IPC** — named channels only; no generic `invoke`. Store keys and
  secret names are allowlisted, and values are shape- and size-validated.
- **Write-only secrets** — the renderer can set or clear a key, never read one.
- **`default-src 'none'` CSP** in production, with no `eval` and no inline
  script; set both as a response header by the main process and as a meta tag.
- **Outbound allowlist** — `api.gdeltproject.org` from the renderer;
  `api.anthropic.com` / `api.openai.com` from the main process only.
- **Custom `app://` scheme** instead of `file://`, giving the renderer a real
  origin and letting the main process set headers on every response.
- **CSV formula-injection neutralisation** on export; strict per-field
  validation on import.

## 🗺️ Roadmap

### ✅ Completed

- **v1.0 — Core platform**: Electron shell, probability gauge, local persistence,
  trend charts.
- **v1.2 — Global risk**: mixture-of-experts council, vector routing, round-table
  consensus, attention visualisation.
- **v1.3 — Deep control**: configurable sensitivity, variance, and pacing;
  retention policy, import/export, full wipe.
- **v2.1 — Reporting & feeds**: PDF/PPTX pipeline, white-label theming, live
  GDELT feed.
- **v2.2 — Geospatial**: 3D globe with volumetric conflict intensity.
- **v2.3 — Hardening & completion**: real OIDC sign-in, live provider calls with
  OS-keystore credentials, deterministic scoring, allowlisted IPC, CSP and
  navigation hardening, validated import/export, and a test suite. See
  [CHANGELOG.md](CHANGELOG.md).

### 🚧 Planned

- Team collaboration and cloud sync.
- Scheduled unattended assessments.
- Signed installers for macOS and Linux.

## 🎨 Design system

| Element | Colour | Hex |
| --- | --- | --- |
| Background | Slate | `#0F172A` |
| Surface | Dark Slate | `#1E293B` |
| Primary | Indigo | `#6366F1` |
| Success | Emerald | `#10B981` |
| Warning | Amber | `#F59E0B` |
| Danger | Red | `#EF4444` |

The primary accent is user-configurable under **Settings → Enterprise Branding**;
values are validated as hex colours before reaching the stylesheet.

## 📦 Key technologies

Electron · React Native Web · TypeScript · Recharts · three.js / react-globe.gl ·
electron-store · jsPDF · PptxGenJS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run `npm run verify` — typecheck, lint, and tests must pass
4. Commit your changes
5. Open a Pull Request

## 📄 License

MIT — see [LICENSE](LICENSE).
