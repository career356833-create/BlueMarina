# Blue Marina UI Migration Map V1

The inventory comes from all `src/app/**/page.tsx` route templates at this revision, including seven dynamic route templates. The 63 templates are distinct from 1,424 sitemap URLs (1,405 generated spot URLs plus 19 static routes). Status describes UI migration scope, not route availability or backend readiness.

| Status | Meaning |
| --- | --- |
| `MIGRATED` | V1 representative page and its main visual grammar were updated |
| `READY_BY_SHARED_SHELL` | Shared PortalShell updated; page-specific body still needs review |
| `NEEDS_PAGE_WORK` | Existing route preserved; local body/detail styling awaits migration |
| `IMMERSIVE_EXCEPTION` | Preserve map/HUD interaction; token adoption requires focused later pass |
| `ADMIN/PRIVATE` | Account, admin, compose, onboarding or diagnostic route; private utility review is separate |

## Counts

- MIGRATED: 8
- READY_BY_SHARED_SHELL: 6
- NEEDS_PAGE_WORK: 30
- IMMERSIVE_EXCEPTION: 3
- ADMIN/PRIVATE: 16
- Total: 63

## Route-by-route inventory

| Route template | Status |
| --- | --- |
| `/` | `MIGRATED` |
| `/account` | `MIGRATED` |
| `/account/activity` | `ADMIN/PRIVATE` |
| `/account/auth/complete` | `ADMIN/PRIVATE` |
| `/account/login` | `ADMIN/PRIVATE` |
| `/account/profile` | `ADMIN/PRIVATE` |
| `/account/saved` | `ADMIN/PRIVATE` |
| `/admin/operations` | `ADMIN/PRIVATE` |
| `/analysis` | `NEEDS_PAGE_WORK` |
| `/boatpedia` | `NEEDS_PAGE_WORK` |
| `/centers` | `READY_BY_SHARED_SHELL` |
| `/centers/map-test` | `ADMIN/PRIVATE` |
| `/charters` | `MIGRATED` |
| `/charters/[id]` | `NEEDS_PAGE_WORK` |
| `/charters/admin/submissions` | `ADMIN/PRIVATE` |
| `/charters/admin/submissions/[id]` | `ADMIN/PRIVATE` |
| `/charters/onboarding` | `ADMIN/PRIVATE` |
| `/charters/partners` | `NEEDS_PAGE_WORK` |
| `/coming-soon` | `NEEDS_PAGE_WORK` |
| `/community` | `MIGRATED` |
| `/community/[id]` | `NEEDS_PAGE_WORK` |
| `/community/new` | `ADMIN/PRIVATE` |
| `/contact` | `NEEDS_PAGE_WORK` |
| `/dev-audit` | `ADMIN/PRIVATE` |
| `/dictionary` | `NEEDS_PAGE_WORK` |
| `/exam` | `NEEDS_PAGE_WORK` |
| `/exam-guide` | `READY_BY_SHARED_SHELL` |
| `/faq` | `NEEDS_PAGE_WORK` |
| `/fish` | `MIGRATED` |
| `/fishing-safety` | `NEEDS_PAGE_WORK` |
| `/fishing-spots` | `MIGRATED` |
| `/fishing-spots/[id]` | `NEEDS_PAGE_WORK` |
| `/fishing-spots/conditions` | `NEEDS_PAGE_WORK` |
| `/leisure-report` | `READY_BY_SHARED_SHELL` |
| `/license-guide` | `MIGRATED` |
| `/license-issue` | `READY_BY_SHARED_SHELL` |
| `/marine-knowledge` | `NEEDS_PAGE_WORK` |
| `/market` | `MIGRATED` |
| `/market/[id]` | `NEEDS_PAGE_WORK` |
| `/market/admin/listings` | `ADMIN/PRIVATE` |
| `/market/admin/listings/[id]` | `ADMIN/PRIVATE` |
| `/market/new` | `ADMIN/PRIVATE` |
| `/official-links` | `READY_BY_SHARED_SHELL` |
| `/past` | `NEEDS_PAGE_WORK` |
| `/practice` | `NEEDS_PAGE_WORK` |
| `/practice/checklist` | `NEEDS_PAGE_WORK` |
| `/practice/course` | `NEEDS_PAGE_WORK` |
| `/practice/fail-items` | `NEEDS_PAGE_WORK` |
| `/practice/videos` | `NEEDS_PAGE_WORK` |
| `/privacy` | `NEEDS_PAGE_WORK` |
| `/progress` | `NEEDS_PAGE_WORK` |
| `/random` | `NEEDS_PAGE_WORK` |
| `/reservations` | `ADMIN/PRIVATE` |
| `/safety-guide` | `READY_BY_SHARED_SHELL` |
| `/sea` | `IMMERSIVE_EXCEPTION` |
| `/sea-info` | `NEEDS_PAGE_WORK` |
| `/sea/navigation` | `IMMERSIVE_EXCEPTION` |
| `/study` | `NEEDS_PAGE_WORK` |
| `/terms` | `NEEDS_PAGE_WORK` |
| `/theory` | `NEEDS_PAGE_WORK` |
| `/theory/[tag]` | `NEEDS_PAGE_WORK` |
| `/today-sea` | `IMMERSIVE_EXCEPTION` |
| `/wrong` | `NEEDS_PAGE_WORK` |

## Next visual passes

1. Detail family: spot, fish, charter, market and community detail pages.
2. Remaining learning/study pages that do not use PortalShell. PortalShell is used by seven pages total: the migrated `/license-guide` and six shared-shell siblings.
3. Utility/form and admin routes, with auth and moderation behavior unchanged.
4. Immersive panels only after map drag, zoom, HUD and BottomNav interaction checks.

The current phase intentionally does not claim that all 63 templates have been redesigned.
