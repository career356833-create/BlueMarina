# NIFS staging import execution

- Environment: `staging`
- Project ref: `mlfvpaikfpjrgrhwlrjn`
- Result: `NIFS_8_IMPORT_PASS`
- Transaction: committed
- Import: 8/8
- Conflict: 0

## Imported records

| sourceId | Korean name | Canonical slug | Canonical scientific name | Result |
| --- | --- | --- | --- | --- |
| fish_1573537097812 | 붉은대게 | `red-snow-crab` | Chionoecetes japonicus | IMPORTED |
| fish_1575873437839 | 오분자기 | `ear-shell` | Sulculus diversicolor | IMPORTED |
| fish_1575880014320 | 제주소라 | `spiny-top-shell` | Turbo cornutus | IMPORTED |
| fish_1575880791880 | 참조기 | `yellow-croaker` | Larimichthys polyactis | IMPORTED |
| fish_1575881532404 | 참홍어 | `mottled-skate` | Raja pulchra | IMPORTED |
| fish_1576639605222 | 대게 | `tanner-crab` | Chionoecetes opilio | IMPORTED |
| fish_1576639605223 | 기름가자미 | `blackfin-flounder` | Glyptocephalus stelleri | IMPORTED |
| fish_1576639605227 | 주꾸미 | `webfoot-octopus` | Amphioctopus fangsiao | IMPORTED |

## Verification

- `fish_source_records`: 8
- `fish_species`: 8
- `fish_species_sources`: 8
- Approved scientific aliases: 1
- Import lineage logs: 8
- State: `fact_review_status=pending`, `publish_status=draft` for all 8
- UTF-8 Korean names: verified against candidate bytes
- Jeju top shell raw scientific name: `Turbo cornutus, Batillus cornutus` preserved
- Jeju top shell canonical scientific name: `Turbo cornutus`
- Oil flounder season: `null`, `seasonSourceStatus=source_missing`

The same eight-record input now classifies as `INSERT 0 / EXISTING 8 / CONFLICT 0` without executing another write.

Observation, Collection, Regulation, Fish role, and Media counts remained zero. The import SQL contains no Storage operation and did not modify the legacy `FishItem` source.

## Quality checks

- Related tests: 71/71 passed
- Lint: PASS
- Build: PASS
- Credential environment variable remaining: no
- Rollback required: no
