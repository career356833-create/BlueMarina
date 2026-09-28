# Blue Marina Design System V1

## Direction

Blue Marina uses the existing cinematic home and global header as its brand reference: marine imagery, deep navy, warm gold, generous whitespace, and readable information. Discovery and content pages use a calm paper surface below a compact marine introduction. Maps and navigation retain their interaction-first layouts. The system is incremental; existing data, routes, contracts, and the global header remain intact.

Avoid generic dashboards, neon HUD styling outside navigation, repeated card nesting, gratuitous badges or gradients, fake supply, and oversized landing sections on every route.

## Semantic tokens

The source of truth is `src/app/globals.css` `:root`; `tailwind.config.ts` exposes the same values under `marine.*`. Use tokens instead of new hexadecimal colors in migrated components.

| Role | CSS variable | Usage |
| --- | --- | --- |
| Background | `--bm-background` | Global marine canvas |
| Surface / elevated / muted | `--bm-surface`, `--bm-surface-elevated`, `--bm-surface-muted` | Dark sections and depth |
| Foreground / muted | `--bm-foreground`, `--bm-foreground-muted` | Text on marine surfaces |
| Border | `--bm-border` | Dark surface boundaries |
| Brand / accent | `--bm-brand`, `--bm-brand-accent` | Navy identity and warm gold actions |
| Status | `--bm-success`, `--bm-warning`, `--bm-danger` | Genuine status only |
| Paper / ink | `--bm-paper`, `--bm-paper-elevated`, `--bm-ink`, `--bm-ink-muted`, `--bm-paper-border` | Discovery results and long-form content |
| Radius | `--bm-radius-sm`, `--bm-radius-md`, `--bm-radius-lg` | Inputs, cards, sections |
| Shadow | `--bm-shadow` | Selected elevated surfaces |
| Width | `--bm-content-wide`, `--bm-content-reading` | App frame and reading pages |
| Chrome | `--bm-header-height`, `--bm-bottom-nav-height` | Header relationship and mobile safe area |

Spacing follows an 8px rhythm where practical: 16–24px mobile gutters, 24–32px desktop gutters, 16–24px section gaps, and 44px minimum interactive height. Avoid increasing a page's hero height merely to create visual impact.

## Type hierarchy

| Level | Use |
| --- | --- |
| Display | Cinematic home only; existing hero typography is preserved |
| Page title | One `h1` per page; refined serif on marine hero |
| Section title | `.bm-section-title` on paper, heading semantics retained |
| Card title | Clear sans-serif `h2`/`h3` matching document hierarchy |
| Body | Plain sans-serif, comfortable 1.6–1.8 line height for longer text |
| Small / caption | Supportive metadata; not a replacement for content |
| Data / emphasis | Weight or tabular treatment only when the data warrants it |

## Shell and primitives

`AppFrame` supplies the marine canvas, maximum width, responsive gutters, footer, and BottomNav safe area. Its `family` attribute allows progressive page-family styling without moving business logic into the shell. The global header stays in its existing root position. `BottomNav` retains 홈 / 바다 / 출조 / 어종 / 가이드 and active-route logic while sharing the navy/gold tokens.

`src/components/platform/DesignSystem.tsx` provides `PageHero`, `SectionHeading`, and `EmptyState`. The CSS utilities `.bm-surface-dark`, `.bm-surface-paper`, `.bm-card-paper`, `.bm-input`, `.bm-action`, `.bm-action-secondary`, `.bm-discovery-toolbar`, `.bm-discovery-results`, and `.bm-content-surface` are the first reusable surface/action grammar. Extend these only when a real page need appears; do not make wrappers for every Tailwind class.

## Page families

| Family | Routes and grammar |
| --- | --- |
| Brand | `/`: cinematic video and direct service entry; no dashboard duplication |
| Immersive | `/sea`, `/sea/navigation`, parts of `/today-sea`: map/HUD interactions take precedence; only chrome, panel and type tokens should be adopted later |
| Discovery | `/fishing-spots`, `/fish`, `/charters`, `/market`, `/community`: compact marine introduction, paper search/filter area, clear results or honest empty state |
| Detail | Spot, fish, charter, market, and community detail: source and status first; future phase will align their components |
| Utility / form | Account, onboarding, compose and admin: compact header, focused form fields, direct feedback and a safe exit |
| Content / learning | `/license-guide` and related guides: narrow reading width, semantic sections, restrained cards and source links |

## Responsive and accessibility rules

- At 390px, 44px touch targets, visible focus, no horizontal overflow, and BottomNav clearance take priority. At 768px, avoid awkward single-column stretches. At 1280px and 1440px+, honor content-width limits.
- Keep keyboard focus visible, use semantic links for navigation and buttons for actions, and preserve one `h1`. Do not convey status with color alone.
- Honor reduced-motion preferences and do not place floating UI over essential actions. Immersive map pointer/touch behavior is protected.
- Keep text legible on both marine and paper surfaces; gold is an accent, not body copy. Use fewer badges and nested cards.

## Scope of V1

Representative routes and shared shells are styled; the remaining routes are explicitly classified in `BLUE_MARINA_UI_MIGRATION_MAP_V1.md`. No backend, API, auth, RLS, data, navigation safety or production deployment change belongs to this phase.

Local visual review covered 390px, 768px, 1280px and 1440px widths. At some initial floating-captain positions, the existing widget crosses a page hero title; that separate worktree change remains outside this design-system edit. No standalone Preview deployment or authenticated visual session was performed in V1.
