# Blue Marina Charter Verified Supply Pilot V1

## Decision

`CHARTER_VERIFIED_SUPPLY_PILOT_BLOCKED` (2026-09-27).

Five operator-owned public sites support 12 distinct **research** offer records. These are source-backed facts, not verified Blue Marina suppliers. No supplier supplied an authorized import, no publication consent was established, no authenticated `charter_admin` reviewed the batch, and no intake backend write occurred. Thus verified supply entities: **0**; approved promotion and public listing candidates: **0**. The requested 10 verified supply entities and Preview listing smoke gate are not met.

## Sources and provenance

Only factual operator name, service, phone, boat/port when explicit, and published prices were transcribed. Source text, images, reviews, customer names, live seats, and booking schedules were not copied. The research inputs are in [`source-evidence-v1.json`](../data/charters/pilot/v1/source-evidence-v1.json).

| Operator-owned source | Research offers | Evidence boundary |
| --- | ---: | --- |
| [삼천포 여의도호](https://yud3004.cafe24.com/) | 2 | 2026 주꾸미·문어 병행, winter 감성돔; phone and boat; no dated slots |
| [놀빛바다호](https://www.noulbit.com/) | 3 | three distinct courses and phone; static prices need reconfirmation |
| [송이호 배낚시](https://songyifishing.com/%EC%98%88%EC%95%BD-%EB%B0%8F-%EC%9A%94%EA%B8%88%EC%95%88%EB%82%B4/) | 3 | flatfish group, seven-hour, four-hour offers; old static prices need reconfirmation |
| [제주 에이스호](https://aceho.co.kr/) | 3 | 갈치, 한치, 갑오징어 specialties and direct phone; departure may vary seasonally |
| [보이스피싱호](https://www.sunrise1.co.kr/bf/home) | 1 | 팁런 offer, business contact, boarding point; dynamic date/seats deliberately omitted |

The [Sunsang24](https://www.sunsang24.com/), [Yeyakhaja](https://yeyakhaja.com/), and [Fishapp](https://www.fishapp.co.kr/) platform catalogs were **not** ingested, consistent with the earlier [source inventory](../reports/charters/source-inventory-v2.json). The [Seantour copyright policy](https://seantour.kr/newseantour/main/cpyrhtPrtcPolicy.do) requires prior consultation for commercial reuse and linking, so its 14 search matches were screened but not included. No login, captcha, robots, or private API bypass was used.

## Intake and review path

The deterministic builder reuses the existing `validateSubmission`, `resolveSpeciesExact`, `normalizePhone`, and `crosswalkMofBatch001` functions. Each operator has an original factual payload and a normalized `CharterSupplySubmission` shaped payload. `BULK_IMPORT` here means an **offline contract exercise**, not a submitted server record: `state=DRAFT`, `verificationStatus=UNVERIFIED`, `submittedAt=null`, and `authenticatedAdminReview=false`.

The 70,728-row MOF Batch 001 registration is checked with the existing crosswalk. No operator-provided registration identifier is available, so boat-name similarity is never treated as a license match or auto-approval. All five remain `NO_MATCH` and require human review. Two explicit departure descriptions are retained without coordinates; the rest have an unknown port. Species resolve only by exact canonical or approved safe alias. Raw `문어`, `한치`, `갑오징어`, and `무늬오징어` remain unresolved where no permitted match exists. Static prices are preserved as source facts but suppressed from the preview display until refreshed.

All 12 offers have `INQUIRY_REQUIRED`, null remaining seats, and no dated schedule. Batch review marks all `REVIEW_REQUIRED`. The existing `buildPromotionCandidate` requires a real `APPROVED` submission and `APPROVE` admin decision; the offline research does not impersonate one. The research preview data has a conspicuous `PILOT RESEARCH / NOT APPROVED` label, phone CTA only, and zero public candidates. No `/charters` or `/charters/[id]` preview was launched because no record passed the approval gate. Production registry remains empty.

## Promotion prerequisites

Obtain supplier-provided CSV/JSON or direct onboarding submissions with publication consent and current contact/service evidence. Then run server validation and an authenticated `charter_admin` batch review, resolve MOF/boat/port/duplicate conflicts, refresh prices and seasons, and only then call the existing promotion-candidate builder for approved records. A later Preview deployment can test labelled `/charters` listing/detail at 390×844 and 1280×900. Production activation requires a separate decision.

No Git stage/commit/push, DB migration/apply, Supabase write, production registry mutation, or production deployment is part of this audit.
