# Fishing Spot Coordinate Safety Hold V1

## Decision

`COORDINATE_SAFETY_HOLD_ACTIVE`

Coordinate Repair Review V1 found no authoritative replacement coordinate for four cross-region conflicts. This change applies a runtime usage hold without changing any canonical or source coordinate.

## Runtime policy

| Spot | Map | Navigation |
| --- | --- | --- |
| `boat-60` | blocked | blocked pending review |
| `boat-128` | displayed with a reference-only warning | blocked pending review |
| `boat-129` | displayed with a reference-only warning | blocked pending review |
| `boat-321` | blocked | blocked pending review |

The small static contract in `src/lib/fishing-spots/coordinate-safety.ts` is a deterministic projection of `reports/fishing-spots/navigation-coordinate-hold-v1.json`. Every other spot receives the default map and navigation policy. The policy is keyed by `spotId`; numeric coordinates are never used as a blocklist.

## Detail and map behavior

The four detail pages show a neutral coordinate-review notice. Map and navigation controls remain visible when disabled so the reason is available through `aria-describedby`.

`boat-60` and `boat-321` are omitted from Sea Map marker creation. A direct link such as `/sea?spotId=boat-60` loads the map page without restoring a marker or selection and displays: “이 포인트는 좌표 검토 중이라 지도 위치를 표시하지 않습니다.”

`boat-128` and `boat-129` remain visible on the Sea Map. Their selected overlay displays “좌표 검토 중” and “지도 위치는 참고용입니다.” Their navigation action remains disabled.

## Navigation defense

The existing navigation destination schema is unchanged. Its fishing-spot adapter rejects all four held `sourceId` values both when a link is built from a fishing spot and when a navigation query is parsed. Manual coordinates, including the same numeric values, remain available because the hold applies only to a fishing-spot origin with a held `spotId`.

Navigation continues to provide a straight-line directional aid. It does not calculate a safe route, avoid land, reefs, or depth hazards, or replace official navigation equipment and information.

## Fishing Condition

Fishing Condition remains available from every held spot. The spot context and detail backlink are preserved. Species, month, data source, observation station or site, and depth still require explicit selection; the spot coordinate does not select an observation station automatically.

## Data invariants

- Canonical fishing-spot coordinates: unchanged
- Boat and rock source CSV files: unchanged
- Normalized spot artifacts: unchanged
- Duplicate merge or deletion: none
- Database writes, migrations, or Supabase changes: none
- Scores or recommendations: none

## Release criteria

A hold may be reviewed for release only after an authoritative replacement coordinate is confirmed, or the existing coordinate is authoritatively confirmed for the exact named place. Until that evidence is reviewed and separately applied, navigation remains blocked. A newly proposed candidate coordinate alone does not release or mutate the runtime coordinate.
