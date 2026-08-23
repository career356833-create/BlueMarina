# MBRIS 상세 API 필드 매핑

**작성일**: 2026-08-01 (잠정본) → **2026-08-03 실응답 기준 갱신**
**상태**: ✅ **Tier A 5종 실제 인증 응답으로 검증 완료**

`MBRIS_API_KEY` 발급 후 `data.go.kr`(서비스 15094770, `GET /B553482/mbrisdataview3/taxonlist3`)에 실제로 요청해 갈치(BM-SPECIES-000444)·고등어(BM-SPECIES-000417)·참돔(BM-SPECIES-000755)·주꾸미(BM-SPECIES-003107)·꽃게(BM-SPECIES-005640) 5종을 수집했다. **아래 내용은 Swagger 문서가 아니라 이 실제 응답을 근거로 작성했다.** 잠정본에서 "미확인"이라 표시했던 항목은 전부 확정하거나, 확정할 수 없는 이유를 명시했다.

원본 fixture: `data/mbris/raw/detail/{internalId}/response.xml` (5종 전부 보존)

---

## HTTP/헤더

| 항목 | 값 | 비고 |
|---|---|---|
| status code | `200` | 5종 전부 동일 |
| `<header><ResultCode>` | `"00"` | 5종 전부 동일 — 성공 코드로 확인됨 |
| `<header><ResultMsg>` | `"Normal Code"` | 5종 전부 동일 |
| header 태그 대소문자 | **PascalCase**(`ResultCode`/`ResultMsg`) | body 쪽(`items`/`numOfRows`/`pageNo`/`totalCount`)은 camelCase라 표기 방식이 header/body 간에 다르다. 잠정본은 camelCase(`resultCode`)로 가정해 실제로는 항상 파싱에 실패하고 있었다(§Normalizer 변경 참고) |

---

## 필드 매핑

| API Field | 실제 의미 | Normalized Field | 예시 |
|---|---|---|---|
| `SpcTxnId` | MBRIS 내부 종 트랜잭션 ID | `sourceId`(basic/taxonomy 아님, 최상위 식별자 전용) | `"270000018232"` |
| `Kingdom` | 계(界, 라틴) | 매핑 안 함(KingdomKR만 사용) | `"Animalia"` |
| `KingdomKR` | 계(국문) | `taxonomy.kingdom` | `"동물계"` |
| `PhylumDivision` | 문(門, 라틴) | 매핑 안 함(PhylumDivisionKR만 사용) | `"Chordata"` |
| `PhylumDivisionKR` | 문(국문) | `taxonomy.phylum` | `"척삭동물문"` |
| `Class` | 강(綱, 라틴) | 매핑 안 함(ClassKR만 사용) | `"Teleostei"` |
| `ClassKR` | 강(국문) | `taxonomy.class` | 어류 3종(갈치·고등어·참돔) 전부 **빈 값(null)** — 원본 데이터 공백. 주꾸미="두족강", 꽃게="연갑강"은 정상 채워짐 |
| `Order` | 목(目, 라틴) | 매핑 안 함(OrderKR만 사용) | `"Scombriformes"` |
| `OrderKR` | 목(국문) | `taxonomy.order` | `"고등어목"` |
| `Family` | 과(科, 라틴) | 매핑 안 함(FamilyKR만 사용) | `"Trichiuridae"` |
| `FamilyKR` | 과(국문) | `taxonomy.family` | `"갈치과"` |
| `SpcScitfNm` | 학명(명명 권위자 인용 포함 원문) | `basic.scientificName` | `"Trichiurus japonicus Temminck & Schlegel, 1844"` |
| `SpcScitfNmShort` | 학명(권위자 제외, canonical) | `basic.scientificNameShort` | `"Trichiurus japonicus"` — taxonomy-master.json의 `scientificNameCanonical`과 비교 가능 |
| `CommKorNm` | 국명 | `basic.koreanName` | `"갈치"` |
| `SpcTyp` | **의미 불명** | 매핑 안 함(rawApiFields에만 보존) | `"기타"` — 5종 전부 동일값이라 이 enum이 실제로 무엇을 구분하는지(어류/패류 등?) 이번 샘플로는 판단 불가 |
| `ABST` | 개요(형태+생태+식성 등 종합 서술) | `ecology.extra.overview` | (긴 서술문, FORM/ECOL 내용을 포괄하는 경우가 많음) |
| `FORM` | 형태(외형 묘사) | `ecology.form` | `"주둥이는 뾰족하며..."` |
| `ECOL` | 생태(서식 수심·회유 시기 등, FORM과 별개) | `ecology.ecologyNotes` | `"연안의 표층성 어류이며... 2~3월경 제주도에서 동해와 서해로 북상..."` — **잠정본에는 없던 필드**, 실응답으로 새로 확인 |
| `CULTIVINF` | 양식 정보 | `ecology.extra.aquacultureInfo` | 5종 전부 빈 값 |
| `BIOCHEMICAL` | 생화학 정보 | `ecology.extra.biochemicalInfo` | 5종 전부 빈 값 |
| `ACTIVINFO` | 활성 정보 | `ecology.extra.activityInfo` | 5종 전부 빈 값 |
| `NADI` | **국내 분포** — 방향 확정 | `ecology.domesticDistribution` | `"우리나라의 서해(충남 태안, 전북 군산...), 동해(경북 포항), 남해(부산)..."` |
| `INDI` | **해외 분포** — 방향 확정 | `ecology.internationalDistribution` | `"북서태평양의 일본 남부, 중국, 대만 주변 해역"` |
| `HABI` | 서식지 | `ecology.habitat` | **5종 전부 빈 값(null)** — 필드는 존재하지만 이 5종에 대해서는 채워지지 않음(다른 종은 채워질 가능성 배제 못 함) |
| `UTLZ` | 활용/이용(식용법 등) | `ecology.extra.utilization` | `"주요 상업어종으로, 구이, 찜 등으로 이용된다."` — 주꾸미는 빈 값 |
| `CorrNmTyp` | 명명 상태(정명/이명 등) | `taxonomicStatus.nameType` | `"정명"` — 5종 전부 동일값이라 이명(synonym) 케이스는 아직 관찰 못함 |
| `CorrSpcScitfNm` | 정정된(유효) 학명 | `taxonomicStatus.correctedScientificName` | 5종 전부 `SpcScitfNm`과 동일 |

