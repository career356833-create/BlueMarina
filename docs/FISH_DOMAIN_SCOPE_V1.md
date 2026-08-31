# Fish Domain Scope V1

## Purpose

Blue Marina Fish Domain is the canonical identity and provenance layer for marine, coastal, and marine-fishing species used by the product. Taxonomic validity alone does not authorize product-domain admission.

## Admission boundary

- Include marine and coastal fish when identity, source lineage, collision checks, and required naming policy pass.
- Review brackish and diadromous fish case by case against actual product use.
- Keep exclusively freshwater fish in a separate future `FRESHWATER_FISH` domain.
- Keep non-fish marine organisms in a separate marine-organism domain.
- Never import a source merely because it appears in an MBRIS or NIFS export.

## Provenance and names

- Preserve the source scientific string even when a newer accepted name is selected.
- Store former combinations and verified synonyms as aliases; do not erase source facts.
- A scientific-name revision does not silently change immutable product identity or slug.
- A species without a confirmed official Korean name remains blocked when Korean naming is required. Do not promote an inferred translation or unofficial web name.
- Domestic official usage and international accepted taxonomy may disagree. Record both and require an explicit promotion decision.

## Baseline and future changes

The staging set of 1,258 canonical species is the V1 stable baseline. Freeze means later additions must pass the promotion pipeline, collision review, provenance checks, and product-scope admission. It does not publish records or approve pending facts; all 1,258 remain `draft` and `pending`.

Raw NIFS/MBRIS data must not be inserted directly into canonical tables. Freshwater and marine-organism tracks may reuse identity evidence, but they require their own scope and taxonomy models before import.
