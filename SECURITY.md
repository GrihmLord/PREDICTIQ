# Security Policy

## Reporting a vulnerability

Report security issues privately through
[GitHub Security Advisories](https://github.com/GrihmLord/PREDICTIQ/security/advisories/new)
for this repository. Please do **not** open a public issue for a suspected
vulnerability.

Include, where you can: affected version, reproduction steps, and the impact you
believe the issue has. You should get an acknowledgement within 5 working days
and an assessment within 15. If a fix is warranted, we will agree a disclosure
timeline with you before publishing.

## Supported versions

Only the latest release on `master` receives security fixes. This project has
not yet reached 1.0; there are no maintained release branches.

## Security model

PREDICTIQ is an offline-first desktop application. It is designed so that the
renderer — the part that displays untrusted content such as live news headlines
and imported files — holds no secrets and has no filesystem or network reach
beyond one allowlisted API.

### Process boundary

| Capability | Where it lives | Why |
| --- | --- | --- |
| API keys, OAuth tokens | Main process, OS keystore | The renderer can set and clear them but has no channel to read one back. |
| Provider API calls | Main process | Keeps the key out of the renderer entirely; the renderer sends a prompt and receives text. |
| Filesystem writes | Main process, via the OS save dialog | The user chooses every path; the renderer never names one. |
| Persistent storage | Main process | Keys are allowlisted and values are shape- and size-validated before they are written. |

The renderer runs with `contextIsolation: true`, `sandbox: true`,
`nodeIntegration: false`, and `webviewTag: false`. The preload script exposes a
fixed set of named functions over specific IPC channels — there is no generic
`invoke`, so the renderer cannot reach a channel that was not deliberately
published.

### Secrets at rest

Secrets are encrypted with the platform keystore through Electron's
`safeStorage` (DPAPI on Windows, Keychain on macOS, libsecret on Linux) and
stored as ciphertext. If the OS keystore is unavailable, PREDICTIQ **refuses to
store the secret** rather than falling back to plaintext.

The browser build has no keystore, so provider credentials cannot be configured
there at all. This is a deliberate limitation, not an oversight.

### Network

Outbound requests are restricted by an allowlist enforced in the main process:

- `api.gdeltproject.org` — the live intelligence feed (renderer)
- `api.anthropic.com`, `api.openai.com` — provider calls (main process only)

Everything else is cancelled before it leaves the machine. The renderer's
Content Security Policy denies by default and permits neither `eval` nor remote
script in production builds. Map textures are bundled with the application; the
app makes no CDN requests at runtime.

### Data handling

All analysis data stays on the machine. Nothing is transmitted unless you
explicitly configure a provider, and then only the prompt built from your own
scenario and the council's findings.

- Imported files are validated field by field; records that do not match the
  expected shape are dropped and reported rather than stored.
- Exported CSV neutralises spreadsheet formula injection.
- The retention policy prunes stored assessments on start-up; "Wipe Data"
  removes stored assessments, and a full reset also clears stored secrets.

## Reporting scope

In scope: the Electron main process, the preload bridge, the IPC surface,
storage and secret handling, feed parsing, import validation, and export
generation.

Out of scope: findings that require an attacker to already have code execution
as the logged-in user, and issues in third-party dependencies without a
demonstrated exploit path through PREDICTIQ.

## Disclaimer

This software is provided "as is", without warranty of any kind, express or
implied. See [LICENSE](LICENSE).
