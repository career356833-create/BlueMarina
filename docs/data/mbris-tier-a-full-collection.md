# MBRIS Service Tier A 86종 전체 상세 수집

**작성일**: 2026-08-03

---

## [수집]

| 항목 | 값 |
|---|---|
| 대상 | Tier A 86종(`service-tier-a.json`) |
| 성공 | **85종** |
| 실패 | **1종**(갯강구, BM-SPECIES-006084) |
| 재시도 | `--retry-failed`로 1회 재시도(성공하지 못함 — 아래 [매칭] 참고, 정상적인 수동 검토 대상) |
| 총 실행시간 | 본 수집 339.7초 + 재시도 2회(4.8초, 4.2초) ≈ **약 5.8분** |
| 총 저장용량 | raw/detail 480.2KB(255개 파일) + normalized/detail 391.1KB(85개 파일) ≈ **0.85MB** |

이전(2026-08-03 오전) Tier A 5종 샘플 수집 시점에 남아있던 실패 2건(BM-SPECIES-000129 말쥐치, BM-SPECIES-000408 삼치)은 이번 전체 수집에서 자동으로 재시도되어 **둘 다 성공**했다 — 원인은 2026-07-31에 API 키가 없던 상태에서 시도했던 stale 401 오류였을 뿐, 실제 데이터 문제가 아니었다.

---

## [API]

- endpoint: `https://apis.data.go.kr/B553482/mbrisdataview3/taxonlist3`
- resultCode 분포: **`"00"` 95/95**(HTTP 200 받은 모든 호출) — 이번 전체 수집 세션 기준 100%
- latency: 5종 샘플 때와 유사(초당 요청 간격 2.0초 + 평균 응답 ~1.7~2초/건)
- 429(rate limit) 여부: **이번 세션 97회 호출 중 0건**. 401(인증 실패)은 2건 있었으나 전부 2026-07-31 키 미설정 시점의 stale 기록

---

## [필드 완전성]

95종(85 성공분) 기준(`tier-a-field-completeness.json`):

| 구분 | 필드 | 제공률 |
|---|---|---:|
| **기본** | CommKorNm/SpcScitfNm/SpcScitfNmShort/CorrNmTyp/CorrSpcScitfNm/SpcTyp | **100%**(85/85) |
| **분류** | KingdomKR/PhylumDivisionKR | 100% |
| | FamilyKR | 96.5% |
| | OrderKR | 92.9% |
| | **ClassKR** | **17.6%**(15/85) — 어류 대부분에서 공백 |
| **생태** | FORM | 75.3% |
| | ECOL | 67.1% |
| | NADI(국내분포) | 90.6% |
| | INDI(해외분포) | 88.2% |
| | **HABI(서식지)** | **5.9%**(5/85) — 5종 샘플 때 "전부 빈 값"이었던 패턴이 86종 규모에서도 그대로 확인됨 |

**빈 필드 상위**(`detail-collection-validation.json`): `ecology.habitat`(80건 공백) > `ecology.ecologyNotes`(28건) > `ecology.form`(21건) > `ecology.internationalDistribution`(10건) > `ecology.domesticDistribution`(8건).

`SpcTyp`은 85종 전부 `"기타"`, `CorrNmTyp`은 85종 전부 `"정명"` — 이 두 필드는 Tier A 86종 범위에서는 값이 상수라 변별력이 없다(다른 값이 존재하는지는 이번 표본으로 확인 불가).

---

## [매칭]

`tier-a-matching-review.csv` 기준:

| 구분 | 건수 |
|---|---:|
| 정확 일치(exact_match, `SpcScitfNmShort` 기준) | **85** |
| synonym(taxonomy-master.json과 자구는 다르지만 매칭됨) | 0(전부 exact) |
| 복수 후보(자동 선택 안 함) | **1**(갯강구) |
| 수동 검토 필요 | **1**(갯강구) |

