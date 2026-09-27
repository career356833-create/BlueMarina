-- Account API revalidates the bearer token, filters by user.id, then uses a
-- server-only service-role client. RLS bypass does not imply table privileges.
-- This migration intentionally creates no tables or browser grants.
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.user_saved_items to service_role;
