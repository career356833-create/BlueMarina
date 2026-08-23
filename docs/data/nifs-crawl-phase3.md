# NIFS 어종정보 Phase 3 — 주요 수산자원 25종 전체 수집

**작성일**: 2026-07-31
**실행**: `python crawl_nifs.py all` (동시성 1, 요청 간격 2초)
**결과**: 25/25종 수집 성공, 실패 0건

---

## 0. 먼저 정정 — Phase 2 보고서의 수치 오기

Phase 2 **데이터 파일**(`phase2/list-validation.json`)은 정확했으나, 제가 쓴 **보고서 markdown의 colorLevel 표가 틀렸습니다.**

| 항목 | Phase 2 보고서 기재 | 실제 (데이터 파일·이번 실측 모두) |
|---|---|---|
| colorLevel 0 | 5개 (20%) | **7개** |
| colorLevel 1 | 4개 (16%) | **3개** |
| colorLevel 2 | 16개 (64%) | **15개** |

`display` 분포(Y 16 / N 4 / 공백 5)는 기재가 맞았습니다. Phase 2 보고서에 정정 표기를 넣었습니다.

---

## 1. 전체 수집

| 항목 | 결과 |
|---|---|
| 목록 | 25종 (기대치 일치) |
| 상세 성공 | **25 / 25** |
| 상세 실패 | **0** |
| 이미지 성공 | **66 / 66장** |
| 이미지 실패 | **0** |
| 총 저장 용량 | 16.9 MB (이미지 9.2 MB) |
| 총 실행 시간 | **190.1초** |
| 재시도 발생 | 0회 |

요청 정책: 동시성 1, 간격 2초, 타임아웃 30초, 재시도 3회(10→30→90초 백오프)

### resume 검증

전체 수집 후 `detail`을 재실행하면 `대상 0/25종 (완료 건너뜀 25)`로 전부 건너뛴다. `retry-failed`는 `실패 0종`을 보고하고 종료한다. 상태는 `data/nifs/state/crawl-state.json`에 어종별로 남는다.

---

## 2. 필드 완전성

### 전 종 존재 (25/25) — 8개

`koreanName`, `englishName`, `scientificName`, `feature`, `distribution`, `lifecycle`, `catchMethod`, `nutrition`

### 부분 존재 — 4개

| 필드 | 존재 | 없는 어종 |
|---|---|---|
| `dialect` | 23/25 | 말쥐치, 옥돔 |
| `prohibitSize` | 19/25 | 명태, 바지락, 붉은대게, 삼치, 옥돔, 주꾸미 |
| `recommendSize` | 17/25 | 대게, 명태, 바지락, 붉은대게, 삼치, 오분자기, 전갱이, 주꾸미 |
| `eatingNote` | 11/25 | 14종이 `"NA"` 반환 |

**부재 필드**: 없음. 정의한 12개 텍스트 필드 모두 최소 1종 이상에서 값이 나온다.

### NA 처리

출처가 문자열 `"NA"`를 반환하는 14종의 `eatingNote`는 설명으로 저장하지 않았다.

```json
{ "value": null, "sourceValue": "NA", "missingReason": "source_na" }
```

`prohibitSize`/`recommendSize`의 `0`도 값 없음(`null`)으로 정규화했다. 화면이 0일 때 해당 블록을 숨기기 때문이다.

---

## 3. 월별 소비 권장 정보

| 항목 | 결과 |
|---|---|
| 등급 값 | `1`(자제) 55건, `2`(지양) 59건 |
| 등급 `0`(권장) | **0건** |
| 종당 월 수 | 0개월 3종 / 3~8개월 20종 / 12개월 2종 |
| 잘못된 월 | 0 |
| 중복 월 | 0 |

### 핵심 발견 — 누락이 아니라 출처의 표현 방식

`periodList`는 **자제·지양 월만 반환한다.** 권장(green) 월은 응답에 아예 없고 화면이 기본색으로 그린다. 전 종에서 등급 `0`이 한 건도 오지 않은 것이 근거다.

따라서 `periodList`가 빈 어종(갯장어·기름가자미·전갱이)은 데이터 누락이 아니라 **12개월 전부 권장**이다. 반대로 명태는 12개월 전부 지양, 대문어는 12개월 전부 자제다.

정규화 레코드에 사실만 기록했다. 값을 만들어 채우지 않았다.

```json
"recommendPeriodOmittedMonths": [1,2,3,...],
"recommendPeriodOmittedMeaning": "권장",
"recommendPeriodNote": "periodList는 자제·지양 월만 반환한다. ..."
```

### 목록 `colorLevel`은 `periodList`에서 파생되지 않는다

전수 대조 결과 목록 등급과 `periodList` 최대 등급이 **19/25만 일치**한다. 고등어·낙지·대구·도루묵·살오징어·삼치 6종이 어긋난다(목록 0 또는 1인데 월별 최대는 2).

