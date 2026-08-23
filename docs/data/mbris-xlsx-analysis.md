# MBRIS 국가 해양수산생물종 목록집 분석

**작성일**: 2026-07-31
**출처**: 국립해양생물자원관(MBRIS) — https://www.mbris.kr/pub/marine/natilist/nationalist.do
**공공데이터포털**: https://www.data.go.kr/data/15063771/fileData.do

---

## 1. 다운로드

| 항목 | 값 |
|---|---|
| 다운로드 페이지 | `https://www.mbris.kr/pub/marine/natilist/nationalist.do` |
| 실제 파일 요청 URL | `https://www.mbris.kr/pub/marine/natilist/selectNationalBoardExcel.ajax` |
| HTTP 메서드 | **GET** |
| 파라미터 | `pageIndex=1`, `pageUnit=10`, `searchWrd=` |
| 로그인 | 불필요 |
| 세션 쿠키 | `JSESSIONID` (페이지 선방문 필요) |
| 리다이렉트 | 없음 |
| Content-Type | `application/vnd.ms-excel;charset=euc-kr` |
| Content-Disposition | `attachment;filename="국가해양수산생물종목록_20260731.xlsx"` |
| 서버 파일명 | **국가해양수산생물종목록_20260731.xlsx** |
| 파일 크기 | **1,926,712 bytes (1.84 MB)** |
| SHA-256 | `f75a1882ef194d4c0df48c2d1889dc9558662e71c03c9e309316a6b056c20332` |
| 다운로드 시각 | 2026-07-31 (UTC) |

### 메서드 확정 과정

화면 버튼은 `fnDownloadData()` → `$("#frmDown").submit()`이다. 폼에 `method` 속성이 없어 **HTML 기본값 GET**으로 동작한다. POST로 보내면 `405 허용되지 않는 메소드`가 돌아온다.

`Content-Type`이 `application/vnd.ms-excel`이지만 실제 바이트는 `PK`(ZIP) 시그니처로 시작하는 **XLSX**다. 헤더 표기와 실제 포맷이 다르므로 확장자를 헤더만 보고 정하면 안 된다.

원본은 `data/mbris/raw/catalog/original/`에 저장했고 수정하지 않았다. 재다운로드 시 해시가 다르면 기존 파일을 타임스탬프 파일명으로 보존한다.

---

## 2. 워크북 구조

### 시트 6개

| 시트 | 데이터 행 | 상태 |
|---|---:|---|
| 척추동물 | 1,554 | visible |
| 무척추동물 | 6,355 | visible |
| 식물 | 1,124 | visible |
| 원생생물 | 3,337 | visible |
| 미생물 | 3,958 | visible |
| 육상담수종 | 259 | visible |
| **합계** | **16,587** | |

숨김 시트 없음. 수식 없음. 오토필터·표 구조 없음. 시트당 병합 셀 13개(헤더 전용).

**16,587건은 MBRIS 화면의 "총 16587건" 표기와 정확히 일치한다.** 누락 없이 받았다는 근거다.

### 헤더가 2행 병합 구조다

전 시트 공통 24열이며, 1행이 그룹명·2행이 하위 항목이고 **데이터는 3행부터** 시작한다. 1행만 헤더로 보면 2행(`Name`/`국명`/`명명법`)이 데이터로 섞여 행 수가 6건 늘어난다.

```
1행: No | 계 | 세부분류군명 | 학명 | 국명 | Phylum | Class | Order | Family | Genus | Species | Subspecies | 보유기관
2행:                                      Name 국명 | Name 국명 | ... | Name 명명법 국명 | Name 명명법 국명 | 자원관 기탁등록보존기관 수산과학원
```

### 실제 24개 컬럼

| # | 원문 경로 | # | 원문 경로 |
|---:|---|---:|---|
| 1 | No | 13 | Genus/Name |
| 2 | 계 | 14 | Genus/국명 |
| 3 | 세부분류군명 | 15 | Species/Name |
| 4 | 학명 | 16 | Species/명명법 |
| 5 | 국명 | 17 | Species/국명 |
| 6 | Phylum/Name | 18 | Subspecies/Name |
| 7 | Phylum/국명 | 19 | Subspecies/명명법 |
| 8 | Class/Name | 20 | Subspecies/국명 |
| 9 | Class/국명 | 21 | 보유기관/자원관 |
| 10 | Order/Name | 22 | 보유기관/기탁등록보존기관 |
| 11 | Order/국명 | 23 | 보유기관/수산과학원 |
| 12 | Family/Name | 24 | (Family/국명 포함, 위 순서대로) |

