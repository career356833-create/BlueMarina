# Blue Marina Mobile Navigation HUD Overlap Fix V1

Decision: MOBILE_HUD_OVERLAP_FIXED_WITH_LIMITATIONS

## Root cause

At production 390×844, the HUD button occupied x304.95–378, y76–120, while MapLibre zoom/compass occupied x351–380, y74–161. The layer toggle occupied x334–378, y128–172. Both absolute controls at right: 12px covered the unchanged MapLibre top-right rail.

## Minimal layout fix

Below the existing `sm` breakpoint (640px), HUD and layer controls use right `calc(3.5rem + env(safe-area-inset-right))`, leaving a 17px gap from the MapLibre rail at the default safe inset. HUD top uses `max(0.75rem, env(safe-area-inset-top))`; layer top is that inset plus 3.25rem. The expanded layer panel starts below both buttons at inset plus 6.75rem and also reserves the map rail. The destination title width reserves the same control zone.

At `sm` and above, the original HUD, title and layer panel positions remain unchanged. No navigation computation, map provider, destination adapter, preference or safety logic changed. The full-screen navigation route has no BottomNav; bottom telemetry and warning placement remain unchanged. The existing CSS `env(safe-area-inset-*)` pattern is reused instead of relying solely on pixel offsets.

HUD instrument graphics remain transparent and `pointer-events-none`. Only interactive buttons explicitly use `pointer-events-auto`. Buttons retain labels/pressed/expanded semantics, have 44px minimum targets and visible keyboard focus outlines.

## Verification

- Production reproduced before editing; local actual MapLibre browser checked at 360/390/430×844.
- HUD/map rail, layer/map rail, HUD/layer and expanded panel/control intersections: zero on all three mobile widths.
- 390px: HUD x260.95–334, layer x290–334, map rail x351–380. All controls are visible.
- Drag and zoom-button clicks changed the rendered map; emulated two-finger pinch changed the map. Map click selected a destination; touch events were also exercised. HUD on/off and layer open/close worked. Real-device touch/GPS was not tested.
- Transparent instrument layer remained `pointer-events:none`; no horizontal document overflow or uncaught page exceptions.
- Screenshots inspected: local temporary `hud-before.png`, `hud-after.png`, `hud-fixed-360.png`, `hud-fixed-390.png`, `hud-fixed-430.png`, `hud-fixed-1280.png` under the current user's Temp directory. These are local session evidence, not repository assets.
- 1280×900 preserves the original desktop placement. Its pre-existing HUD/map-control overlap remains; this mobile-only change does not claim to fix desktop.
- Optional navigation-aid/warning source requests returned 502 in the local environment. They were not modified; these are distinct from page JavaScript exceptions.
- Targeted 6/6; full suite 1153/1153. Typecheck/lint/build/diff results are recorded in the report.

## Boundaries

Safe-route, land/reef/depth avoidance inference: zero. Navigation Core changes: zero. No Conditions, 404, CSP, DB or backend work. Previous Conditions report/docs and all unrelated worktree changes are excluded from this fix. Production re-deployment/re-verification is not claimed by this local verification record.