출처가 별도로 부여한 독립 값이므로 파생 계산하지 않고 `listColorLevel`로 원본 보존했다.

---

## 4. 어획량 이력

| 항목 | 결과 |
|---|---|
| 연도 범위 | **2000 ~ 2024** |
| 25개년 보유 | 21종 |
| 25개년 미만 | 개조개 22 / 명태 17 / 참홍어 15 / 기름가자미 10 |
| 중복 연도 | 0 |
| 정렬 | 전 종 오름차순 |
| 값 타입 | 문자열 → `float` 정규화, 원본은 `sourceValue`에 보존 |
| **단위** | **`null`** |

### 단위를 `null`로 둔 이유

`historyList` 응답에 `unit` 필드가 없다. 상세 화면 차트의 Y축 라벨에 `어획량(MT)`이 있으나, 이는 화면 하드코딩 문자열이지 데이터에 딸린 단위가 아니다. **추측해서 채우지 않았고** 보고서에 기록한다.

DB 적재 전에 NIFS 통계 원문으로 단위를 확인해야 한다.

---

## 5. 이미지

| 항목 | 결과 |
|---|---|
| 전체 | **66장** (전부 유효, 손상 0, 0바이트 0) |
| 어종당 | 3장 16종 / 2장 9종 |
| 포맷 | JPEG 66/66 |
| 해상도 | 폭 444~4032 / 높이 267~3024 |
| 파일 크기 | 23 KB ~ 980 KB (합계 9.2 MB) |
| 워터마크 | 10장 (`_watermark` 파일명) |
| 중복 | **26장** |

### 역할

| 역할 | 수 |
|---|---|
| `list_thumbnail` | 25 |
| `detail_primary` | 25 |
| `detail_secondary` | 16 |

역할은 **수집 경로와 `imgList` 순서로만** 부여했다. API와 DOM 어디에도 역할 필드가 없으므로 `male`/`female`/`habitat` 같은 의미를 임의로 붙이지 않았다.

### 중복 26장의 정체

25종 전부에서 **목록 썸네일과 상세 첫 이미지가 동일 파일**이다(SHA-256 일치). 나머지 1건은 개조개의 상세 2장이 서로 같다.

즉 실제 고유 이미지는 **40장**이다. 서비스에서는 대표 1장 + 보조 1장 구조로 쓰면 된다. `duplicate-images.csv`에 전건 기록했다.

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| 테스트 | **55개 작성 / 55개 통과** |
| 상세 검증 | 25/25 통과 |
| 실패 항목 | **0** (`failed-items.csv` 0행) |
| 목록 중복 ID·이름 | 0 |
| 빈 ID·이름 | 0 |
| 이미지 손상 | 0 |
| 수동 검수 필요 | **46건** |

테스트는 실사이트 호출과 분리했다. `tests/fixtures/`에 실제 API 응답 5개를 고정해 두어 네트워크 없이 전부 실행된다.

### 수동 검수 46건 내역

| 사유 | 건수 | 권고 |
|---|---|---|
| 목록·상세 이미지 동일 | 26 | 대표 이미지 1장만 사용 |
| 출처가 NA 반환 (`eatingNote`) | 14 | 서비스 노출 제외 |
| 지양 크기 없음 (`prohibitSize`) | 6 | 수산자원관리법 원문 대조 |

---

## 7. language 파라미터 조사

`""`, `ko`, `kor`, `en`, `eng` 5개 값을 시험했다.

| language | status | 건수 | 기준과 동일 |
|---|---|---|---|
| `""` | 200 | 25 | — |
| `ko` | 200 | 25 | ✅ |
| `kor` | 200 | 25 | ✅ |
| `en` | 200 | 25 | ✅ |
| `eng` | 200 | 25 | ✅ |

**결론**: 서버가 `language`를 무시한다. fishId 집합·이름·필드 구조가 전부 동일하다. 추가 어종도, 영문 목록도 없다. 기본값 공백으로 수집했다.

추가 파라미터 탐색은 하지 않았다.

---

## 8. 저장 구조

```
data/nifs/
├─ raw/                          원본 (변형 금지)
│  ├─ list/
│  │  ├─ source-response.json    API 원본 바이트 그대로
│  │  ├─ fish-index.json / .csv
│  │  └─ metadata.json           요청 계약 + contentHash
│  └─ fish/{fishId}/
│     ├─ detail-response.json    상세 API 원본
│     ├─ parsed-source.json      rawApiKeys + mappedFields
│     ├─ source-metadata.json    요청·응답 메타 + 해시
│     └─ images/
│        ├─ original/image-00N.jpg
│        └─ image-metadata.json
├─ normalized/                   가공 (raw와 물리 분리)
│  ├─ fish/{fishId}.json
│  ├─ nifs-fish-25.json / .csv
│  └─ normalization-summary.json
├─ state/crawl-state.json        resume·재시도용
├─ reports/                      검증 산출물 8종
└─ versions/{fishId}/{timestamp}/  원본 변경 시 이전본 보존
```

