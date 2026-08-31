# Marine Organism Canary Import V1

## Result

- Environment: staging
- Project Ref: `mlfvpaikfpjrgrhwlrjn`
- Status: `MARINE_ORGANISM_CANARY_IMPORT_PASS`
- Full-import readiness: yes
- Production writes: 0

## Prewrite

The dedicated read-only auditor verified an empty Marine Organism inventory immediately before the write. All internal ID, canonical UUID, scientific-name, normalized scientific-name, slug, and source identity collision counts were zero. Fish remained at 1,258 species, including 8 NIFS and 1,250 MBRIS-backed canonical species, with 1,253 MBRIS source relations.

The canary excluded the three cross-domain review identities and contained exactly the ten approved rows from `marine-organism-canary-plan-v2.json`.

## Source Contract Correction

The initial V2 planning output assigned a source UUID per organism even though all ten rows originate from the same MBRIS national species catalog and share the same catalog hash. Before the write, the plan was corrected to one deterministic catalog source record. Each organism's row-level identity such as `MBRIS:무척추동물:2442` remains in relation lineage and change-log provenance.

This produced the required source multiplicity:

- Catalog source records: 1
- Organisms: 10
- Source relations: 10
- Change logs: 10

## First Transaction

One explicit transaction inserted 31 rows. Its in-transaction validation checked total counts, exact deterministic identities, taxonomy, draft/pending state, relation lineage, change-log provenance, aliases, and the five-group distribution before COMMIT.

Group distribution:

- CRUSTACEAN: 2
- CEPHALOPOD: 2
- GASTROPOD: 2
- BIVALVE: 2
- ECHINODERM: 2

Aliases and slug aliases remained zero. No row outside the ten canary identities was created.

## Security and Fish Protection

The audit surface returned all ten canary organisms. An `anon` role SELECT returned zero because every canary row is `draft` and `pending`. No RLS, policy, constraint, or ACL was changed by the import.

Fish remained unchanged before and after the import:

- Fish species: 1,258
- NIFS: 8
- MBRIS Fish: 1,250
- MBRIS relations: 1,253
- Policy, constraint, index, and trigger fingerprints: unchanged

## Idempotency

The exact same canary transaction was executed once more after the first postcheck. Deterministic IDs and `ON CONFLICT (id) DO NOTHING` produced zero new source, organism, relation, change-log, alias, or slug-alias rows. The second postcheck still returned 1/10/10/10 with duplicate count zero.

## Excluded Inputs

- Remaining READY 3,006 writes: 0
- REVIEW 93 writes: 0
- OUT_OF_SCOPE 58 writes: 0
- Cross-domain review writes: 0
- Fish writes: 0

The remaining 3,006 READY records were not imported in this operation.
