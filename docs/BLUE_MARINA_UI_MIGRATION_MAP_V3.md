# Blue Marina UI Migration Map V3

The 63 page templates are reconciled against V2. All eleven remaining public templates now use the shared V1/V2 visual grammar. This classification describes visual migration, not backend availability, account verification, or source freshness.

| Status | V2 | V3 |
| --- | ---: | ---: |
| `MIGRATED` | 27 | 38 |
| `SHARED_SHELL_MIGRATED` | 6 | 6 |
| `IMMERSIVE_EXCEPTION` | 3 | 3 |
| `ADMIN_PRIVATE` | 16 | 16 |
| `REMAINING` | 11 | 0 |
| **Total** | **63** | **63** |

## Final eleven public templates

| Route | Family | V2 issue | Reused V1/V2 components |
| --- | --- | --- | --- |
| `/boatpedia` | Discovery | Old cobalt hero and white search/results cards | AppFrame, V1 semantic hero/surface |
| `/coming-soon` | Unavailable | Generic white placeholder | DetailFrame, StatusNotice |
| `/contact` | Document | Generic white contact card | DetailFrame, PageBackButton |
| `/dictionary` | Discovery | Old white dictionary panels and undersized filters | AppFrame, V1 semantic hero/surface |
| `/faq` | Discovery | Old white FAQ panels and filters | AppFrame, V1 semantic hero/surface |
| `/fishing-safety` | Content | Old blue/white safety cards | AppFrame, V1 semantic hero/surface |
| `/fishing-spots/conditions` | Evidence | Wide legacy content wrapper | AppFrame content family |
| `/marine-knowledge` | Discovery | Old white knowledge panels | AppFrame, V1 semantic hero/surface |
| `/privacy` | Legal | Detached legal card alignment | DetailFrame, PageBackButton |
| `/sea-info` | Content | Old blue/white marine data panels | AppFrame, V1 semantic hero/surface |
| `/terms` | Legal | Detached legal card alignment | DetailFrame, PageBackButton |

## Full route reconciliation

| Route template | V3 status | Family / scope |
| --- | --- | --- |
| `/` | `MIGRATED` | Existing / pending |
| `/account` | `MIGRATED` | Existing / pending |
| `/account/activity` | `ADMIN_PRIVATE` | Form / utility |
| `/account/auth/complete` | `ADMIN_PRIVATE` | Private / admin |
| `/account/login` | `ADMIN_PRIVATE` | Form / utility |
| `/account/profile` | `ADMIN_PRIVATE` | Form / utility |
| `/account/saved` | `ADMIN_PRIVATE` | Form / utility |
| `/admin/operations` | `ADMIN_PRIVATE` | Private / admin |
| `/analysis` | `MIGRATED` | Learning |
| `/boatpedia` | `MIGRATED` | Discovery |
| `/centers` | `SHARED_SHELL_MIGRATED` | Learning |
| `/centers/map-test` | `ADMIN_PRIVATE` | Private / admin |
| `/charters` | `MIGRATED` | Existing / pending |
| `/charters/[id]` | `MIGRATED` | Detail |
| `/charters/admin/submissions` | `ADMIN_PRIVATE` | Private / admin |
| `/charters/admin/submissions/[id]` | `ADMIN_PRIVATE` | Private / admin |
| `/charters/onboarding` | `ADMIN_PRIVATE` | Form / utility |
| `/charters/partners` | `MIGRATED` | Form / utility |
| `/coming-soon` | `MIGRATED` | Unavailable |
| `/community` | `MIGRATED` | Existing / pending |
| `/community/[id]` | `MIGRATED` | Detail |
| `/community/new` | `ADMIN_PRIVATE` | Form / utility |
| `/contact` | `MIGRATED` | Document |
| `/dev-audit` | `ADMIN_PRIVATE` | Private / admin |
| `/dictionary` | `MIGRATED` | Discovery |
| `/exam` | `MIGRATED` | Learning |
| `/exam-guide` | `SHARED_SHELL_MIGRATED` | Learning |
| `/faq` | `MIGRATED` | Discovery |
| `/fish` | `MIGRATED` | Existing / pending |
| `/fishing-safety` | `MIGRATED` | Content |
| `/fishing-spots` | `MIGRATED` | Existing / pending |
| `/fishing-spots/[id]` | `MIGRATED` | Detail |
| `/fishing-spots/conditions` | `MIGRATED` | Evidence |
| `/leisure-report` | `SHARED_SHELL_MIGRATED` | Learning |
| `/license-guide` | `MIGRATED` | Existing / pending |
| `/license-issue` | `SHARED_SHELL_MIGRATED` | Learning |
| `/marine-knowledge` | `MIGRATED` | Discovery |
| `/market` | `MIGRATED` | Existing / pending |
| `/market/[id]` | `MIGRATED` | Detail |
| `/market/admin/listings` | `ADMIN_PRIVATE` | Private / admin |
| `/market/admin/listings/[id]` | `ADMIN_PRIVATE` | Private / admin |
| `/market/new` | `ADMIN_PRIVATE` | Form / utility |
| `/official-links` | `SHARED_SHELL_MIGRATED` | Learning |
| `/past` | `MIGRATED` | Learning |
| `/practice` | `MIGRATED` | Learning |
| `/practice/checklist` | `MIGRATED` | Learning |
| `/practice/course` | `MIGRATED` | Learning |
| `/practice/fail-items` | `MIGRATED` | Learning |
| `/practice/videos` | `MIGRATED` | Learning |
| `/privacy` | `MIGRATED` | Legal |
| `/progress` | `MIGRATED` | Learning |
| `/random` | `MIGRATED` | Learning |
| `/reservations` | `ADMIN_PRIVATE` | Private / admin |
| `/safety-guide` | `SHARED_SHELL_MIGRATED` | Learning |
| `/sea` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/sea-info` | `MIGRATED` | Content |
| `/sea/navigation` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/study` | `MIGRATED` | Learning |
| `/terms` | `MIGRATED` | Legal |
| `/theory` | `MIGRATED` | Learning |
| `/theory/[tag]` | `MIGRATED` | Learning |
| `/today-sea` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/wrong` | `MIGRATED` | Learning |

Immersive `/today-sea`, `/sea`, and `/sea/navigation` retain their separate map/navigation composition. The 16 admin/private templates retain their access classifications even when a form family wrapper is present. No new route or production data is introduced. Authenticated Account and independent Preview visual QA are evidence-dependent checks, not implied by this route inventory.
