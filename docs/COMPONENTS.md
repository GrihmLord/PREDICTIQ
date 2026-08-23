# PREDICTIQ Components

Reference for the reusable pieces of the renderer. Everything here is a
functional component with hooks; styling comes from `src/styles`.

## Shell

### `ErrorBoundary`

Catches render-time failures so one bad panel cannot leave a blank window.
Renders the message, a **Try again** control that resets its own state, and the
component stack for diagnosis.

```tsx
<ErrorBoundary label="Dashboard">
  <DashboardScreen onNavigate={setTab} />
</ErrorBoundary>
```

`App.tsx` keys the boundary on the active tab, so switching tabs clears a
tripped boundary rather than stranding the operator on the error state.

| Prop | Type | Notes |
| --- | --- | --- |
| `children` | `ReactNode` | The subtree to protect |
| `label` | `string?` | Named in the heading, e.g. "Dashboard stopped responding" |

## Risk display

### `DefconStatus`

The five-level DEFCON banner with the consensus line. Pulses at levels 1–2.

| Prop | Type | Notes |
| --- | --- | --- |
| `level` | `1 \| 2 \| 3 \| 4 \| 5` | 1 is most severe |
| `description` | `string?` | Consensus text; falls back to an awaiting-assessment message |

### `ExpertSelector`

Grid of selectable council members. The dashboard enforces a 3–5 quorum.

| Prop | Type |
| --- | --- |
| `experts` | `ExpertDefinition[]` |
| `selectedIds` | `string[]` |
| `onToggle` | `(id: string) => void` |

### `ExpertActivationChart`

Per-expert severity after an assessment. Renders a waiting state when empty.

| Prop | Type |
| --- | --- |
| `data` | `{name: string; severity: number; domain: string}[]` |

### `ProbabilityGauge`

Circular gauge for the guided builder's **success** probability, where higher is
better. Do not use it for `PredictionResult.probability`, which is a *threat*
probability with the opposite polarity.

## Intelligence

### `NewsTicker`

Single-line rolling headline from `feedService`, rotating every 6 seconds. A
`CRITICAL` item interrupts the rotation immediately. The badge reads **LIVE
WIRE** or **SIMULATION** — the fallback is always labelled as such rather than
being passed off as live data.

Takes no props; it subscribes to the feed itself and unsubscribes on unmount.

### `GlobeCard`

WebGL globe over GDELT geographic data, with conflict intensity as hex-bin
altitude. The earth texture is bundled at `public/assets/globe/`; the component
makes no CDN request. Width is measured from its own container via `onLayout`,
and auto-rotation honours the **Reduced Motion** setting.

## Charts

| Component | Input | Purpose |
| --- | --- | --- |
| `SeverityTrendChart` | `{date, severity}[]` | DEFCON over time |
| `DomainDistributionChart` | `{name, count}[]` | Findings per risk domain |
| `TrendChart` | — | Market trend visual |

## Primitives

| Component | Notes |
| --- | --- |
| `DashboardCard` | Titled surface for a metric or panel |
| `ScenarioCard` | Summary row for a stored scenario |
| `Button` | Themed pressable with variants |

## Conventions

- **Colours** come from `src/styles/colors`; on web these resolve through CSS
  custom properties so enterprise branding applies live. Brand values are
  validated as hex before they reach the stylesheet.
- **Interactive elements** carry `accessibilityRole` and, where selection state
  matters, `accessibilityState`.
- **No `alert()` or `confirm()`** — user feedback uses in-app notices and modal
  confirmations, which work identically in Electron and the browser.