---

## 3. 사전 제시 컬럼 검증

퍼플렉시티가 제시한 컬럼명을 실제 파일과 대조했다. **원문 그대로 존재하는 것은 2개뿐**이다.

| 제시된 컬럼 | 실제 | 판정 |
|---|---|---|
| 국명 | `국명` | ✅ 일치 |
| 학명 | `학명` | ✅ 일치 |
| 계명 | `계` | ❌ 이름 다름 |
| 문명 | `Phylum/국명` | ❌ 별도 컬럼 없음 |
| 강명 | `Class/국명` | ❌ 별도 컬럼 없음 |
| 목명 | `Order/국명` | ❌ |
| 과명 | `Family/국명` | ❌ |
| 속명 | `Genus/국명` | ❌ |
| 종명 | `Species/국명` | ❌ |
| 보유기관 | `보유기관` 3열 분리 | ⚠️ 단일 컬럼 아님 |
| 분류군 | `세부분류군명` | ❌ 이름 다름 |
| **종/자원 고유코드** | **없음** | ❌ **존재하지 않음** |

**고유 ID 컬럼이 없다는 점이 가장 중요하다.** `No`는 시트 내 일련번호일 뿐 안정적 식별자가 아니다. 파일이 갱신되면 순번이 바뀐다. 따라서 이 목록집만으로는 영속 키를 만들 수 없고, `(학명, 시트)` 조합을 잠정 키로 쓰거나 OpenAPI에서 고유 코드를 받아와야 한다.

---

## 4. 데이터 품질

| 시트 | 행 | 국명 누락 | 학명 누락 | 동시 누락 | 완전중복 | 중복학명 | 미동정 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 척추동물 | 1,554 | 1 | 0 | 0 | 0 | 0 | 0 |
| 무척추동물 | 6,355 | 505 | 0 | 0 | 0 | 0 | 3 |
| 식물 | 1,124 | 67 | 0 | 0 | 0 | 0 | 30 |
| 원생생물 | 3,337 | 3,102 | 0 | 0 | 0 | 0 | 46 |
| 미생물 | 3,958 | **3,958** | 0 | 0 | 0 | 0 | 41 |
| 육상담수종 | 259 | 36 | 0 | 0 | 0 | 0 | 2 |

### 강점

- **학명 누락 0건** — 전 16,587행에 학명이 있다
- **완전 중복 행 0건**
- **시트 내 중복 학명 0건** — 학명이 사실상 시트 내 유일 키로 동작한다

### 주의점

- **미생물 시트는 국명이 전무하다**(3,958/3,958). 원생생물도 93%가 없다. Blue Marina 대상이 아니므로 문제되지 않는다.
- **동일 국명에 서로 다른 학명 21건.** 계를 넘나드는 동음이의가 섞여 있다.

| 국명 | 학명 A | 학명 B |
|---|---|---|
| 놀래기 | `Dermonema pulvinatum` (홍조류) | `Halichoeres tenuispinis` (어류) |
| 뜸부기 | `Gallicrex cinerea` (조류) | `Silvetia siliquosa` (갈조류) |
| 등줄조개 | `Astarte alaskensis` | `Tridonta elliptica` |

**국명만으로 매칭하면 해조류를 물고기로 만들 수 있다.** 반드시 학명 또는 분류군을 함께 봐야 한다.

- 동일 학명에 복수 국명: **0건**

---

## 5. 어류 분리

### 판정 기준

`세부분류군명 == '어류'`를 사용했다. `Class/국명`은 어류 1,254행 중 1,251행이 비어 있어 기준으로 쓸 수 없다.

### 포함한 강 (Class Latin 실측)

| Class | 국명 | 건수 |
|---|---|---:|
| Teleostei | 진골어류(경골어류) | 1,308 |
| Elasmobranchii | 판새아강(상어·가오리) | 80 |
| Chondrostei | 연질아강(철갑상어류) | 3 |
| Myxini | 먹장어강 | 3 |
| Petromyzonti | 칠성장어강 | 3 |
| Holocephali | 전두어아강(은상어류) | 2 |

