# NIFS-MBRIS 학명 충돌 최종 검수

**작성일**: 2026-08-03

---

## [갯강구]

- **후보**: SpcTxnId=270000009653(국명 갯강구, *Ligia (Megaligia) exotica* Roux, 1828) / SpcTxnId=270000027903(국명 극동갯강구, *Ligia cinerascens* Budde-Lund, 1885)
- **판정**: **`exact_manual_match`**(confidence: high, reviewStatus: approved) — 후보1 확정, 후보2는 확실히 다른 종으로 배제
- **근거**:
  - WoRMS는 아속 없는 검색어 `Ligia exotica`를 조회해도 `Ligia (Megaligia) exotica`(AphiaID 955994)와 동일 레코드를 `match_type: exact_subgenus`로 반환한다 — WoRMS 스스로 두 표기를 같은 종으로 처리
  - `Megaligia`는 유효하게 등재된 아속(AphiaID 955472)이라 괄호 표기는 선택적 ICZN 관례일 뿐, 종 정체성은 완전히 동일
  - `Ligia cinerascens`(AphiaID 257539, 극동갯강구)는 WoRMS가 명시한 **별개의 유효종**(분포: 쿠릴열도·홋카이도 중심 vs exotica의 전세계 온대~아열대 항만) — 자동 선택 시 오매칭이었을 것임을 재확인
  - GBIF도 WoRMS와 일치(`Ligia exotica` ACCEPTED, exact match)

원래 매칭 실패는 taxonomy-master.json의 canonical 학명("Ligia exotica", 아속 괄호 제거)과 API의 `SpcScitfNmShort`("Ligia (Megaligia) exotica", 괄호 포함)를 문자열 그대로 비교했기 때문이었다 — 이번 조사로 이 차이가 실질적 의미 없는 표기 차이임이 1차 소스(WoRMS)로 확인되어 수동 승인한다.

---

## [학명 충돌 6건]

| 종 | 판정(relationshipType) | sameSpecies | confidence | reviewStatus |
|---|---|---|---|---|
| 갈치 | `taxonomic_revision` | true | medium | **manual_review** |
| 명태 | `accepted_name_update` | true | high | approved |
| 참홍어 | `accepted_name_update` | true | high | approved |
| 제주소라 | `taxonomic_revision` | true | high | approved |
| 개조개 | `gender_ending_variant` | true | high | approved |
| 오분자기 | `unresolved_conflict` | **false** | low | **unresolved** |

### 갈치
NIFS `Trichiurus lepturus` vs MBRIS `Trichiurus japonicus`. **WoRMS는 두 학명을 각각 별개의 accepted 종으로 등재**(AphiaID 127089 / 305414) — synonym 관계가 아니다. 반면 **GBIF는 T. japonicus를 T. lepturus의 synonym으로 취급**해 정면으로 배치된다. FishBase는 T. japonicus의 분포를 "한국·중국·일본·대만 북서태평양"으로 한정 기재해, 한국 연근해 개체군이 지리적으로 분리된 개체군(T. japonicus)일 가능성을 시사한다. 원기재는 T. lepturus의 아종이었다가 이후 독립종으로 승격된 이력이 있다(Tucker 1956 이후, 2022년 미토게놈 논문이 species complex 재검토). **1순위 출처(WoRMS)와 2차 검증(GBIF)이 불일치**하므로 sameSpecies=True로 두되 confidence는 medium, reviewStatus는 manual_review로 남겼다 — 자동 approved 처리하지 않는다.

### 명태
NIFS `Theragra chalcogramma` vs MBRIS `Gadus chalcogrammus`. WoRMS·GBIF 모두 일치: Theragra chalcogramma는 **unaccepted**(valid_AphiaID 300735=Gadus chalcogrammus를 가리킴). 1999년 이후 분자계통 연구로 명태가 Pacific cod보다 Atlantic cod(Gadus)에 더 가깝다는 사실이 확인되어 속이 재편입됐고(Theragra 단일종 속 사실상 폐기), 2014년 미 FDA도 공식 명칭을 변경했다. **명확한 accepted_name_update.**

### 참홍어
NIFS `Raja pulchra` vs MBRIS `Beringraja pulchra`. WoRMS: Raja pulchra(AphiaID 271580)는 **junior objective synonym**, valid name은 Beringraja pulchra(AphiaID 1015739, accepted). 속 `Beringraja` 자체가 2012년(Ishihara, Treloar, Bor, Senou & Jeong) 신설됐으며, 근거는 알집 산란 전략과 clasper 형태 차이 + 분자계통 분석(North Pacific assemblage 단계통 지지). 종소명(pulchra)·명명자(Liu, 1932)는 그대로 유지된 전형적 **속 재분류(genus transfer)**. **명확한 accepted_name_update.**

### 제주소라
NIFS `Turbo cornutus, Batillus cornutus`(콤마 병기) vs MBRIS `Turbo sazae`(국명은 "제주소라"가 아니라 그냥 "소라"). **2017년 Fukuda 논문**(*Molluscan Research* 37(4):268-281)이 존재를 확인했다 — Lightfoot(1786)의 원기재 T. cornutus는 중국 남부·대만 고유종에 한정되고, 일본·한국 개체군에 적용되던 것은 **오적용명(misapplied name)**이었음을 밝혀 T. sazae라는 신학명을 부여했다. `Batillus cornutus`는 별개 분류군이 아니라 "Turbo (Batillus) cornutus"라는 구식 아속 표기가 콤마로 분해된 것으로 판단된다(Batillus는 WoRMS상 superseded combination, valid_name=Turbo cornutus). **국명 차이는 별도**: "제주소라"가 "소라"와 다른 공식 국명이라는 근거는 확인되지 않았다 — 산지 표시 유통명으로 보인다. **단순 synonym이 아니라 misapplied-name 교정이라는 의미에서 taxonomic_revision으로 분류**했다.

