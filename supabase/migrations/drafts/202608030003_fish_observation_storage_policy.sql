-- DRAFT ONLY. DO NOT APPLY.
--
-- Storage policy sketch for the Fish-domain target schema. Bucket creation,
-- object policies, worker identity, and moderation operations require a
-- separate Supabase rollout review.

insert into storage.buckets (id, name, public)
values
  ('fish-observation-originals', 'fish-observation-originals', false),
  ('fish-observation-processed', 'fish-observation-processed', false),
  ('fish-observation-public', 'fish-observation-public', true)
on conflict (id) do nothing;

-- There is deliberately no authenticated policy for these buckets. Signed
-- uploads and signed reads are issued only by a future server-side media
-- gateway after it confirms both auth.uid() and observation ownership. This
-- prevents a browser session from writing arbitrary paths under its UUID or
-- bypassing upload-session, MIME, hash, EXIF, and public-share checks.
--
-- The gateway alone creates processed/public objects. A deployment must keep
-- the Storage service-role credential out of browser code and out of the AI
-- provider process. Public read is provided solely by the public bucket.
