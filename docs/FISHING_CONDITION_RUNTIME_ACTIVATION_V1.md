# Fishing Condition Runtime Activation V1

The Fishing Condition read model now exposes the reviewed 38-species profile registry as `profileContext`. The registry is built only from the two Profile Expansion V1 batch artifacts and preserves each profile's readiness, factual domains, evidence references, and limitations.

`PROFILE_READY` can display all available factual domains. `PROFILE_PARTIAL` displays only its recorded domains and keeps missing fields as unavailable. `PROFILE_LIMITED` displays factual evidence with a required limitation notice; it does not create a condition judgement.

The existing ten species retain their legacy environment comparator and API response behavior. For registry species without a legacy comparator profile, the UI places observed environmental values beside the profile context without comparing them. This keeps temperature range types, depth definitions, undocumented salinity units, and seasonal evidence separate.

The selector is registry-based and covers 38 species. Fishing-spot detail links use the same registry when a target species has an exact canonical ID. Profile source names, evidence classes, links when present, and limitations are displayed in the conditions page.

This activation does not implement scoring, ranking, probability, recommendations, automatic suitability verdicts, production profile mutation, database writes, or Supabase writes.
