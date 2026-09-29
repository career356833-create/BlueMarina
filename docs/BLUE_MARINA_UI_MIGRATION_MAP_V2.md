# Blue Marina UI Migration Map V2

This inventory tracks the same 63 `src/app/**/page.tsx` templates as V1. Status measures visual migration only; it does not assert backend availability or production data.

| Status | V1 | V2 |
| --- | ---: | ---: |
| `MIGRATED` | 8 | 27 |
| `SHARED_SHELL_MIGRATED` | 6 | 6 |
| `REMAINING` | 30 | 11 |
| `IMMERSIVE_EXCEPTION` | 3 | 3 |
| `ADMIN_PRIVATE` | 16 | 16 |
| **Total** | **63** | **63** |

The 19 public page templates moved from `NEEDS_PAGE_WORK` into `MIGRATED`: four detail, fourteen learning, and the Charter partner guide. Seven form/utility routes gained `FormFrame`; six remain classified `ADMIN_PRIVATE` because their access or compose boundary remains private. `/account/login` is the seventh private form route and retains its V1 utility shell with V2 focus rules. The six PortalShell pages retain their shared-shell classification. No `/fish/[id]` route exists; V2 did not create one.

| Route template | V2 status | Family / scope |
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
| `/boatpedia` | `REMAINING` | Existing / pending |
| `/centers` | `SHARED_SHELL_MIGRATED` | Learning |
| `/centers/map-test` | `ADMIN_PRIVATE` | Private / admin |
| `/charters` | `MIGRATED` | Existing / pending |
| `/charters/[id]` | `MIGRATED` | Detail |
| `/charters/admin/submissions` | `ADMIN_PRIVATE` | Private / admin |
| `/charters/admin/submissions/[id]` | `ADMIN_PRIVATE` | Private / admin |
| `/charters/onboarding` | `ADMIN_PRIVATE` | Form / utility |
| `/charters/partners` | `MIGRATED` | Form / utility |
| `/coming-soon` | `REMAINING` | Existing / pending |
| `/community` | `MIGRATED` | Existing / pending |
| `/community/[id]` | `MIGRATED` | Detail |
| `/community/new` | `ADMIN_PRIVATE` | Form / utility |
| `/contact` | `REMAINING` | Existing / pending |
| `/dev-audit` | `ADMIN_PRIVATE` | Private / admin |
| `/dictionary` | `REMAINING` | Existing / pending |
| `/exam` | `MIGRATED` | Learning |
| `/exam-guide` | `SHARED_SHELL_MIGRATED` | Learning |
| `/faq` | `REMAINING` | Existing / pending |
| `/fish` | `MIGRATED` | Existing / pending |
| `/fishing-safety` | `REMAINING` | Existing / pending |
| `/fishing-spots` | `MIGRATED` | Existing / pending |
| `/fishing-spots/[id]` | `MIGRATED` | Detail |
| `/fishing-spots/conditions` | `REMAINING` | Existing / pending |
| `/leisure-report` | `SHARED_SHELL_MIGRATED` | Learning |
| `/license-guide` | `MIGRATED` | Existing / pending |
| `/license-issue` | `SHARED_SHELL_MIGRATED` | Learning |
| `/marine-knowledge` | `REMAINING` | Existing / pending |
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
| `/privacy` | `REMAINING` | Existing / pending |
| `/progress` | `MIGRATED` | Learning |
| `/random` | `MIGRATED` | Learning |
| `/reservations` | `ADMIN_PRIVATE` | Private / admin |
| `/safety-guide` | `SHARED_SHELL_MIGRATED` | Learning |
| `/sea` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/sea-info` | `REMAINING` | Existing / pending |
| `/sea/navigation` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/study` | `MIGRATED` | Learning |
| `/terms` | `REMAINING` | Existing / pending |
| `/theory` | `MIGRATED` | Learning |
| `/theory/[tag]` | `MIGRATED` | Learning |
| `/today-sea` | `IMMERSIVE_EXCEPTION` | Immersive |
| `/wrong` | `MIGRATED` | Learning |

`REMAINING` comprises public content/discovery pages outside the V2 Detail, Learning and Form scope. Immersive map/navigation/Today Sea and admin-only flows stay outside this pass. Source/API/auth/data semantics are unchanged.
