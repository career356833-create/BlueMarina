# Blue Marina Market V1

## Decision

`MARKET_V1_READY_WITH_BACKEND_LIMITATIONS`

Market V1 establishes a marine and fishing equipment marketplace foundation with honest empty production data, deterministic discovery, listing detail, and a browser-local seller review flow. It does not claim a completed sale, seller verification, payment protection, or production persistence.

## Product purpose and routes

- `/market` owns listing discovery, filters, sorting, the production empty state, and the entry to seller drafting.
- `/market/[id]` renders an active production listing or returns the standard not-found response.
- `/market/new` builds and validates a nine-step listing draft, then stores it in browser-local staging as `SUBMITTED` with moderation state `REVIEW_REQUIRED`.

The desktop `MARKET` navigation entry now opens `/market`. The five-item mobile BottomNav remains unchanged according to the architecture authority.

## Entity model

`MarketListing` holds seller reference, plain-text title and description, category, optional subcategory, KRW price, condition, region, transaction methods, images, contact, lifecycle state, source type, and verification state. `MarketImage` keeps explicit order and source lineage. `MarketContact` supports phone, email, external HTTP(S) links, or an inquiry-prepared state.

Twelve initial categories cover rods, reels, line and terminal tackle, lures and bait, accessories, boat equipment, marine electronics, safety gear, clothing, coolers and storage, engine parts, and other equipment. Conditions are seller-selected; the system makes no AI condition judgment.

## Listing lifecycle

The canonical listing statuses are `DRAFT`, `SUBMITTED`, `ACTIVE`, `RESERVED`, `SOLD`, `HIDDEN`, and `REJECTED`. V1 creates no `ACTIVE`, `RESERVED`, or `SOLD` production record. A valid local draft is saved with:

- `status: SUBMITTED`
- `moderationStatus: REVIEW_REQUIRED`
- `sourceType: USER_SUBMITTED`
- `verificationStatus: UNVERIFIED`
- `productionVisible: false`

This local record is a review aid rather than evidence of upload, approval, publication, or sale.

## Price and filter contract

`FIXED` requires a positive amount. `NEGOTIABLE` may omit an amount. `FREE` requires zero. `INQUIRY` requires `null`; unknown price is never converted to zero. All amounts use KRW.

The query contract accepts `category`, `region`, `condition`, `priceType`, `q`, and `sort`. Invalid enum values fall back safely. Supported sorting is `NEWEST`, `PRICE_LOW`, or `PRICE_HIGH`, with listing ID as the deterministic tie breaker. There is no best, popular, recommended, or trending ranking.

## Inquiry model

Detail pages can prepare a phone call or email, or open a validated HTTP(S) contact link with `rel="noopener noreferrer"`. Missing contact shows `문의 정보 없음`. No chat message is sent and no success receipt is fabricated.

## Prohibited items and safety boundary

Rule-based validation blocks descriptions that explicitly indicate firearms or ammunition, explosives, regulated weapons, illegal radio or surveillance electronics, stolen or counterfeit goods, illegal catches or protected-species trade, regulated drugs, or hazardous chemicals. Fishing tools remain subject to applicable law; the marketplace does not broaden them into a regulated-weapon sales category.

Life jackets, EPIRB, VHF, GPS and fish finders, engine parts, batteries, and fuel equipment receive a review warning. Seller text is preserved only after plain-text sanitization. Blue Marina does not certify condition, installation compatibility, radio authorization, seaworthiness, or safety performance.

## Image and input security

The browser accepts at most eight JPEG, PNG, or WebP images, each no larger than 8 MiB. SVG and unknown MIME types are rejected. Filenames are normalized and stripped of path and control characters. Images use temporary local object URLs and are not uploaded. Title and description are converted to bounded plain text, and external contact URLs allow HTTP(S) only.

## Mobile UX

At 390 px the listing grid and form remain single-column, while wider screens progressively add columns. Cards use a fixed 4:3 image area, chips wrap, prices and long text break safely, interactive controls are at least 44 px high, and AppFrame keeps BottomNav and safe-area clearance.

## Data and backend boundary

The production registry contains zero listings and no demo listing is exposed. The empty state says `등록된 판매글이 없습니다`; missing images use a Blue Marina placeholder; unknown prices show `가격 문의`; missing contact shows `문의 정보 없음`.

V1 adds no Supabase migration, database write, storage upload, payment, escrow, shipping tracking, real-time chat, seller rating, fraud guarantee, or automated price recommendation.

## Future roadmap

Before production activation, a separate program must define authenticated seller ownership, moderation operations, append-only audit history, RLS, private image ingestion and scanning, safe signed delivery, contact privacy, reporting and takedown operations, prohibited-item escalation, and data retention. Payment, escrow, shipping, and messaging require independent product, legal, security, and operations reviews.

## Verification

- Market targeted tests: 25/25 passed.
- Full repository tests: 956/956 passed.
- TypeScript, ESLint, production build, and diff check passed.
- At a 390 px browser viewport, `/market` and `/market/new` rendered without horizontal overflow, framework error overlays, or console errors.