`SpcTxnId`(비어 있지 않음)와 `Genus`(**API 응답 어디에도 없음**, 5종 전부 확인)는 표 위에 이미 반영했다.

---

## 존재 확정 / 미존재 확정 / 의미 불명 구분

### 존재 확정(5종 실응답으로 검증)

`SpcTxnId`, `Kingdom`/`KingdomKR`, `PhylumDivision`/`PhylumDivisionKR`, `Class`/`ClassKR`, `Order`/`OrderKR`, `Family`/`FamilyKR`, `SpcScitfNm`, `SpcScitfNmShort`, `CommKorNm`, `SpcTyp`, `ABST`, `FORM`, `ECOL`, `CULTIVINF`, `BIOCHEMICAL`, `ACTIVINFO`, `NADI`, `INDI`, `HABI`, `UTLZ`, `CorrNmTyp`, `CorrSpcScitfNm` — 총 27개 필드, 5종 모두 동일한 필드 집합(`observedFields`)이 관찰됨.

### 미존재 확정(잠정본의 예상이 실응답으로도 재확인됨)

`growth`, `spawning`, `prey`, `poison`, `migration`, `lifetime` — Swagger 문서에도 없었고, 5종 실응답에도 없다. 생성하지 않는다(null도 만들지 않고 필드 자체를 스키마에서 뺀다).

### 의미 불명(존재는 하지만 뜻을 단정하지 않음)

- `SpcTyp` — 5종 전부 `"기타"`. enum 전체 값을 모르는 채로 정규화 스키마에 넣지 않았다(추측 데이터 생성 금지 원칙).
- `CorrNmTyp` — 5종 전부 `"정명"`이라 다른 값(이명 등)이 어떤 문자열로 오는지 모른다. 필드 자체는 `taxonomicStatus.nameType`으로 옮겼지만, 값의 전체 enum은 확정하지 않았다.

---

## 잠정본에서 확정으로 바뀐 항목

