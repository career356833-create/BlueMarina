# MBRIS API 실제 응답 검증 및 Tier A Detail Normalization 보정

**작성일**: 2026-08-01
**대상 5종**: 갈치·고등어·참돔·주꾸미·꽃게 (전부 Tier A 소속 확인됨)

---

## 0. 진행 방식 — 사용자 확인 후 범위 축소

이 작업의 핵심 전제는 "API Key로 실제 응답 5종을 확보"였다. 착수 전 확인한 결과 이 환경에는 `MBRIS_API_KEY`가 **어디에도 없었다** — bash/PowerShell 환경변수, `tools/mbris/.env` 파일 전부 미설정.

```bash
$ python -c "import os; print(bool(os.getenv('MBRIS_API_KEY')))"
False
```

사용자에게 확인한 결과 **"키 없이 가능한 부분만 먼저 진행"**을 선택했다. 그래서 이번 단계는 다음과 같이 범위를 나눴다.

| 섹션 | 내용 | 이번 단계 처리 |
|---|---|---|
| §2 Sample Collection | 실제 API로 5종 수집 | **보류** — 키 없음 |
| §3 실제 응답 검증 | 실제 XML로 필드 확인 | **보류** — 실응답 없음 |
| §6 이미지 재조사 | 실응답 기준 이미지 필드 재확인 | **보류** — 이전 단계(Swagger 문서 기준) 결과 유지 |
| §4 Normalizer 수정 | 새 스키마 반영 | **완료** |
| §5 필드 매핑 문서 | 매핑표 작성 | **완료(잠정본)** |
| §7 Tier A dry-run | 전체 수집 준비 확인 | **완료** |
| §8 테스트 | fixture + 실API 분리 테스트 | **완료** |

이 보고서 전체에서 "잠정"이라고 표시한 내용은 인증된 실응답이 아니라 Swagger 문서 근거임을 뜻한다.

---

## 1. API

| 항목 | 값 |
|---|---|
| endpoint | `GET https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3` |
| 인증 | 쿼리파라미터 `serviceKey` — **이번 단계에서 미확보** |
| 응답 형식 | XML (`header.resultCode/resultMsg` + `body.items.item[]`) |

변경 없음(이전 단계에서 이미 확인). 실응답을 못 받았으므로 갱신할 내용이 없다.

---

## 2. 샘플

| 항목 | 값 |
|---|---:|
| 대상 5종 | 갈치(BM-SPECIES-000444) / 고등어(BM-SPECIES-000417) / 참돔(BM-SPECIES-000755) / 주꾸미(BM-SPECIES-003107) / 꽃게(BM-SPECIES-005640) |
| 성공 | **0**(키 없어 실행 안 함) |
| 실패 | **0**(§2를 아예 실행하지 않았다 — 이전 단계에 남아 있던 무관한 실패 2건(말쥐치·삼치, 가짜 키 검증용)은 이 5종과 무관) |

5종 전부 `service-tier-a.json`에서 확인했고, 학명이 서로 겹치지 않는 것도 확인했다(`test_real_response_mapping.py::test_샘플5종_전부_학명이_서로_다르다`).

---

## 3. 필드

### 기본 — 잠정(문서 기준)

| API Field | 정규화 필드 |
|---|---|
| `CommKorNm` | `basic.koreanName` |
| `SpcScitfNm` | `basic.scientificName` |

### 분류 — 잠정(문서 기준)

| API Field | 정규화 필드 |
|---|---|
| `ClassKR` | `taxonomy.class` |
| `OrderKR` | `taxonomy.order` |
| `FamilyKR` | `taxonomy.family` |
| **Genus** | **문서상 대응 필드 없음 → `taxonomy.genus`는 항상 `None`** |

### 생태 — 잠정(문서 기준)

| API Field | 정규화 필드 |
|---|---|
| `HABI` | `ecology.habitat` |
| `FORM` | `ecology.form` |
| `NADI` | `ecology.domesticDistribution`(방향 미확인) |
| `INDI` | `ecology.internationalDistribution`(방향 미확인) |

### 누락(대응 필드 없음, §4에서 스키마 제거)

