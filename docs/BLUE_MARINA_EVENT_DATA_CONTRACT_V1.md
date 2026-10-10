# First-party event contract V1

The existing `ACQUISITION_EVENTS` contract continues to describe retained CURRENT STATE. New observations do not change its historical values from UNOBSERVED to fictional history.

| Event | Accepted origin | Meaning / dedupe |
| --- | --- | --- |
| landing_view | same-origin client | Eight allowlisted entry routes; session + route |
| kakao_login_start | same-origin client | Existing Kakao button; session + LOGIN |
| kakao_login_complete | server callback | Successful current Kakao session + signed attempt; attempt ID |
| charter_submission_start | authenticated client | First input focus; session + CHARTER_ONBOARDING |
| market_new_start | authenticated client | First input focus; session + MARKET_NEW |
| community_new_start | authenticated client | First input focus; session + COMMUNITY_NEW |
| saved_item_created | server mutation | New saved row only; saved-row ID |
| charter_submission_complete | server mutation | Successful new submission; entity ID |
| market_submission_complete | server mutation | Successful new submission; entity ID |
| community_submission_complete | server mutation | Successful new post submission; entity ID |
| moderation_approved | server mutation | Successful admin transition; domain + entity + revision |
| moderation_rejected | server mutation | Successful admin transition; domain + entity + revision |
| content_published | server mutation | First observed ACTIVE/APPROVED Market/Community entity; no Charter approval shortcut |

`saved_item_created` and `content_published` deliberately differ from retained `saved_first_item` and `public_content_created`: insert observations and first observed publication are not retained-first-save or current public stock.

Client envelope: `name`, `route`, optional `returnRoute` (login only), `source`, `medium`, `campaign`, `referrer`. Unknown fields rejected. Browser payload maximum 1,024 bytes. No client timestamps/actor/domain/user/entity/session fields. All route and attribution values are finite allowlists in `src/lib/acquisition/events.ts` and SQL constraints.

Server envelope: explicit environment/event/time, nullable user/session, actor and subject classifications, domain/route/return category, optional entity ID, hashed dedupe key, finite attribution, metadata version 1. No JSON, content, contact data or raw URLs. Moderation revisions are used only to produce the dedupe hash.

Storage timestamps are UTC. Today reporting is KST. Cookie lifetime is 30 minutes. Raw retention recommendation is 90 days; automatic deletion is not yet provisioned. Aggregates return no underlying user/session/entity IDs.
