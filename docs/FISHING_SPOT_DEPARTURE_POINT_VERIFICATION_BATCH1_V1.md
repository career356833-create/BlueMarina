# Fishing Spot Departure Point Verification Batch 1 V1

## Decision

`NO_AUTHORITATIVE_EXACT_DEPARTURE_RELATION_CONFIRMED`

기존 `boat-departure-access.json`의 named departure 후보 20건만 검토했다. 공식 선상낚시 원본에서 항·포구·선착장 이름이 fishing spot의 위치 설명에 등장한다는 사실과 실제 승선·출항 관계를 분리했다. 특정 fishing spot으로 해당 출항지에서 운항한다는 authoritative evidence가 확인된 후보는 없다.

## Result

| 판정 | 건수 | 의미 |
| --- | ---: | --- |
| `DEPARTURE_CONFIRMED` | 0 | 정확한 spot과 출항지의 승선·출항 관계가 공식 근거로 확인됨 |
| `GEOGRAPHIC_NAME_ONLY` | 17 | 지명과 지역만 확인되고 출항 관계는 확인되지 않음 |
| `DEPARTURE_RELATION_UNRESOLVED` | 3 | 해당 항의 일반적인 낚시어선 이용은 확인되지만 정확한 spot 운항 관계는 미확인 |
| `CONFLICT_REVIEW_REQUIRED` | 0 | 공식 근거 사이의 충돌 |

`DEPARTURE_RELATION_UNRESOLVED`는 `boat-125`(지세포항), `boat-160`(방포항), `boat-290`(압해도선착장)이다. 공공 자료가 낚시어선 출입항 또는 일반 선상낚시 출발지 이용을 뒷받침하지만, 해당 fishing spot과의 직접 관계는 제시하지 않는다.

## Candidate review

| spotId | spot | candidate | status |
| --- | --- | --- | --- |
| boat-3 | 울릉도 - 남양항부근해상 | 남양항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-22 | 연화도 부근 - 연화항부근해상 | 연화항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-29 | 제주도 남부 - 강정포구앞노란부표부근 | 강정포구 | `GEOGRAPHIC_NAME_ONLY` |
| boat-63 | 제주도 남부 - 강정포구앞입표부근 | 강정포구 | `GEOGRAPHIC_NAME_ONLY` |
| boat-73 | 연도 - 역포항인근해상 | 역포항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-76 | 수영만 부근 - 청사포항인근해상 | 청사포항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-100 | 대청도·소청도 - 선진포항앞바다 | 선진포항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-125 | 거제도 북동부 - 지세포항앞바다 | 지세포항 | `DEPARTURE_RELATION_UNRESOLVED` |
| boat-143 | 추도 부근 - 대항승선장부근해상 | 대항승선장 | `GEOGRAPHIC_NAME_ONLY` |
| boat-148 | 제주도 남동부 - 비안포구앞해상 | 비안포구 | `GEOGRAPHIC_NAME_ONLY` |
| boat-160 | 안면도 북부 - 방포항방파제앞해상 | 방포항 | `DEPARTURE_RELATION_UNRESOLVED` |
| boat-177 | 거차수도 부근 - 동거차선착장해상 | 동거차선착장 | `GEOGRAPHIC_NAME_ONLY` |
| boat-211 | 제주도 남동부 - 태흥리포구앞해상 | 태흥리포구 | `GEOGRAPHIC_NAME_ONLY` |
| boat-215 | 석모도 - 외포리선착장입표부근해상 | 외포리선착장 | `GEOGRAPHIC_NAME_ONLY` |
| boat-220 | 연화도 부근 - 연화항부근해상 | 연화항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-224 | 추자군도 - 추자항북측해상 | 추자항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-268 | 부산항 부근 - 몰운대전망대해상 | 부산항 | `GEOGRAPHIC_NAME_ONLY` |
| boat-288 | 제주도 북동부·우도 - 종달리포구앞해상 | 종달리포구 | `GEOGRAPHIC_NAME_ONLY` |
| boat-290 | 압해도 - 압해도선착장앞해상 | 압해도선착장 | `DEPARTURE_RELATION_UNRESOLVED` |
| boat-300 | 제주도 북동부·우도 - 천진항앞해상 | 천진항 | `GEOGRAPHIC_NAME_ONLY` |

## Evidence policy

모든 기록은 해양수산부 공공데이터 선상낚시 포인트의 원본 행을 기본 근거로 가진다. FIPA 항·어항 자료, 해양수산청, 해양경찰서, 지자체, 한국관광공사 자료는 지명·지역 또는 항의 일반 이용을 교차 확인하는 데만 사용했다. 블로그, 카페, 낚시업체 홍보와 일반 지도 사용자 등록정보는 근거로 사용하지 않았다.

CONFIRMED 판정에는 spot identity, named departure point, 실제 승선·출항 관계, authoritative source, URL/reference, 지역 일치가 모두 필요하다. 일반적인 낚시어선 출입항 사실만으로 특정 fishing spot의 departure 관계를 만들지 않았다.

## Coordinates and safety holds

공식 자료에 후보 출항지의 명시적 좌표와 정확한 spot 관계가 함께 제시되지 않아 `departureCoordinate`는 20건 모두 `null`이다. fishing spot 좌표를 출항지 좌표로 재사용하지 않았다.

`boat-60`, `boat-128`, `boat-129`, `boat-321`의 기존 coordinate safety hold는 그대로 유지했다. hold release는 0건이다.

## Scope and invariants

- production enrichment 승격: 0
- original enrichment mutation: 0
- canonical coordinate mutation: 0
- coordinate inference: 0
- runtime mutation: 0
- DB/Supabase write: 0
- navigation hold release: 0

결과는 research artifact와 audit report에만 기록한다. 재현은 `node tools/fishing-spots/build-departure-point-verification-batch1.mjs --write`, 검사는 같은 명령에서 `--write`를 제외하여 수행한다.