| 항목 | 잠정본(2026-08-01) | 실응답 확정(2026-08-03) |
|---|---|---|
| `resultCode` 성공값 | 미기재 | `"00"` |
| `NADI`/`INDI` 방향 | 미확인(추정) | NADI=국내, INDI=해외로 확정 |
| header 태그 표기 | camelCase로 가정 | 실제로는 PascalCase(`ResultCode`) — **파서 버그 발견 및 수정**(아래 참고) |
| 학명 정확매칭 필드 | `SpcScitfNm` 사용 가정 | `SpcScitfNm`은 권위자 인용 포함이라 canonical 비교엔 부적합 — `SpcScitfNmShort`가 맞는 필드였음(**매칭 로직 버그 발견 및 수정**) |
| `PhylumDivision`/`PhylumDivisionKR` | 표에서 누락 | 실존 확인, `taxonomy.phylum`으로 매핑 추가 |
| `ECOL` | 표에서 누락 | 실존 확인(FORM과 별개 내용), `ecology.ecologyNotes`로 매핑 추가 |
| 이미지 관련 필드 | "0건"(문서 전수 확인) | 5종 실응답에서도 0건 재확인 |

---

## Normalizer 변경 (`tools/mbris/src/detail_normalizer.py`)

1. `FIELD_MAP`에 `taxonomy.kingdom`(← `KingdomKR`), `taxonomy.phylum`(← `PhylumDivisionKR`), `ecology.ecologyNotes`(← `ECOL`), `basic.scientificNameShort`(← `SpcScitfNmShort`) 4개 추가.
2. `CorrNmTyp`/`CorrSpcScitfNm`을 위한 신규 최상위 섹션 `taxonomicStatus` 추가(taxonomy도 ecology도 아닌 "이 이름이 유효한가"라는 별개 개념이라 분리).
3. `SpcTyp`은 의미가 불명확해 정규화 스키마에 넣지 않음(단, `rawApiFields`에는 그대로 보존되어 데이터 손실 없음).
4. `REMOVED_NO_MATCH_FIELDS`(growth 등 6개)는 실응답으로도 여전히 미존재 확인되어 그대로 유지.

## 그 외 코드 수정

- **`tools/mbris/src/xml_parser.py`**: `<header>` 하위 `ResultCode`/`ResultMsg`를 PascalCase로도 찾도록 수정. 수정 전에는 항상 `None`을 반환하고 있었다(5종 실응답으로 확인).
- **`tools/mbris/src/detail_collector.py`**(`select_best_item`): 학명 정확매칭 비교 대상을 `SpcScitfNm`(권위자 포함)에서 `SpcScitfNmShort`(canonical)로 변경. 수정 전에는 5종 전부 "학명 불일치 — 수동 검토 권장"으로 오탐되고 있었다(실제로는 전부 정확히 일치하는 종이었음).
- **`tools/mbris/tests/test_real_response_mapping.py`**: 라이브 테스트 skip 조건이 `os.environ.get("MBRIS_API_KEY")`만 봐서 `.env` 파일로 설정한 키를 못 감지하던 버그를 `load_config().is_configured`로 수정. 이 버그 때문에 키가 있어도 라이브 테스트 6개가 계속 skip되고 있었다.

---

## 이미지

`taxonlist3` 응답 27개 필드 중 이미지/URL 관련 필드 **0건**(`data/mbris/reports/mbris-image-api-analysis.json` 참고). 이 엔드포인트만으로는 이미지를 제공하지 않는다 — 별도 엔드포인트가 data.go.kr에 등록돼 있는지는 이번 조사 범위 밖이라 미확인.

---

## 남은 미확인 사항(5종 샘플의 한계)

1. `SpcTyp`/`CorrNmTyp`의 전체 enum 값 — 5종이 전부 같은 값이라 다른 케이스(이명, 다른 SpcTyp)를 못 봤다.
2. `HABI`가 항상 비어 있는지, 아니면 이 5종만 우연히 비어 있었는지 — 86종 전체로 확대해야 확실해진다.
3. `ClassKR`이 비어 있는 게 "어류 전반"의 패턴인지 "이 3종만"의 우연인지 — 마찬가지로 표본 확대 필요.
