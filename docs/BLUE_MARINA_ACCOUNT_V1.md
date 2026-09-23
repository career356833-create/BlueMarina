# Blue Marina Account V1

## Decision

`ACCOUNT_V1_READY_WITH_ENV_LIMITATIONS`

Account V1 adds authenticated profile, saved content, owned activity, and device-local recent history. The implementation reuses Supabase Auth and the existing `public.profiles` table. It does not create a second user profile authority.

## Routes

- `/account`: account summary
- `/account/profile`: display name, avatar URL, region, and bio
- `/account/saved`: fishing spots, canonical fish, charters, and market listings
- `/account/activity`: owned market rows, local community drafts, charter inquiry boundary, and recent history
- `/account/login`: Supabase password login without a demo fallback

The AppFrame account icon is the common entry point. Loading, signed-out, expired-session, signed-in, backend-disabled, empty, and request-failure states have explicit UI.

For browser acceptance without credentials, development builds expose `/account?preview=authenticated`. This renders only the empty authenticated UI shell, is explicitly labeled as a preview, performs no account API request, and is disabled in production builds.

## Data and ownership

Migration `20260923100000_blue_marina_account_v1.sql` extends `public.profiles` and adds `public.user_saved_items`. A unique constraint on `(user_id, entity_type, entity_id)` makes repeated save requests idempotent. RLS allows authenticated users to select, insert, and delete only their own saved rows. The server additionally applies the authenticated user ID to every profile, saved-item, and market-activity query because the service client bypasses RLS.

The account API revalidates bearer tokens with `auth.getUser(token)`. It never trusts a user ID from the request body. Profile text is length-limited and HTML tags are removed; avatar URLs accept HTTP(S) only; saved links must be internal paths.

`ACCOUNT_BACKEND_ENABLED` defaults to disabled. When disabled or when Supabase server configuration is missing, the API returns a fail-closed 503 and the UI does not claim that anything was saved.

## Activity boundaries

- Market activity reads only listings whose `seller_id` equals the authenticated user.
- Community V1 currently persists submissions in localStorage, so Account V1 reports only drafts found on the current device and does not imply server ownership.
- Charter inquiry history has no authoritative persistence source yet and is shown as unavailable.
- Recent history is device-local, capped at 30, and deduplicated by entity type and ID. Logging out clears the fetched server read model; device-local recent history remains on that device.

## Integration

Fishing spot, canonical fish, charter, and market detail views use the shared save button. Fishing spot, charter, and market detail views also record device-local recent history. Existing coordinate safety holds, condition eligibility, market moderation, charter verification, Platform UX, and Navigation HUD behavior remain authoritative.

## Deployment boundary

The migration was created but was not applied locally or remotely. Before enabling the backend, operators must review and apply the migration in the intended Supabase environment, configure Supabase server credentials, and set `ACCOUNT_BACKEND_ENABLED=true`. No production profile, saved item, market listing, or charter record was created by this work.