원본은 한 번도 덮어쓰지 않았다. `archive_if_changed()`가 내용 변화를 감지하면 기존 파일을 `versions/`로 옮긴 뒤에 쓴다. 이번 실행에서는 변경이 없어 `versions/`가 비어 있다.

---

## 9. 구현·수정 파일

| 경로 | 역할 |
|---|---|
| `tools/nifs-crawler/crawl_nifs.py` | CLI 오케스트레이터 (8개 명령) |
| `tools/nifs-crawler/src/paths.py` | raw/normalized 경로 분리 |
| `tools/nifs-crawler/src/state.py` | 상태 저장·resume·버전 보존 |
| `tools/nifs-crawler/src/normalizer.py` | 정규화, NA·단위·월 처리 |
| `tools/nifs-crawler/src/image_client.py` | 이미지 수집·판독·중복 탐지 |
| `tools/nifs-crawler/src/validator.py` | 전수 검증·집계·CSV |
| `tools/nifs-crawler/src/detail_client.py` | (Phase 2.5) HTTP 클라이언트 |
| `tools/nifs-crawler/src/detail_parser.py` | (Phase 2.5) 파서 |
| `tools/nifs-crawler/test_language_param.py` | language 보조 조사 |
| `tools/nifs-crawler/tests/test_phase3.py` | 39개 테스트 |
| `tools/nifs-crawler/tests/test_detail_parser.py` | 16개 테스트 |
| `tools/nifs-crawler/tests/conftest.py` | fixture 로더 |
| `tools/nifs-crawler/tests/fixtures/` | 실제 API 응답 5개 고정 |

---

## 10. 판정

### DB 적재 가능 — 조건부 가능

25종 전부 수집·검증을 통과했고 스키마가 안정적이다. 다만 적재 전 **3가지를 먼저 해결해야 한다.**

1. **어획량 단위 확정** — 출처에 없다. MT로 단정하면 안 된다
2. **`prohibitSize` 6종 공백** — 수산자원관리법 원문 대조 필요
3. **중복 이미지 26장** — 대표/보조 정리 후 적재

`factReviewStatus: "pending"`으로 두었다. 사실 검수 전 서비스 노출은 하지 않는 것이 맞다.

### 기존 `fish-data.ts`와 매핑 — 가능하나 부분적

| 기존 `FishItem` | NIFS | 매핑 |
|---|---|---|
| `name` | `koreanName` | ✅ 직접 |
| `description` | `feature` | ✅ 대체 가능 (출처 명확) |
| `habitat` | `distribution` | ⚠️ 의미가 다름 (분포 ≠ 서식지) |
| `season` | `recommendPeriod` | ⚠️ 제철 ≠ 소비 권장. 혼동 주의 |
| `fishingTips` | `catchMethod` | ⚠️ 어업 통계지 낚시 팁이 아님 |
| `caution` | `prohibitSize` | ✅ 근거 강화 |
| — | `scientificName`, `englishName`, `dialect`, `nutrition`, `catchHistory` | ✅ 신규 |

`fish-data.ts`는 약 100종, NIFS는 25종이다. **교집합 25종만 검증·보강**하는 용도로 쓰고 나머지 75종은 손대지 않는 것이 맞다. 이번 단계에서 `fish-data.ts`는 수정하지 않았다.

### 추가 원천 필요 — 필요

25종은 Blue Marina 어종백과의 전수가 아니다. Phase 2.5에서 판정했듯 **소비 권장 중심 주요 수산자원 목록**이다. 어종백과를 목표로 하면 별도 원천이 필요하다.

### 다음 단계 후보

1. 단위·금지체장 사실 검수 후 Supabase 스키마 설계
2. `fish-data.ts` 25종 교차 검증 (학명·영문명 오류 탐지)
3. 어종백과용 추가 원천 조사

---

## 11. 제한 준수

- Supabase·운영 DB 적재 ❌ 하지 않음
- `fish-data.ts` 수정 ❌ 하지 않음
- 25종을 전체 어종백과로 간주 ❌ 하지 않음
- AI 설명·이미지 생성 ❌ 하지 않음
- 원본 이미지 변형 ❌ 하지 않음
- `infoCookHow`를 조리법으로 저장 ❌ `nutrition`으로 매핑
- `"NA"`를 설명으로 저장 ❌ `missingReason: source_na`
- 출처에 없는 단위 추측 ❌ `unit: null`
- 실패를 성공으로 기록 ❌ 실패 0건, `failed-items.csv` 0행
- 원본 덮어쓰기 ❌ `versions/` 보존 경로 구현
