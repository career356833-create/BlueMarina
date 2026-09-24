# Blue Marina Home Personalization V1

## Purpose

Home remains a Blue Marina brand entry. `MarineVideoHero`, the six primary service entries, and the two secondary entries retain their existing hierarchy. Personalization is a compact section after the service entries; it does not become a dashboard.

## Data boundaries

- Profile, saved items, and own Market activity reuse the Account V1 read contract.
- Recently viewed content remains device-local and retains the Account V1 maximum of 30 records.
- Community activity is described only as content stored on this device.
- Charter inquiry history is unavailable and is not represented as a successful server feature.
- Recent and saved links are limited to supported internal entity routes. Invalid or unsupported records are skipped rather than producing a broken CTA.

## States

- Unauthenticated and expired-session visitors retain the ordinary brand home without a login prompt.
- Authenticated visitors see a light welcome strip, then available recent, saved, and activity highlights.
- When `ACCOUNT_BACKEND_ENABLED` is off or the Account API fails, the section preserves device-local recent items and explains that server-backed saved/activity data is unavailable. It never shows a fabricated synced zero state.

## Privacy and safety

The section displays only the current account read model and device-local records. It does not show email addresses, another user’s activity, phone data, or precise location. There is no recommendation engine, ranking, popularity/trending label, suitability score, AI personalization, follow, friend, DM, or subscription feature.

## Performance

The section mounts after the hero and service entries. It reads local data immediately and isolates Account API failure inside the personalization section, so the homepage and hero remain usable. Account server reads continue to use their existing parallel profile/saved/Market query implementation.

## Responsive and accessible behavior

At mobile widths, highlight cards collapse to one column and all CTAs retain a minimum 44px height. At desktop widths, highlights use no more than three columns. Sections use headings, links for navigation, status text for limitation messages, and focus-visible outlines.

## Future scope

Future work may add an explicit user-controlled preference surface or an authoritative Charter activity source. It must preserve Account ownership boundaries and must not introduce implicit recommendations or inferred personal data.
