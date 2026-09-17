# Fishing Spot Coordinate Lineage & Duplicate Verification V1

작성일: 2026-09-17
판정: `COORDINATE_LINEAGE_PARTIAL`

## 범위와 불변 조건

- Runtime canonical source: `src/data/fishing-spots.json`
- 총 1,405건, 유효 좌표 1,405건, map/navigation eligible 1,405건
- 좌표 수정 0, merge/delete 0, navigation eligibility 변경 0
- Runtime, DB, Supabase 변경 0
- 일반 지도 검색 결과를 canonical 좌표로 사용하지 않음

## 공식 원본

| 데이터셋 | 건수 | 로컬 원본 | SHA-256 |
| --- | ---: | --- | --- |
| 해양수산부 공동활용체계 선상낚시포인트 20231231 | 329 | `work/fishing-spots-boat-raw.csv` | `5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D` |
| 해양수산부 공동활용체계 갯바위낚시포인트 20221231 | 1,076 | `work/fishing-spots-rock-raw.csv` | `E19E4D62ABCAC286FD65CC6658B428EC0A38B7EF8477A2BF37398063F73192AC` |

공공데이터포털은 두 데이터셋 모두 `공간정보`와 도분초 위도/경도 필드를 공식 컬럼으로 명시한다. 다만 `공간정보` 필드의 CRS를 포털 메타데이터에서 명시하지 않는다. 로컬 원본은 다운로드 후 이름이 바뀌어 원 다운로드 파일명은 `UNKNOWN`으로 남긴다.

Runtime artifact SHA-256:

`5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA`

## 좌표 계보

### EPSG:5179 복구 경로 979건

```text
official 공간정보 POINT(X Y)
  -> EPSG:5179 Korea 2000 / Unified CS
  -> src/lib/geo/projection.ts custom inverse Transverse Mercator
  -> EPSG:4326
  -> six-decimal lat/lng
```

- 변환기는 git commit `f47cb23`에서 도입되었다. 별도 semantic version은 없다.
- 당시 preview는 source `EPSG:5179`, target `EPSG:4326`, 후보 979건을 기록한다.
- apply summary의 before/after checksum chain과 현재 runtime checksum이 일치한다.
- 979/979건이 현재 좌표를 1m 이내로 재현한다.
- 평균 오차 0.0367m, 최대 오차 0.0721m다.
- 상태: `LINEAGE_CONFIRMED`

### 공식 DMS 정규화 경로 426건

```text
official DMS latitude/longitude
  -> DMS-to-decimal conversion
  -> current EPSG:4326 lat/lng
```

- 426/426건이 공식 DMS 필드로부터 현재 좌표를 1m 이내로 재현한다.
- 평균 오차 0.0378m, 최대 오차 0.0689m다.
- 최초 normalizer 코드와 버전은 보존되어 있지 않다.
- 상태: 데이터값은 재현되지만 도구 계보가 불완전하므로 `LINEAGE_PARTIAL`

1m 허용 오차는 6자리 소수 WGS84 저장의 반올림을 허용하면서도 보수적인 meter-level 검증을 유지하기 위해 사용했다.

## 전체 Lineage 결과

| 상태 | 건수 |
| --- | ---: |
| `LINEAGE_CONFIRMED` | 979 |
| `LINEAGE_PARTIAL` | 426 |
| `LINEAGE_UNRESOLVED` | 0 |
| `TRANSFORMATION_MISMATCH` | 0 |
| `SOURCE_COORDINATE_MISSING` | 0 |

전체 1,405건은 `(sourceType, originalId)`로 공식 원본 행에 연결되고 `originalPoint`도 원본 `공간정보`와 일치한다. 최종 판정이 PARTIAL인 이유는 426건의 최초 DMS normalizer 부재와 공식 포털의 projected CRS 메타데이터 부재다. 데이터 mismatch 판정이 아니다.

## 동일 좌표 6그룹

