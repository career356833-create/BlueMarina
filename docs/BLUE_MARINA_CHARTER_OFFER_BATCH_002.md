# Blue Marina Charter Offer Batch 002

Batch 002 sought a bulk public source for customer-selectable Korean fishing charter offers. Eligibility required an identifiable operator, evidence of a charter service, and a source URL. Price, schedules, seats, species, and coordinates remained optional but could only be copied from explicit source evidence.

No discovered source met both the minimum bulk target and the access/reuse boundary. Sunsang24 has platform-scale data but its operator sites state that information cannot be reused without consent. Yeyakhaja disallows schedule and booking paths in its all-agent robots policy. Fishapp permits crawling with a 30-second delay, but offers no documented bulk feed; page-by-page collection would violate this batch's bulk workflow requirement. The Korea Tourism Organization's documented SPARQL endpoint returned HTTP 503, while TourAPI requires an approved Data.go.kr service key.

The resulting decision is `CHARTER_OFFER_SOURCE_INSUFFICIENT`. Batch 002 therefore contains no operators, boats, ports, charter offers, or schedules. Batch 001 registrations are not treated as offers. No private API was reverse engineered and no login, CAPTCHA, access restriction, crawl delay, or rate limit was bypassed.

Future collection can resume category-wise when one of these gates changes: written reuse permission or a documented bulk export from a booking platform, restoration of the KTO SPARQL endpoint with sufficient fishing-experience coverage, or an authorized TourAPI key. The same deterministic builder then remains responsible for URL validation, reference integrity, identity dedupe, Batch 001 crosswalk, promotion readiness, and null/UNKNOWN preservation.
