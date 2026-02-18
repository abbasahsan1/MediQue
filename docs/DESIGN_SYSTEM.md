# MediQue Design Language

## 1) Semantic Color Roles
All color usage must map to semantic roles. Direct hex usage in components is disallowed.

- `primary`: Primary action emphasis and key active indicators
- `secondary`: Secondary text and low-priority emphasis
- `surface` / `surface-muted`: Card and section containers
- `accent`: Supplemental positive emphasis
- `destructive`: Critical errors and irreversible actions
- `warning`: Caution and near-threshold states
- `success`: Successful workflows and confirmations
- `info`: Informational alerts and neutral highlights
- `muted` / `muted-foreground`: Passive surfaces and helper text
- `border` / `ring`: Structure and focus states

Department colors are treated as semantic data-visualization tokens:
- `dept-general`, `dept-ent`, `dept-orthopedics`, `dept-dental`, `dept-cardiology`

## 2) Light/Dark Theme Policy
- Light and dark palettes are defined in the global token layer (`styles.css`).
- Theme is class-driven (`.dark`) and persisted in local storage (`medique_theme`).
- Components consume semantic classes (e.g., `bg-surface`, `text-foreground`) for parity.
- No component-level ad hoc dark overrides should be introduced.

## 3) Typography System
- Typeface: `IBM Plex Sans` with system fallbacks.
- Hierarchy:
  - `h1` / `h2` / `h3` for section structure
  - body text uses semantic foreground tiers (`foreground`, `secondary`, `muted-foreground`)
  - badges/captions use uppercase micro labels sparingly for metadata
- Weight discipline:
  - 700 for major headings
  - 600 for section labels and key values
  - 400/500 for body and helper content

## 4) Spacing Rhythm
- Use token-aligned spacing only (`4, 8, 12, 16, 20, 24, 32, 40px` rhythm via Tailwind/utilities).
- Avoid arbitrary margins/padding and one-off spacing values.
- Maintain vertical rhythm by grouping content with predictable `space-y-*` blocks.

## 5) Radius + Elevation
- Radius scale:
  - `sm`: controls, pills
  - `md`: inputs/buttons/chips
  - `lg`/`xl`: cards and containers
- Shadows are limited to two levels (`--shadow-1`, `--shadow-2`).
- Avoid decorative gradients and heavy glow effects.

## 6) Interaction & Motion
- Motion is functional only: state transition, confirmation, hierarchy change.
- Timing/easing tokens:
  - fast: `140ms`
  - base: `220ms`
  - slow: `320ms`
  - easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Respect `prefers-reduced-motion` and avoid layout shift during transitions.

## 7) Component Identity Rules
- Pills/badges indicate state (`primary`, `success`, `warning`, `destructive`, `neutral`), never decoration.
- Icon set is unified (`lucide-react`) with consistent stroke and context-driven usage.
- Page shells (`sidebar`, `header`, `content`, `cards`) follow one structural grid across all views.
