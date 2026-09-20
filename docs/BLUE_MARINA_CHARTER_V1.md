# Blue Marina Charter V1

Charter V1 provides discovery and inquiry boundaries, not a booking engine. The production registry is deliberately empty until authoritative operator data is ingested.

`Operator → Boat → Port → Charter → CharterSchedule` is the domain relationship. Availability defaults to `UNKNOWN` or `INQUIRY_REQUIRED`; unknown price and seats never become zero. A valid detail can expose phone, official website, or an HTTPS external booking link only when source-backed.

`/charters` presents a truthful empty state, `/charters/[id]` is a safe not-found for unknown records, and `/reservations` is an inquiry-preparation guide rather than a reservation history or confirmation.

Fish and Conditions links require existing canonical and condition-registry IDs. Sea and Navigation require a verified port coordinate; no fishing-spot relationship, map coordinate, or navigation destination is inferred from charter species. Payment, live inventory, confirmation, refunds, reviews, scraping, and operator administration are outside V1.
