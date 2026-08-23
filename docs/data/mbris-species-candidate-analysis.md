# MBRIS → Blue Marina Species Candidate DB

**작성일**: 2026-07-31
**입력**: MBRIS 국가해양수산생물종목록_20260731.xlsx (16,587종, SHA-256 `f75a1882...`)
**목적**: MBRIS 전체 목록을 그대로 쓰지 않고 3단계로 걸러 Blue Marina 후보를 만든다.

```
MBRIS Raw Catalog (16,587)
        ↓ 표준 구조 변환 + 내부 ID + 학명 파싱
Taxonomy Master (16,587)
        ↓ organismGroup 필터
Blue Marina Species Candidate (fish 1,399 + non-fish 2,933 = 4,332)
        ↓ NIFS 매핑 + 우선순위 점수
상세 API 수집 대상
```

---

## 전체

| 항목 | 값 |
|---|---:|
| 전체 종 수 (Taxonomy Master) | **16,587** |
| Blue Marina 후보 (fish + non-fish) | **4,332** |
| 후보 제외(other: 조류·포유류·파충류·식물·원생생물·미생물·기타 무척추동물) | 12,255 |

### 분류군별(organismGroup) 수

| 그룹 | 수 |
|---|---:|
| fish | 1,399 |
| gastropod | 1,204 |
| crustacean | 1,137 |
| bivalve | 537 |
| cephalopod | 55 |
| other | 12,255 |

---

## Taxonomy Master

`data/mbris/normalized/taxonomy-master.json` / `.csv` — 16,587건 전체, 원본 그대로 보존.

- **internalId**: `BM-SPECIES-000001` ~ `BM-SPECIES-016587`. MBRIS `No` 컬럼(시트 내 순번)을 쓰지 않고, `data/mbris/normalized/internal-id-registry.json`에 (시트, 학명원문, 국명, 등장순번)을 키로 영속 발급했다. 재실행해도 기존 키는 같은 ID를 유지하고 신규 레코드만 다음 번호를 받는다(테스트로 검증).
- **컬럼**: `internalId`, `sourceSheet`, `sourceRow`, `koreanName`, `scientificNameRaw`, `scientificNameCanonical`, `scientificNameParsing`(canonical/authority/subgenus/infraEpithet/rankMarker/isSpeciesComplex/isUncertain/uncertaintyType/authoritySource), `taxonomy`(kingdom~species), `holdingInstitutions`, `organismGroup`, `sourceHash`, `reviewStatus`.

### 학명 파싱

16,587건 토큰 수 분포 `{2어절: 16,167 / 3어절: 287 / 4어절: 121 / 5어절: 6 / 6어절: 5 / 9어절: 1}`을 전수 스캔해 규칙을 확정했다.

| 패턴 | 실측 건수 | 처리 |
|---|---:|---|
| 표준 이명(권위자 없음) | 16,167 | canonical = 원문 그대로 |
| `var.` | 61 | canonical=속+종, `infraEpithet` 분리 |
| `subsp.` | 59 | 〃 |
| `f.`(품종) | 9 | 〃 |
| `cf.` | 1 | canonical에 잠정 종소명 포함, 불확실 표시 |
| 마커 없는 3어절(동물) | 110 | 동물명명규약 관례상 아종이나 **유효성은 판단하지 않음**, 불확실 표시만 |
| 아속 괄호 `Genus (Subgenus) species` | — | subgenus 분리, canonical에서 괄호 제거 |
| species complex | 1 | `isSpeciesComplex=true` |
| 권위자가 원문에 직접 포함(세균) | 1 | 쉼표+4자리 연도로 탐지해 분리 |
| 해석 불가(반복 속명) | 4 | **추측하지 않고 원문 그대로 canonical 유지**, `irregular_format`로 표시 |

원문(`scientificNameRaw`)은 절대 수정하지 않았다. 저자명·연도는 대부분 별도 컬럼(`speciesAuthority`)에 있어 그대로 옮겼고, 드물게 원문에 섞인 경우만 분리했다.

---

## Fish Candidate

`data/mbris/normalized/blue-marina-fish-candidates.json` / `.csv` — **1,399건**

### 포함 기준

`세부분류군명 == '어류'` (척추동물·육상담수종 시트).