### 개조개
NIFS `Saxidomus purpuratus` vs MBRIS `Saxidomus purpurata`. WoRMS/MolluscaBase가 명시적으로 기록: `purpuratus`는 `unacceptreason: "incorrect gender ending; Saxidomus is feminine"`. **가장 명확한 문법적 어미 변형 사례.**

### 오분자기 (가장 엄밀한 검토 대상)
NIFS `Sulculus diversicolor` vs MBRIS `Haliotis supertexta`. **WoRMS/MolluscaBase에서 `Haliotis diversicolor`(AphiaID 445319)와 `Haliotis supertexta`(AphiaID 445364)는 각각 독립적으로 accepted된 별개 종이다 — 이명 관계가 아니다.** Owen(2004, *Of Sea and Shore* 26(2):99-105)이 과거 아종(H. diversicolor supertexta)이던 것을 독립종으로 승격시킨 근거 논문이다.

**국립생물자원관(NIBR) 국가생물종목록**(무척추동물-V, 연체동물-I 복족류)은 다른 체계를 쓴다 — `Sulculus diversicolor diversicolor`(마대오분자기)와 `Sulculus diversicolor supertexta`(오분자기)를 **같은 종의 서로 다른 아종**으로 등재한다.

**핵심 문제**: NIFS 원본 레코드의 학명은 아종명 없이 "Sulculus diversicolor"로만 적혀 있다. 이게 (a) NIBR 국가목록 표기에서 아종명(supertexta)이 생략된 것인지, (b) 실제로 기준아종(마대오분자기, 현재 학명 Haliotis diversicolor — MBRIS에서 별도 국명·별도 internalId로 관리됨: BM-SPECIES-002421)을 가리키는 것인지 — **NIFS 원문 페이지가 JS 렌더링이라 직접 확인하지 못해 판단할 수 없다.** MBRIS/WoRMS 기준으로는 diversicolor와 supertexta가 완전히 별개의 독립종이므로, 확인 없이 "같은 종"으로 병합하면 실제로는 서로 다른 두 전복류(마대오분자기 vs 오분자기)를 하나로 잘못 연결할 위험이 있다. **`unresolved_conflict`로 남기고 sameSpecies=False로 명시했다 — 공식 근거 없는 동일종 판정을 하지 않는다는 원칙에 따른 것이다.**

---

## [Crosswalk]

`data/mbris/mappings/nifs-mbris-taxonomy-crosswalk.json`/`.csv`, NIFS 연결 25건 전체:

| relationshipType | 건수 | 대상 |
|---|---:|---|
| accepted update(`accepted_name_update`) | 21 | 명태·참홍어 포함, 나머지 19건은 기존 매칭이 이미 국명·학명 일치로 확인한 것을 그대로 반영 |
| synonym/spelling·gender variant | 1 | 개조개(`gender_ending_variant`) |
| taxonomic revision | 2 | 갈치·제주소라 |
| unresolved | 1 | 오분자기 |

---

## [DB 적재]

- **가능**: 85종 중 84종(갯강구 포함 승인 처리) + NIFS crosswalk 25건 중 24건(오분자기 제외)은 원본·canonical·synonym 관계가 분리 저장되어 있고 sameSpecies 여부가 명확해 로드 가능.
- **조건**: 갈치는 `manual_review` 상태를 그대로 유지한 채(자동 approved 아님) nullable/플래그 형태로 저장하면 나머지 배치를 막지 않고 진행 가능 — DB 스키마에 `reviewStatus` 컬럼을 반드시 함께 저장할 것.
- **보류 항목**: **오분자기(BM-SPECIES-002418) 1건은 종 수준 확정 없이 로드해서는 안 된다** — `sameSpecies=false`, `reviewStatus=unresolved` 그대로 저장하고 실제 species 링크는 null 처리해야 한다. NIFS 원본 담당자에게 "Sulculus diversicolor"가 정확히 어느 아종을 의도했는지 재확인 요청이 선행되어야 한다.

**종합 판정: 조건부 적재 가능** — 오분자기 1건을 `unresolved`/null 링크로 격리하고 갈치를 `manual_review`로 플래그한 채로 저장한다면, 나머지 데이터는 오염 없이 적재를 진행할 수 있다.

---

## 구현 파일

```
tools/mbris/
├─ src/taxonomy_crosswalk.py              §4 crosswalk 순수 함수(관계유형 검증 가드 포함)
├─ src/review_taxonomy_crosswalk_data.py  6건 사람 판정(공식 근거 포함)
├─ build_taxonomy_crosswalk.py            §4 오케스트레이터(25건 전체)
├─ src/review_manual_match_data.py        §2 갯강구 판정(공식 근거 포함)
├─ build_manual_species_match.py          §5 오케스트레이터
└─ tests/
   ├─ test_taxonomy_crosswalk.py          19개
   ├─ test_manual_species_match.py        13개
   └─ test_nifs_mbris_conflicts.py        16개

data/mbris/mappings/
├─ nifs-mbris-taxonomy-crosswalk.json/.csv  신규, 25건
└─ mbris-tier-a-manual-match.json           신규, 1건(갯강구)
```

`nifs-mbris-link.json`(25건), `taxonomy-master.json`(16,587건), `fish-alias-registry.json`(78/69/4), Tier A 수집 결과(85 complete/1 failed)는 전부 이번 작업 전후로 완전히 동일함을 테스트로 확인했다. API를 추가로 호출하지 않고 로컬 원본과 저장된 fixture만으로 전부 재현 가능하다.