| Spots | WGS84 | 지역 | 분류 | 조치 |
| --- | --- | --- | --- | --- |
| `boat-60`, `boat-128` | 37.628583, 125.680389 | 경남 / 인천 | `CROSS_REGION_CONFLICT` | `NAVIGATION_REVIEW_REQUIRED` |
| `boat-129`, `boat-321` | 37.475917, 126.354778 | 인천 / 전남 | `CROSS_REGION_CONFLICT` | `NAVIGATION_REVIEW_REQUIRED` |
| `rock-152`, `rock-591` | 34.200361, 126.860028 | 전남 | `UNRESOLVED` | `REVIEW_RECOMMENDED` |
| `rock-297`, `rock-821`, `rock-872` | 35.056944, 126.058111 | 전남 | `UNRESOLVED` | `REVIEW_RECOMMENDED` |
| `rock-430`, `rock-884` | 37.421972, 126.435000 | 인천 | `UNRESOLVED` | `REVIEW_RECOMMENDED` |
| `rock-520`, `rock-532` | 34.904369, 128.149642 | 경남 | `POSSIBLE_ALIAS_LOCATION` | `NO_ACTION` |

6그룹 모두 동일 WGS84로 변환되기 전부터 공식 원본 `공간정보`가 동일하다. 따라서 `TRANSFORMATION_COLLISION`은 0건이다.

### Cross-region 우선 검토

두 선상 그룹 4건은 서로 다른 지역·도시·장소명이 동일한 원본 projected point를 가진다. fallback이나 변환 충돌이 아니라 공식 source 내부 좌표 재사용이다. 충돌 자체의 신뢰도는 `HIGH`지만 어느 좌표가 올바른지는 공식 대체 좌표가 없어 후보 좌표를 만들지 않았다.

- repair candidate: 4건
- candidate coordinate available: 0건
- action: `REVIEW_ONLY`
- navigation risk: `NAVIGATION_REVIEW_REQUIRED`
- 현재 navigation eligibility는 변경하지 않음

### 같은 지역 그룹

- `rock-520`/`rock-532`는 같은 고성군 상족암 유람선 일대를 가리켜 alias/공유 지점 가능성이 높다. 자동 병합 없이 no-action으로 둔다.
- 나머지 3그룹은 서로 다른 장소명이 원본 좌표 하나를 공유하지만, 대표 좌표 재사용인지 source 오류인지 판별할 공식 행별 근거가 부족하다.

## Near duplicate

- `rock-151` / `rock-265`
- 거리: 79.953m
- 이름 유사도: 0.727
- 공식 projected point는 서로 다르고 현재 거리도 재현된다.
- 이름은 각각 에게이 서측 갯바위와 에게이 등대 남측 갯바위를 가리킨다.
- 분류: `DISTINCT_NEARBY_POINTS`
- 조치: `NO_ACTION`, 자동 merge 금지

## Repair 정책

`reports/fishing-spots/coordinate-review-candidates-v1.json`에는 실제 검토 대상 11건만 기록한다. Cross-region 4건은 repair candidate지만, 권위 있는 대체 좌표가 없으므로 `candidateCoordinate`는 `null`이다. 좌표값을 새로 만들거나 자동 적용하지 않는다.

## Navigation 경계

좌표가 map/navigation eligible이라는 사실은 렌더 가능한 좌표가 있다는 뜻일 뿐이다. 안전 항로, 수심 여유, 위험물 회피, 출입 가능, 현장 통제를 보증하지 않는다. Cross-region 4건은 검토가 끝날 때까지 목적지 신뢰성 경고 대상으로 취급해야 하지만 이번 감사에서는 상태를 변경하지 않는다.

## 산출물

- `reports/fishing-spots/coordinate-lineage-duplicate-verification-v1.json`
- `reports/fishing-spots/coordinate-review-candidates-v1.json`
- `tools/fishing-spots/verify-coordinate-lineage.mjs`
- `tests/fishing-spots/coordinate-lineage-duplicate-verification-v1.test.cjs`

## No-auto-fix boundary

이번 감사는 계보와 후보를 기록하는 작업이다. 좌표 수정, 행 병합/삭제, route 안전 판정, navigation eligibility 변경, DB/Supabase write는 후속 권위 근거 검토 없이 수행할 수 없다.