| Class(Latin) | 건수 |
|---|---:|
| Teleostei (진골어류) | 1,308 |
| Elasmobranchii (판새아강) | 80 |
| Chondrostei (연질아강) | 3 |
| Myxini (먹장어강) | 3 |
| Petromyzonti (칠성장어강) | 3 |
| Holocephali (전두어아강) | 2 |

### 제외 기준

같은 척추동물 시트라도 `세부분류군명`이 어류가 아니면 넣지 않았다 — 조강(바다새) 247, 포유동물강 43, 파충강 10.

### 품질

| 항목 | 값 |
|---|---:|
| 국명 누락 | 2건 (`Chaeturichthys jeoni`, `Acheilognathus coreanus` — 이름 생성 안 함) |
| 학명 누락 | 0건 |
| 학명 중복 | 0건 |
| 국명 중복 | 0건 |
| 학명 불확실 표기 | 5건 (전부 `unmarked_trinomial`) |

시트별: 척추동물(해양) 1,254 / 육상담수종 145.

---

## Non-Fish Candidate

`data/mbris/normalized/blue-marina-nonfish-candidates.json` / `.csv` — **2,933건**, 전원 `fishingTargetStatus: "unreviewed"`

| 그룹 | 판정 기준(Class Latin 접두) | 건수 | 국명 있음 | 학명 불확실 |
|---|---|---:|---:|---:|
| 두족류 | `Cephalopoda` | 55 | 55 | 0 |
| 갑각류 | `Malacostraca` | 1,137 | 1,094 | 10 |
| 복족류 | `Gastropoda` | 1,204 | 1,195 | 18 |
| 이매패류 | `Bivalvia` | 537 | 532 | 5 |

**주의**: 이 2,933종은 분류학적 후보일 뿐이다. 실제 낚시·채취 대상 여부는 검토되지 않았다.

---

## NIFS 25종 매핑

`data/mbris/mappings/nifs-mbris-link.json`

| matchType | confidence | 건수 |
|---|---|---:|
| `scientific_exact` | high | 19 |
| `synonym` | medium | 5 |
| `korean_candidate` | low | 1 |
| **미매칭** | — | **0** |

### synonym 5건 (학명 개정 — 국명 단독 매칭이라 confidence를 medium으로 낮춤)

| 어종 | NIFS 학명(구명) | MBRIS 학명(현재) |
|---|---|---|
| 갈치 | `Trichiurus lepturus` | `Trichiurus japonicus` |
| 개조개 | `Saxidomus purpuratus` | `Saxidomus purpurata` |
| 명태 | `Theragra chalcogramma` | `Gadus chalcogrammus` |
| 오분자기 | `Sulculus diversicolor` | `Haliotis supertexta` |
| 참홍어 | `Raja pulchra` | `Beringraja pulchra` |

### korean_candidate 1건 (속 단위만 확정, confidence low)

제주소라 — NIFS 학명 필드에 이명 2개(`Turbo cornutus, Batillus cornutus`)가 쉼표로 들어있고 MBRIS 국명은 "소라"라 국명 매칭도 실패했다. `Turbo` 속 후보 3종(`sazae`/`stenogyrus`/`excellens`)만 제시했고 **자동 확정하지 않았다.**

---

## 우선순위 점수

`data/mbris/normalized/species-priority.json` — 4,332건 전체 채점

### 점수 모델

"대중성·식용 가능성·어획통계 존재 가능성"은 이 데이터만으로 직접 판단할 근거가 없어, **NIFS 25종 매칭 여부**(이미 수산자원으로 관리 중이라는 실증적 신호)로 대체했다. 없는 데이터를 지어내지 않았다.

| 가점 요소 | 가중치 |
|---|---:|
| NIFS 학명 정확 매칭 | +40 |
| NIFS 국명(synonym) 매칭 | +25 |
| NIFS 속 단위 매칭 | +10 |
| 국명 존재 | +15 |
| 보유기관에 실물 표본 존재 | +10 |
| 어류 그룹 | +5 |

| 감점 요소 | 가중치 |
|---|---:|
| 국명 없음 | −20 |
| 학명 불확실 표기 | −15 |
| species complex | −10 |
| 보유기관 없음(관찰기록만 존재 가능성) | −5 |

기준 50점에서 가감, 0~100 clamp.

### 결과 분포

