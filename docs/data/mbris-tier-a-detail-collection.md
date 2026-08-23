# MBRIS Tier A Detail Collector

**작성일**: 2026-07-31
**대상**: Service Tier A 86종(`data/mbris/priority/service-tier-a.json`)

---

## 0. 먼저 확인한 것 — 실제 API가 존재하는가

작업 지시서는 필드명을 `mfClassKor`, `mfOrderKor`, `spcId`, `mfDistribution` 등으로 예상했다. 코드를 쓰기 전에 이 API가 실제로 존재하는지, 예상 필드가 맞는지부터 조사했다.

**결론: API는 실존한다. 예상 필드명은 전부 틀렸다.**

- 공공데이터포털 등록 서비스: **국립해양생물자원관_해양생물종정보 서비스** (data.go.kr 15094770)
- 실제 엔드포인트: `GET https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3`
- Swagger 명세로 확인한 실제 응답 필드(26~27개): `Kingdom/KingdomKR, PhylumDivision/PhylumDivisionKR, Class/ClassKR, Order/OrderKR, Family/FamilyKR, SpcScitfNm, CommKorNm, SpcTyp, ABST, FORM, ECOL, CULTIVINF, BIOCHEMICAL, ACTIVINFO, NADI, INDI, HABI, UTLZ, CorrNmTyp, CorrSpcScitfNm, SpcTxnId, SpcScitfNmShort`
- 지시서가 예상한 `mfDistribution`, `mfHabitat`, `mfFeature`, `mfGrowth`, `mfOviposition`, `mfPrey`, `mfPoison`, `mfSpecial`, `mfMigration`, `mfLifetime`, `spcId`, `spcKrNm`, `spcScinm` — **이런 이름의 필드는 존재하지 않는다.**

이 사실을 반영해 `detail_normalizer.py`는 하드코딩된 필드 목록에만 의존하지 않고, 응답에 실제로 들어있는 모든 요소를 무손실 보존하도록 만들었다(`rawApiFields`).

**중요한 한계**: 이 조사는 인증 없이 볼 수 있는 Swagger 문서 기준이다. **실제 인증된 응답 샘플은 아직 확보하지 못했다** — API 키가 없기 때문이다(아래 참조). `resultCode` 성공값, `NADI`/`INDI`가 정확히 국내/해외 중 무엇인지 같은 세부사항은 문서에 명시돼 있지 않아 **잠정 추정**이다.

---

## 1. 수집 결과

| 항목 | 값 |
|---|---:|
| 대상 | 86종(Tier A) |
| 성공 | **0** |
| 실패 | **2**(샘플 검증용 2건만 시도, 나머지 84종은 미시도) |
| 재시도 | 0회(401은 재시도 대상 아님 — 정상 동작) |
| 실행 시간 | 3.5초(2건) |

### 왜 0건 성공인가 — API 키가 없다

이 환경에는 `MBRIS_API_KEY`가 설정돼 있지 않다(`.env` 없음, 환경변수 없음). data.go.kr은 로그인 후 "활용신청"으로 키를 발급받아야 하는데, 그 계정 발급은 내가 대신 할 수 없다.

**그래도 파이프라인이 실제로 동작하는지는 검증했다.** 임의의 가짜 키로 실제 게이트웨이(`apis.data.go.kr`)에 2건을 진짜로 호출했다:

```
[  1/2] ❌ 말쥐치      BM-SPECIES-000129 — failed
[  2/2] ❌ 삼치       BM-SPECIES-000408 — failed
소요 3.5초
```

두 건 모두 실측대로 **HTTP 401 + 평문 "Unauthorized"**가 왔고, `error_type=auth_error`로 정확히 분류돼 재시도 없이(각 1회 시도) 종료됐다 — 재시도했다면 10+30+90초가 걸렸을 텐데 3.5초 만에 끝난 것이 비재시도 로직이 실제로 작동한 증거다. 요청/응답이 `data/mbris/raw/api/`에 그대로 남아 있다.

**결론: 코드는 준비됐다. 진짜 키만 있으면 그대로 돌아간다.**

---

## 2. API

