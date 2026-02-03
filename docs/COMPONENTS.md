# PREDICTIQ Component Library

## Core Components

### DashboardCard

KPI display card with title, value, and optional trend indicator.

```tsx
<DashboardCard
  title="Success Rate"
  value="72%"
  trend="up"
  trendValue="5%"
/>
```

| Prop | Type | Description |
|------|------|-------------|
| title | string | Card header |
| value | string/number | Main display value |
| trend? | 'up'/'down'/'flat' | Trend direction |
| trendValue? | string | Trend percentage |

---

### ProbabilityGauge

Circular gauge for probability display with semantic coloring.

```tsx
<ProbabilityGauge
  probability={75}
  size={200}
  label="Success Probability"
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| probability | number | - | 0-100 percentage |
| size? | number | 160 | Gauge diameter |
| label? | string | "Success Probability" | Bottom label |

**Color Mapping:**
- 70-100%: Green (High)
- 40-69%: Amber (Moderate)  
- 0-39%: Red (Low)

---

### ScenarioCard

Clickable card for scenario summaries in lists.

```tsx
<ScenarioCard
  id="scenario_123"
  title="Product Launch"
  probability={85}
  category="Business"
  createdAt="2024-01-15"
  onPress={() => navigate('Results')}
/>
```

---

### Button

Multi-variant button component.

```tsx
<Button
  title="Calculate"
  onPress={handleSubmit}
  variant="primary"
  size="large"
  loading={isSubmitting}
/>
```

| Variant | Use Case |
|---------|----------|
| primary | Main CTAs |
| secondary | Alternative actions |
| outline | Secondary emphasis |
| ghost | Tertiary/links |

## Design Tokens

### Colors

Import: `import { colors } from '../styles'`

- `colors.primary.main` - Brand color
- `colors.success.high` - Positive indicators
- `colors.warning.high` - Caution indicators
- `colors.danger.high` - Negative indicators

### Spacing

9-level scale: xs(4), sm(8), md(12), lg(16), xl(20), 2xl(24), 3xl(32), 4xl(40), 5xl(48)

### Typography

```ts
typography.fontSize.xs   // 12px
typography.fontSize.sm   // 14px
typography.fontSize.md   // 16px (base)
typography.fontSize.lg   // 18px
typography.fontSize.xl   // 20px
typography.fontSize['2xl'] // 24px
```