| nextAction | 건수 |
|---|---:|
| `detail_api_collect` (70점 이상) | 2,973 |
| `review_then_collect` (40~69점) | 1,331 |
| `low_priority_defer` (40점 미만) | 28 |

상위권은 NIFS 25종과 정확히 일치하는 어류(말쥐치·삼치·고등어·갈치·전갱이 등)가 전부 100점으로 차지한다.

---

## 문제 데이터

| 항목 | 범위 | 건수 |
|---|---|---:|
| 완전 중복 행 | 전체 16,587건 | 0 |
| 시트 내 중복 학명 | 전체 | 0 |
| fish/non-fish 후보 내 중복 학명 | 4,332건 | 0 |
| **동일 국명·다른 학명** | 전체 16,587건 | 21건 (놀래기·뜸부기 등 계를 넘나드는 동음이의) |
| 〃 | non-fish 후보 내부 | 11건(등줄조개·재첩류 등) |
| 학명 불확실 표기 | 전체 | 243건 |
| 〃 | fish 후보 | 5건 |
| 〃 | non-fish 후보 | 33건 |
| 해석 불가(반복 속명) | 전체 | 4건 — 무척추동물 시트, 추측하지 않고 원문 유지 |

**국명 단독 매칭 위험**: 21건의 동일 국명이 서로 다른 학명(때로는 다른 계)을 가리킨다 — `놀래기`가 홍조류와 어류 양쪽에 존재. 매핑 로직이 국명만으로 확정하지 않고 confidence를 낮추는 이유다.

---

## 생성 파일

```
data/mbris/
├─ normalized/
│  ├─ internal-id-registry.json          영속 ID 레지스트리
│  ├─ taxonomy-master.json / .csv        16,587건
│  ├─ blue-marina-fish-candidates.json/.csv     1,399건
│  ├─ blue-marina-nonfish-candidates.json/.csv  2,933건
│  ├─ candidate-summary.json
│  └─ species-priority.json              4,332건 채점
└─ mappings/
   └─ nifs-mbris-link.json               25건

tools/mbris/
├─ src/sci_name_parser.py                학명 파서
├─ src/id_registry.py                    내부 ID 발급·영속화
├─ build_taxonomy_master.py
├─ build_candidates.py
├─ build_nifs_mapping.py
├─ build_priority.py
└─ tests/
   ├─ test_excel_parser.py
   ├─ test_taxonomy_normalizer.py
   ├─ test_fish_filter.py
   ├─ test_nifs_mapping.py
   └─ test_duplicate_detection.py
```

원본 XLSX는 이번 단계에서도 열기만 했고 수정하지 않았다.

---

## 테스트

**55개 작성 / 55개 통과** (원본 16,587행 불변 확인 포함, 실제 파일 기반 통합 테스트 1건 포함)

검증 범위: 컬럼 매핑·정제, 학명 파싱 15개 패턴, 어류/비어류 분류 경계(조류·포유류·파충류가 fish로 새지 않는지), NIFS 매칭 confidence 규칙(국명 단독 매칭 강등), 내부 ID 중복 없음·재실행 안정성·완전 중복 행 처리.

---

## 판정

### DB 적재 가능 — 아니오 (아직)

`reviewStatus`/`fishingTargetStatus`가 전부 `unreviewed`/`pending`이다. 이번 단계는 **후보 생성**까지이며 운영 DB 적재는 다음 단계다.

### 정제 필요 항목

1. **synonym 5건 + korean_candidate 1건** — NIFS 학명을 MBRIS 현재 학명으로 갱신할지, 이명으로 병기할지 결정 필요
2. **동일 국명 다른 학명 21건** — 서비스 검색에서 국명만으로 종을 특정하면 안 됨
3. **국명 없는 fish 2건** — 노출 보류 또는 학명만으로 표시
4. **해석 불가 4건** — 무척추동물 시트, MBRIS에 직접 문의하거나 원본 재확인 필요

### API 상세 수집 대상 수

`detail_api_collect` 2,973건 + `review_then_collect` 1,331건 = **4,304건이 향후 상세 수집 후보**(28건은 보류).

### 다음 단계

1. NIFS 25종의 학명 갱신 여부 결정 (synonym 5건)
2. `review_then_collect` 1,331건의 국명 없음·학명 불확실 사유 개별 검토
3. MBRIS OpenAPI 키 발급 후 우선순위 상위군부터 상세 수집 착수