| 항목 | 값 |
|---|---|
| endpoint | `GET https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3` |
| 인증 | 쿼리파라미터 `serviceKey`(필수). data.go.kr "활용신청"으로 발급, 개발계정 일 8,000건 |
| request parameter | `serviceKey`(필수) / `pageNo`, `numOfRows`, `SpcScitfNm`(학명검색), `CommKorNm`(국명검색), `Family`, `FamilyKR`(과명검색), `SpcTxnId`(종 식별자) — 전부 선택 |
| response format | **XML** (`header.resultCode/resultMsg` + `body.items.item[]` + `numOfRows/pageNo/totalCount`) |
| 종 ID 발급 | MBRIS 국가목록 XLSX(`taxonomy-master.json`)에는 `SpcTxnId`가 없다. **학명(`SpcScitfNm`)으로 먼저 검색해 `SpcTxnId`를 얻는 방식**으로 구현했다. 검색 결과가 비면 국명(`CommKorNm`)으로 재검색한다. |

실측 확인: 인증 실패는 XML이 아니라 순수 텍스트 `Unauthorized`(HTTP 401)로 온다 — data.go.kr의 일반적인 XML 에러 포맷과 다르다. 게이트웨이 레벨 오류이기 때문으로 보인다.

---

## 3. 필드

### 기본(basic)
`CommKorNm`(국명) → `basic.koreanName`, `SpcScitfNm`(학명) → `basic.scientificName`

### 분류(taxonomy)
`ClassKR`/`OrderKR`/`FamilyKR` → `class`/`order`/`family`. **`Genus`(속) 필드는 API에 없다** — `taxonomy.genus`는 항상 `None`이며, 필요하면 이미 확보한 `taxonomy-master.json`에서 보강해야 한다.

### 생태(ecology)
| 요청 스키마 필드 | 실제 대응 | 비고 |
|---|---|---|
| `habitat` | `HABI` | 대응 있음 |
| `feature` | `FORM` | 대응 있음 |
| `distribution` | 없음(직접 대응 안 됨) | `NADI`/`INDI` 2개로 쪼개져 있고 어느 쪽이 국내/해외인지 문서에 명시 안 됨 → `extra`에 원문 보존 |
| `growth`/`spawning`/`prey`/`poison`/`migration`/`lifetime` | **없음** | 이 API에 해당 필드 자체가 없다. 지시서의 `mfGrowth`, `mfOviposition` 등은 실재하지 않는다 |

### 요청 스키마에 없지만 실제로 존재하는 필드(버리지 않고 `ecology.extra`에 보존)
`ABST`(개요) → `overview`, `NADI`/`INDI` → `domesticDistribution`/`internationalDistribution`(추정), `UTLZ`(활용) → `utilization`, `CULTIVINF`(양식정보) → `aquacultureInfo`, `BIOCHEMICAL`(생화학정보) → `biochemicalInfo`, `ACTIVINFO`(활용정보) → `activityInfo`

### 누락 필드
`growth, spawning, prey, poison, migration, lifetime` 6개는 이 API에 대응하는 필드가 존재하지 않는다. 지시서의 예상과 달리 만들어낼 수 없어 `None`으로 고정했다.

---

## 4. 이미지

| 항목 | 판정 |
|---|---|
| API 직접 제공(`api_direct`) | **아니오** — Swagger 명세 26개 필드 전수 확인, 이미지/사진 관련 필드 0개 |
| 상세 페이지 별도 호출(`detail_page_only`) | **unknown** — www.mbris.kr 웹사이트(별도 API 아님) 자체에 이미지가 있는지 확인을 시도했으나 정확한 URL 패턴을 찾지 못해 "비허용 접근" 페이지만 확인했다. 추측하지 않고 미확인으로 남긴다. |
| 종합 판정 | **`not_available`**(API 기준) |

`data/mbris/reports/image-field-analysis.json`에 근거와 함께 저장했다. 이번 단계 제한(이미지 대량 다운로드 금지)에 따라 웹사이트 쪽 추가 조사는 진행하지 않았다.

---

## 5. 품질

