# NIFS canonical slug approval candidates

- Environment checked: `staging`
- Project ref: `mlfvpaikfpjrgrhwlrjn`
- Approval status: `approved`
- Candidate data changed: no
- Database changed: no

| Korean name | Scientific name | Proposed canonical slug | Basis | Conflict |
| --- | --- | --- | --- | --- |
| 붉은대게 | Chionoecetes japonicus | `red-snow-crab` | NIFS English name | none |
| 오분자기 | Sulculus diversicolor | `ear-shell` | NIFS English name | none |
| 제주소라 | Turbo cornutus, Batillus cornutus | `spiny-top-shell` | NIFS English name | none |
| 참조기 | Larimichthys polyactis | `yellow-croaker` | NIFS English name | none |
| 참홍어 | Raja pulchra | `mottled-skate` | NIFS English name | none |
| 대게 | Chionoecetes opilio | `tanner-crab` | NIFS English name | none |
| 기름가자미 | Glyptocephalus stelleri | `blackfin-flounder` | NIFS English name | none |
| 주꾸미 | Amphioctopus fangsiao | `webfoot-octopus` | NIFS English name | none |

## Decision basis

All eight candidates already contain an English common name sourced from NIFS. No Korean romanization, translation, or inferred name was introduced. The English names produce unambiguous ASCII stems, while the Jeju top shell record contains two scientific-name forms in one source field and therefore is not suitable for a single genus-species slug without an additional taxonomy decision.

Once approved, each canonical slug is immutable. Later naming improvements must preserve the canonical slug and use a slug alias when a redirect is needed.

## Validation

- DB regex: 8/8 pass
- Internal duplicates: 0
- Staging slug conflicts: 0
- Existing NIFS source identity conflicts: 0
- Legacy matches: 0
- Legacy canonical slug check: not applicable because `FishItem` has no slug field

The staging checks used a read-only transaction and queried only the eight proposed slugs and eight NIFS source IDs. No rows were changed.