`growth`, `spawning`, `prey`, `poison`, `migration`, `lifetime` — 6개 전부 이 API에 존재하지 않는다. 이번에 정규화 스키마에서 완전히 제거했다(값이 아니라 필드 자체가 결과에 나타나지 않는다).

전체 매핑표: [mbris-api-field-map.md](./mbris-api-field-map.md)

---

## 4. Normalizer

### 변경 내용

`tools/mbris/src/detail_normalizer.py`를 지시서의 새 스키마로 교체했다.

| 이전 | 이후 |
|---|---|
| `ecology.feature` | `ecology.form` (이름 변경) |
| `ecology.distribution`(항상 None) | `ecology.domesticDistribution` + `ecology.internationalDistribution`(NADI/INDI 직접 매핑) |
| `ecology.growth/spawning/prey/poison/migration/lifetime`(항상 None) | **필드 자체를 제거** |
| `source.collectedAt/responseHash`만 존재 | `source.apiEndpoint` 추가 |
| `ecology.extra`에 `domesticDistribution`/`internationalDistribution` 임시 보관 | 1차 필드로 승격, extra에서는 제거(중복 방지) |

`ecology.extra`(개요/활용/양식정보/생화학정보/활용정보)는 유지했다 — 스키마엔 없지만 실제 존재하는 데이터라 버리면 손실이기 때문이다.

### 테스트

`test_field_mapping.py`(11개)로 각 API 필드가 정확히 그 정규화 필드로만 가는지 개별 검증했고(`FIELD_MAP`과 `EXTRA_FIELD_MAP`의 소스 필드가 겹치지 않는지도 포함), `test_missing_fields.py`(16개)로 필드가 없을 때 빈 문자열이 아니라 반드시 `None`이 되는지, XML에 요소 자체가 없는 경우와 요소는 있으나 내용이 빈 경우를 구분해서 검증했다.

---

## 5. 이미지

**이번 단계에서 재조사하지 않았다**(사용자 선택으로 §6 보류). 이전 단계 결과를 그대로 유지한다.

| 항목 | 값(이전 단계, Swagger 문서 기준) |
|---|---|
| API 이미지 필드 | `not_available`(26개 필드 전수 확인, 이미지 관련 0개) |
| 웹사이트 상세페이지 | `unknown`(URL 패턴 미확인) |

`data/mbris/reports/image-field-analysis.json`은 변경하지 않았다 — 문서 기준 값을 실응답 기준인 것처럼 덮어쓰지 않기 위해서다.

---

## 6. Tier A dry-run 결과

```bash
$ python collect_mbris_detail.py --tier-a --dry-run

[입력 검증] 유효 86건
[설정] base_url=https://apis.data.go.kr/B553482/mbrisdataview3  키 설정됨=False

[DRY-RUN] 실제 API를 호출하지 않는다.
  전체 대상: 86건, 중복 internalId: 0건
  이미 완료(skip): 0건
  이전 실패(재시도 대상): 2건 — ['BM-SPECIES-000129', 'BM-SPECIES-000408']
  신규(pending): 84건

  실제 실행 시 호출될 건수: 86건
  ...
```

| 확인 항목 | 결과 |
|---|---|
| 대상 86종 | ✅ 확인 |
| 중복 없음 | ✅ 0건 |
| 이미 수집한 항목 skip | ✅ 로직 구현·확인(현재는 성공 사례가 없어 skip 대상 0건) |
| 실패 상태 유지 | ✅ 이전 단계에서 남은 실패 2건(말쥐치·삼치, 무관한 검증용 401)이 재시도 대상으로 정확히 표시됨 |

기존 dry-run은 후보 목록만 출력했는데, 이번에 상태 파일(`detail-collection-state.json`)을 읽어 skip/재시도/신규를 구분해 보여주도록 `collect_mbris_detail.py`를 보강했다. **여전히 실제 API를 호출하지 않는다.**

---

## 7. 테스트

**전체 242개 수집 / 236개 통과 / 6개 skip**(스킵 6개는 전부 `MBRIS_API_KEY` 부재로 인한 실API 테스트 — 키가 생기면 자동으로 실행된다)

### 신규/변경 파일