**제외한 척추동물 강**: `Aves`(조강/바다새 247), `Mammalia`(포유동물강 43), `Reptilia`(파충강 10). 척추동물 시트에 있다고 전부 어류로 넣지 않았다.

사전에 조사 대상으로 제시된 **두갑강·폐어강·실러캔스강은 이 목록집에 없다.**

### 결과

| 항목 | 값 |
|---|---:|
| **어류 후보 전체** | **1,399** |
| 해양(척추동물 시트) | 1,254 |
| 육상담수(육상담수종 시트) | 145 |
| 국명 있음 | **1,397** |
| 국명 없음 | **2** |
| 학명 중복 | **0** |
| 과(Family) 수 | **269개** |

국명 없는 2건: `Chaeturichthys jeoni`(척추동물 #384), `Acheilognathus coreanus`(육상담수종 #83). **이름을 생성하지 않았다.**

과별 상위: Oxudercidae 66, Scorpaenidae 40, Carangidae 40, Psychrolutidae 39, Gobionidae 34, Gobiidae 31, Labridae 31

보유기관: 2곳 보유 583종 / 1곳 400종 / **미보유 416종**

---

## 6. 비어류 후보

`Class/Name`(Latin) 접두 매칭으로 분리했다. 원문 학명에 명명자·연도가 붙어 있어 접두로 판정했다.

| 그룹 | Class | 건수 | 국명 있음 |
|---|---|---:|---:|
| 두족류 | Cephalopoda | 55 | 55 |
| 갑각류 | Malacostraca | 1,137 | 1,094 |
| 복족류 | Gastropoda | 1,204 | 1,195 |
| 이매패류 | Bivalvia | 537 | 532 |
| **합계** | | **2,933** | **2,876** |

**전원 `fishingTargetStatus: "unreviewed"`로 두었다.** 분류학적 후보일 뿐이며, 이 2,933종이 낚시·채취 대상이라는 뜻이 아니다. 실제 대상 여부는 별도 검토가 필요하다.

기타 그룹(극피동물 234, 자포동물 386 등)은 낚시 대상 판단 근거가 없어 후보에 넣지 않았다.

---

## 7. NIFS 25종 매칭

| 상태 | 건수 |
|---|---:|
| `exact_scientific` (학명 정확 일치) | **19** |
| `exact_korean` (국명 일치, 학명 불일치) | **5** |
| `manual_review` (속 단위 후보만) | **1** |
| `not_found` | **0** |

**25종 전부 MBRIS에서 후보를 찾았다.**

### 학명 불일치 6건 — 전부 학명 개정 사례

| 어종 | NIFS 학명 | MBRIS 학명 | 성격 |
|---|---|---|---|
| 갈치 | `Trichiurus lepturus` | `Trichiurus japonicus` | 종 분리 |
| 명태 | `Theragra chalcogramma` | `Gadus chalcogrammus` | 속 변경 |
| 참홍어 | `Raja pulchra` | `Beringraja pulchra` | 속 변경 |
| 오분자기 | `Sulculus diversicolor` | `Haliotis supertexta` | 속·종 변경 |
| 개조개 | `Saxidomus purpuratus` | `Saxidomus purpurata` | 성 일치 수정 |
| 제주소라 | `Turbo cornutus, Batillus cornutus` | `Turbo sazae` (국명 "소라") | 종 분리 + 국명 상이 |

**NIFS 학명이 구명(synonym)인 경우가 6/25(24%)다.** NIFS 학명을 그대로 서비스에 노출하면 최신 분류와 어긋난다.

제주소라는 NIFS가 한 필드에 이명 2개를 쉼표로 담고 있고, MBRIS 국명이 "소라"라 국명 매칭도 실패했다. 속(`Turbo`) 후보를 제시하되 **자동 확정하지 않았다.**

---

## 8. 마스터 레코드 초안

`data/mbris/normalized/fish-master-draft.json` — 1,399건

```json
{
  "sourceProvider": "MBRIS",
  "sourceSheet": "척추동물",
  "sourceRow": 446,
  "sourceRecordId": null,
  "koreanName": "갈치",
  "scientificNameRaw": "Trichiurus japonicus",
  "scientificNameCanonical": null,
  "taxonomy": { "kingdom": "척추동물", "phylum": "Chordata",
                "class": "Teleostei", "order": "...", "family": "...", "genus": "..." },
  "holdingInstitutions": ["국립해양생물자원관"],
  "organismGroup": "fish",
  "taxonReviewStatus": "pending",
  "sourceFileHash": "f75a1882...",
  "collectedAt": "2026-07-31T..."
}
```

- `scientificNameRaw`는 **원문 그대로** 보존했다. 명명자·연도를 제거하지 않았다
- `scientificNameCanonical`은 `null` — 파서를 적용하지 않았다
- `sourceRecordId`는 `null` — 목록집에 고유 ID가 없다
- 중복 학명을 병합하지 않았다(애초에 0건)

---

## 9. 산출물

```
data/mbris/
├─ raw/catalog/
│  ├─ original/mbris-national-species-catalog.xlsx   원본 (무수정)
│  └─ metadata.json                                   요청·해시·크기
├─ analysis/
│  ├─ workbook-structure.json
│  ├─ sheet-summary.csv
│  └─ claimed-column-verification.json
├─ normalized/
│  ├─ fish-master-candidates.json / .csv        1,399
│  ├─ fish-master-draft.json                    1,399
│  └─ nonfish-marine-candidates.json / .csv     2,933
└─ reports/
   ├─ data-quality-summary.json
   ├─ duplicate-scientific-names.csv
   ├─ duplicate-korean-names.csv
   ├─ missing-names.csv
   ├─ uncertain-taxa.csv
   └─ nifs-25-match.csv
```

구현: `tools/mbris/probe_download.py`, `download_catalog.py`, `analyze_workbook.py`, `analyze_catalog.py`, `src/schema.py`

---

## 10. 판정

### Blue Marina 마스터 목록으로 사용 — 가능

어류 1,399종은 NIFS 25종의 **56배**이고, 학명 누락 0·중복 0·국명 커버율 99.9%다. 어종 마스터의 골격으로 충분하다.

### 정제 필요 항목

1. **고유 ID 부재** — `(학명, 시트)` 잠정 키를 쓰거나 OpenAPI에서 코드를 받아야 한다
2. **학명 canonical 파싱** — 명명자·연도 분리 (원문은 보존)
3. **국명 없는 어류 2종** — 생성 금지, 별도 표시
4. **동음이의 국명 21건** — 국명 단독 매칭 금지 규칙 필요
5. **해양/육상담수 구분** — 어류 1,399 중 145종이 육상담수종 시트 출신
6. **NIFS 학명 6건 개정** — MBRIS 학명을 정본으로 삼고 NIFS 학명은 이명으로 보존

### OpenAPI 상세 수집 대상 수

이 목록집에는 **분류·학명·보유기관만** 있다. 형태·생태·서식·이미지가 없다.

| 대상 | 종수 | 우선도 |
|---|---:|---|
| 해양어류 | 1,254 | 높음 |
| 두족·갑각·복족·이매패 | 2,933 | 중간(낚시 대상 선별 후) |
| 육상담수어류 | 145 | 낮음 |

전량이면 4,332종이다. NIFS 25종 규모의 173배이므로 요청 정책과 소요 시간을 다시 산정해야 한다.

### 다음 단계

1. 낚시·채취 대상 선별 기준 수립 (2,933종 → 실제 대상만)
2. MBRIS OpenAPI 키 발급 및 응답 구조 조사
3. 기존 `fish-data.ts` 약 100종을 MBRIS 1,399종에 매핑해 학명 검증

---

## 11. 제한 준수

- 운영 DB 수정 ❌ / Supabase 적재 ❌
- MBRIS 상세 페이지 크롤링 ❌ / OpenAPI 호출 ❌ / 이미지 다운로드 ❌
- 국명 생성 ❌ (없는 2종은 `null` 유지)
- 학명 임의 수정 ❌ (`scientificNameRaw` 원문 보존)
- 모든 척추동물을 어류로 분류 ❌ (조강·포유동물강·파충강 300종 제외)
- 모든 무척추동물을 낚시 대상으로 분류 ❌ (전원 `unreviewed`)
- 중복 학명 자동 병합 ❌ / 원본 XLSX 수정 ❌
