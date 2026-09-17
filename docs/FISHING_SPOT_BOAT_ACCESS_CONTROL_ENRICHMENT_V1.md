# Fishing Spot Boat Access & Control Enrichment V1

## Decision

`ACCESS_CONTROL_SOURCE_TOO_SPARSE`

선상낚시 포인트 329건의 access/control source coverage를 조사했다. 공식 원본은 329행 모두 추적되지만 spot별 parking, boarding procedure, restriction, permit 여부를 제공하지 않는다. 따라서 `BOAT_REQUIRED`만 source-backed 값으로 유지하고 나머지 필드는 `null` 또는 `UNKNOWN`으로 남겼다.

## Coverage

| 영역 | confirmed | partial | unknown |
| --- | ---: | ---: | ---: |
| access | 0 | 329 | 0 |
| parking | 0 | 0 | 329 |
| boarding | 0 | 0 | 329 |
| control | 0 | 0 | 329 |

Access가 partial인 이유는 해양수산부 공식 데이터셋이 329건을 선상낚시 포인트로 정의하여 `BOAT_REQUIRED`를 뒷받침하기 때문이다. 이 범위 근거는 출항항, 주차, 승선 절차, 통제 또는 허가를 확인하지 않는다.

## Official source audit

공공데이터포털의 `해양수산부_공동활용체계_선상낚시포인트_20231231`은 총 329행이다. 공개 컬럼은 공간정보일련번호, 공간정보, 포인트명 1·2, 수심, 저질, 물때, 낚시방법, 좌표, 고시내용, 행정구역이다. Parking, boarding, restriction, permit 전용 컬럼은 없다.

- official source rows traced: 329/329
- 별도 공공 지명 근거 검토: 16건
- spot-specific detailed access source: 0건
- detailed access unresolved: 329건
- non-empty `고시내용`: 29건
- 현재 boat spot에 정확히 적용 가능한 `고시내용`: 0건

29개의 `고시내용`은 같은 권역에 있는 별도 갯바위·방파제의 도보·차량·낚싯배 접근 또는 안전 설명이다. 각 행의 선상 fishing spot과 명칭이 일치하지 않으므로 parking, boarding, restriction 값으로 적용하지 않았다.

## Field decisions

### Parking

329건 모두 `null`이다. 항만이나 선착장의 존재, 도로 언급 또는 주변 시설만으로 주차 가능 여부를 만들지 않았다.

### Boarding

329건 모두 `null`이다. 출항 후보 명칭과 일반 낚시어선 이용 사실은 특정 spot의 승선 장소·절차를 확인하지 않는다.

### Restriction and permit

`restriction`, `permitRequired`, `closedArea`, `timeRestriction`, `permitType`, `authority`는 329건 모두 `null`이다. 일반 항만 규칙을 특정 spot에 자동 적용하지 않았고, 제한 자료가 없다는 사실을 출입 자유로 해석하지 않았다.

## Coordinate safety holds

`boat-60`, `boat-128`, `boat-129`, `boat-321`의 coordinate safety hold는 변경하지 않았다. Hold release는 0건이다.

## Scope and invariants

- parking inference: 0
- boarding inference: 0
- restriction inference: 0
- permit inference: 0
- production enrichment mutation: 0
- coordinate mutation: 0
- runtime mutation: 0
- DB/Supabase write: 0
- navigation hold release: 0

결과는 research dataset과 audit report에만 기록한다. `node tools/fishing-spots/build-boat-access-control-enrichment.mjs --write`로 생성하고, 같은 명령에서 `--write`를 제외해 결정성을 검사한다.