| 파일 | 개수 | 내용 |
|---|---:|---|
| `test_field_mapping.py` | 11 | API 필드 → 정규화 필드 개별 매핑 검증, 소스 필드 중복 없음 |
| `test_missing_fields.py` | 16 | 필드 없음=None(빈 문자열 아님), XML 요소 부재 vs 빈 요소 구분, genus 항상 None |
| `test_real_response_mapping.py` | 12 | 샘플 5종 fixture 파이프라인 검증(6) + **실API 게이트(6, 키 없어 skip)** |
| `test_normalizer.py` | 15 | 새 스키마(form/domesticDistribution/internationalDistribution)로 갱신, 제거된 필드가 결과에 아예 없는지 확인 |

`test_real_response_mapping.py`가 실제 API 테스트와 fixture 테스트를 한 파일 안에서 명확히 분리한다 — fixture 테스트는 `synthetic_xml()`로 만든 합성 데이터(진짜 값 아님을 docstring에 명시)를 쓰고, 실API 테스트는 `@pytest.mark.skipif(not os.environ.get("MBRIS_API_KEY"), ...)`로 게이트돼 있어 키가 생기면 코드 수정 없이 바로 활성화된다.

---

## 8. 구현/수정 파일

```
tools/mbris/src/detail_normalizer.py       스키마 전면 개정 (§4)
tools/mbris/collect_mbris_detail.py        dry-run에 상태 반영 (§7)
docs/data/mbris-api-field-map.md           신규, 잠정본 (§5)
tools/mbris/tests/
├─ test_field_mapping.py                   신규
├─ test_missing_fields.py                  신규
├─ test_real_response_mapping.py           신규
└─ test_normalizer.py                      새 스키마로 갱신
```

---

## 판정

### 전체 Tier A 수집 가능 여부 — **코드는 준비됨, 실행은 키 필요**

파이프라인·정규화·상태관리·dry-run 전부 확인됐다. `MBRIS_API_KEY`만 있으면 `python collect_mbris_detail.py --tier-a`로 즉시 실행 가능하다.

### 정규화 스키마 확정 여부 — **미확정(잠정)**

`ecology.domesticDistribution`/`internationalDistribution`의 국내/해외 방향, `growth` 등 6개 필드가 정말로 없는지(문서 미기재 필드가 실응답엔 있을 가능성), `resultCode` 성공값 — 전부 **실응답 1건만 받아도 검증 가능한 것들**이다. 이 5종 샘플조차 아직 실행하지 못했다.

### 추가 데이터 필요 여부 — **예, `MBRIS_API_KEY` 1개만 있으면 됨**

이번 단계에서 코드·문서·테스트는 모두 "키가 생기는 순간 바로 검증 가능"하도록 준비해 뒀다. 다음 실행 순서:

1. data.go.kr 15094770 "활용신청"으로 키 발급(개발계정 자동승인)
2. 키를 `tools/mbris/.env`에 저장 — 루트 `.gitignore:3`의 `.env` 규칙에 걸려 자동으로 커밋 제외됨(`git check-ignore -v`로 확인함)
3. `python collect_mbris_detail.py --sample 5` 실행 → 갈치·고등어·참돔·주꾸미·꽃게 실응답 확보
4. `pytest tests/test_real_response_mapping.py -v` — 6개 skip이 실행으로 전환되는지 확인
5. 결과에 따라 `mbris-api-field-map.md`의 "미확보" 값을 실제 값으로 갱신
6. `python collect_mbris_detail.py --tier-a` 전체 실행

---

## 제한 준수

- Tier A 86종 전체 수집 ❌ (dry-run만 수행)
- 이미지 다운로드 ❌
- AI 콘텐츠 생성 ❌ / HTML 생성 ❌ / 운영 DB 적재 ❌
- WoRMS/FishBase 연결 ❌
- API 키 하드코딩 ❌ (환경변수/`.env`만 사용, 코드에 문자열로 넣지 않음)
- API 키 git 커밋 ❌ (`.env`는 실제로 생성하지 않았음 — 애초에 키가 없어 저장할 것도 없었음)
- API 키 로그 출력 ❌ (`api_logger.py`가 `serviceKey`를 로그·요청기록에서 제외하는 기존 로직 유지, 테스트로 확인됨)