| 항목 | 값 |
|---|---:|
| 오류 | 2건(전부 `auth_error`, 원인 명확 — 키 없음) |
| 빈 필드 | 확인 불가(성공 사례 0건) |
| XML 문제 | 확인 불가(응답 자체가 XML이 아닌 401 텍스트였음 — 정상 처리됨) |
| 매칭 문제 | 확인 불가(성공 사례 0건) |

`data/mbris/reports/detail-collection-validation.json`, `data/mbris/state/detail-collection-state.json`에 실제 시도 2건의 실패 기록이 남아 있다.

---

## 6. 구현 파일

```
tools/mbris/
├─ .env.example                        MBRIS_API_KEY, MBRIS_API_BASE_URL
├─ src/
│  ├─ config.py                        환경변수/.env 로더 (키 미설정도 안전 처리)
│  ├─ api_client.py                    재시도(3회, 10/30/90초), 오류 분류 6종
│  ├─ xml_parser.py                    XML→dict, 필드 무손실 보존
│  ├─ api_logger.py                    모든 호출 원본 기록(requests/responses/logs)
│  ├─ detail_state.py                  resume 상태
│  ├─ detail_collector.py              검색→매칭→저장→정규화 오케스트레이션
│  └─ detail_normalizer.py             SpeciesDetail 정규화, extra 필드 보존
├─ collect_mbris_detail.py             --dry-run / --sample N / --tier-a / --force
├─ validate_mbris_detail.py            수집 결과 검증
├─ build_image_field_analysis.py       이미지 필드 조사
└─ tests/
   ├─ test_api_client.py               16개
   ├─ test_xml_parser.py               13개
   ├─ test_normalizer.py               11개
   └─ test_detail_collector.py         14개

data/mbris/
├─ raw/api/{requests,responses,logs}/  실제 2건의 401 시도 기록
├─ raw/detail/{internalId}/            (아직 없음 — 성공 사례 없음)
├─ normalized/detail/                  (아직 없음)
├─ state/detail-collection-state.json  2건 failed
└─ reports/
   ├─ image-field-analysis.json
   └─ detail-collection-validation.json
```

---

## 7. 테스트

**200개 작성 / 200개 통과**(기존 144개 + 신규 56개: api_client 16 + xml_parser 13 + normalizer 11 + detail_collector 14 + 부수 2)

검증 범위: 6종 오류 분류(401/403/429/5xx/timeout/빈응답), 401/403 비재시도·429/5xx/timeout 재시도+백오프 실측 로직, XML 필드 무손실 보존, 잘못된 XML·빈 응답·평문 401 안전 처리, 학명 정확일치/복수후보 자동확정 금지, 국명 재검색 전환, resume(재로드 후 skip), force 재수집, 원본 XML 불변, serviceKey 로그 미노출, 정규화 결정성.

---

## 8. 다음 단계

- **이미지 수집 여부**: 보류 — API에 없고 웹사이트 쪽은 unknown. 필요하면 웹사이트 URL 패턴부터 별도로 조사해야 한다.
- **AI 콘텐츠 생성 여부**: 하지 않음(이번 단계 제한)
- **HTML 데이터 설계 여부**: 하지 않음(이번 단계 제한)
- **즉시 필요한 조치**: `MBRIS_API_KEY` 발급(data.go.kr 15094770 "활용신청", 개발계정 자동승인) 후 `python collect_mbris_detail.py --sample 5`로 실제 응답 1건 확보 → `resultCode` 성공값, `NADI`/`INDI` 실제 의미, 실제 빈 필드 비율을 재확인하고 `detail_normalizer.py`를 보정한다. 그다음 `--tier-a`로 86종 전체 수집.

---

## 제한 준수

- 전체 4,332종 수집 ❌ (Tier A 86종만 대상, 실제 시도는 검증용 2건)
- 이미지 다운로드 ❌
- AI 생성 ❌ / HTML 제작 ❌ / 운영 DB 적재 ❌
- 학명 변경 ❌ (원문 `SpcScitfNm` 그대로 보존)
- synonym 자동 병합 ❌ (검색 결과 복수·불일치 시 자동 확정하지 않고 실패로 남김 — `select_best_item` 테스트로 검증)
- 낚시 대상 재판정 ❌