**실패 1건 상세(갯강구, BM-SPECIES-006084)**: 학명 검색("Ligia exotica")이 `<items/>`(0건)을 반환했다. 국명("갯강구") 재검색은 2건을 반환했는데, 그 중 진짜 갯강구 항목의 `SpcScitfNmShort`가 `"Ligia (Megaligia) exotica"`(아속 포함)였다 — taxonomy-master.json의 canonical("Ligia exotica", 아속 제거)과 형식이 달라 자동 정확매칭에 실패했고, 나머지 1건은 아예 다른 종(극동갯강구/*Ligia cinerascens*)이었다. **이름 유사도만으로 자동 선택하지 않는다는 원칙에 따라 그대로 수동 검토로 남겼다.**

이 조사 과정에서 실제 코드 버그 2건을 발견해 수정했다(상세: [mbris-api-field-map.md](mbris-api-field-map.md)):
1. `xml_parser.py` — header의 `ResultCode`/`ResultMsg`가 PascalCase인데 camelCase로 가정해 항상 `None`을 반환하던 버그
2. `detail_collector.py`의 `select_best_item` — 권위자 인용 포함 원문(`SpcScitfNm`)과 비교해 정확 일치도 "불일치"로 오탐하던 버그 → `SpcScitfNmShort` 기준으로 수정
3. (이번 작업에서 추가) HTTP는 성공(200)했지만 학명 검색이 0건을 반환하는 경우 국명으로 재검색하는 폴백을 `collect_one`에 새로 추가 — 기존에는 "HTTP 자체가 빈 응답"인 경우만 재시도했다

---

## [NIFS 비교]

`nifs-mbris-tier-a-detail-comparison.csv`, 연결 **25종** 전부 MBRIS 상세 수집 완료(누락 없음):

- 학명 충돌(NIFS ≠ MBRIS): **6건**
  - 갈치: NIFS `Trichiurus lepturus` vs MBRIS `Trichiurus japonicus`
  - 명태: NIFS `Theragra chalcogramma` vs MBRIS `Gadus chalcogrammus`(속 재분류)
  - 참홍어: NIFS `Raja pulchra` vs MBRIS `Beringraja pulchra`(속 재분류)
  - 제주소라: NIFS `Turbo cornutus, Batillus cornutus`(복수 이명 병기) vs MBRIS `Turbo sazae`(최근 학계에서 별종으로 재확인된 종)
  - 개조개: NIFS `Saxidomus purpuratus` vs MBRIS `Saxidomus purpurata`(속 성별 어미 차이 — 사실상 동일 종의 표기 변형)
  - 오분자기: NIFS `Sulculus diversicolor` vs MBRIS `Haliotis supertexta`(속 자체가 다름 — 재검토 필요)
- 생태 보강 가능(형태/생태 서술 중 하나라도 확보): **19/25건**

원본 NIFS(`nifs-mbris-link.json`)와 MBRIS 데이터는 이 비교 과정에서 전혀 수정하지 않았다(읽기 전용 비교 CSV만 생성).

---

## [이미지]

- API 필드: **없음** — 85종 전수 재확인(`mbris-image-api-analysis.json`, `hasImageField: false`, `hasImageUrl: false`, `downloadedAnyImage: false`). 5종 샘플 때의 결론이 86종 규모에서도 그대로 유지됨.
- 별도 수집 필요: 이 `taxonlist3` 엔드포인트만으로는 이미지를 얻을 수 없다. 이미지가 필요하면 MBRIS 웹 상세 페이지 스크래핑이나 다른 공식 이미지 원천(예: 국립생물자원관 이미지 서비스)을 별도로 조사해야 한다 — 이번 작업 범위 밖.

---

## [판정]

- **DB 적재 준비 여부**: 아직 **미준비**. 85종의 원본/정규화 데이터는 확보됐지만, 다음이 선행되어야 한다: (1) 갯강구 1건 수동 확정, (2) NIFS 학명 충돌 6건 검토(특히 오분자기는 속 자체가 다른 만큼 우선 확인 필요), (3) 운영 DB 스키마/마이그레이션 설계는 이번 작업 범위 밖.
- **AI 콘텐츠 생성 준비 여부**: **부분적으로 가능**. FORM(75%)/ECOL(67%)/NADI(91%)/INDI(88%) 정도면 콘텐츠 초안 재료로 쓸 수 있으나, HABI(6%)·ClassKR(18%)는 이 API만으로는 채울 수 없다.
- **추가 원천이 필요한 필드**: `ecology.habitat`(서식지 상세), `taxonomy.class`(국문 강명, 어류 대부분), 이미지 전체.

---

## 구현 파일

```
tools/mbris/
├─ collect_mbris_detail.py                  --retry-failed 옵션 추가
├─ validate_mbris_detail.py                 학명 비교 필드 버그 수정(scientificName→scientificNameShort)
├─ src/detail_collector.py                  0건 학명검색 → 국명 재검색 폴백 추가
├─ build_tier_a_matching_review.py          §5 매칭 검토 CSV
├─ build_tier_a_field_completeness.py       §6 필드 완전성 분석
├─ build_tier_a_error_analysis.py           §7 오류/예외 분석(빈 리포트도 항상 생성)
├─ build_mbris_image_api_analysis.py        §10 이미지 재확인(85종 규모로 재실행)
├─ build_nifs_mbris_tier_a_comparison.py    §11 NIFS 비교
└─ tests/test_tier_a_full_collection.py     §12 검증 27개

data/mbris/raw/detail/{internalId}/         85개 (response.xml/metadata.json/parsed-preview.json)
data/mbris/normalized/detail/{internalId}.json  85개
data/mbris/state/detail-collection-state.json   86건(85 complete + 1 failed)

data/mbris/reports/
├─ tier-a-matching-review.csv
├─ tier-a-field-completeness.json / .csv
├─ tier-a-collection-errors.json
├─ tier-a-manual-review.csv
├─ mbris-image-api-analysis.json            (85종 기준 갱신)
├─ nifs-mbris-tier-a-detail-comparison.csv
└─ detail-collection-validation.json        (버그 수정 후 재생성 — 학명 불일치 0건)
```

`taxonomy-master.json`(16,587건), `fish-alias-registry.json`(78/69/4), `nifs-mbris-link.json`(25건), 공식 `priority/*.json` 전부 이번 작업으로 수정되지 않았음을 테스트로 확인했다. 운영 DB 적재·이미지 다운로드·AI 콘텐츠 생성·HTML 생성은 전혀 하지 않았다.
