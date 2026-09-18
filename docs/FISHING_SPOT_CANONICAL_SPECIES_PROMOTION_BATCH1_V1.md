# Fishing Spot Canonical Species Promotion Review Batch 1

## Decision

`PARTIAL_PROMOTION_CANDIDATES_CONFIRMED`

붕장어와 짱뚱어는 `PROMOTION_READY`이다. 숭어의 분류학적 정명은 확인됐지만 fishing-spot 원본의 한국명만으로는 숭어와 가숭어 계열의 상용명 혼선을 배제할 수 없어 `REVIEW_REQUIRED`이다. 이 결과는 research review이며 canonical, alias, runtime mapping, condition profile, 데이터베이스를 변경하지 않는다.

## Methodology

1. 이전 expansion audit에서 HIGH로 분류된 붕장어, 숭어, 짱뚱어만 고정했다.
2. 현재 Fishing Spot canonical 10종과 이름 중복 여부를 확인했다.
3. Fish canonical 1,258 baseline에 연결된 review/staging manifest에서 기존 internal ID와 학명을 교차 확인했다.
4. MBRIS와 NIFS로 한국명과 학명을 확인하고, WoRMS로 accepted taxon과 이명을 검토했다.
5. FishBase 등 공신력 있는 종 자료에서 향후 condition profile 다섯 차원의 근거 확보 가능성만 HIGH/MEDIUM/LOW로 평가했다.
6. affected spot은 이전 audit의 source-backed 목록을 사용하고 종 간 중복 spot을 제거해 coverage impact를 계산했다.

입력 파일의 SHA-256은 deterministic builder에 고정되어 있다. production dataset이 바뀌면 builder가 실패한다.

## Duplicate checks

세 종은 현재 Fishing Spot production canonical 10종에는 없다. 그러나 Fish canonical identity와 stable internal ID는 이미 존재하므로 새 ID를 만들면 안 된다.

| Korean name | Scientific name | Existing Fish ID | Fishing Spot canonical 10 | Required identity action |
|---|---|---|---|---|
| 붕장어 | *Conger myriaster* | `BM-SPECIES-000908` | 없음 | 기존 ID 재사용 |
| 숭어 | *Mugil cephalus* | `BM-SPECIES-000097` | 없음 | 기존 ID 재사용 |
| 짱뚱어 | *Boleophthalmus pectinirostris* | `BM-SPECIES-000385` | 없음 | 기존 ID 재사용 |

## 붕장어

- Accepted identity: *Conger myriaster* (Brevoort, 1856).
- Raw-name relation: source의 `붕장어`는 공식 한국명과 정확히 일치한다.
- Ambiguity: 검붕장어, 갯장어, 뱀장어와 별개 종이다. `바다장어`와 `아나고`는 범위가 달라 이번 alias 후보에서 제외한다.
- Impact: 14 spots.
- Condition profile readiness: `MEDIUM`. Habitat, depth, temperature 자료는 확인 가능하지만 국내 서비스용 salinity와 seasonality 기준은 별도 정규화가 필요하다.
- Promotion status: `PROMOTION_READY`.

Sources: [MBRIS](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000004416), [NIFS](https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10072), [WoRMS AphiaID 271745](https://www.marinespecies.org/aphia.php?id=271745&p=taxdetails), [FishBase](https://fishbase.se/summary/302).

## 숭어

- Accepted identity under the standard Korean name: *Mugil cephalus* Linnaeus, 1758.
- Raw-name relation: MBRIS와 NIFS 종 페이지에서는 정확한 공식 한국명이다.
- Ambiguity: 공식·산업 자료에서도 `숭어`, `가숭어`, `참숭어`, `밀치`, `보리숭어`가 문맥에 따라 혼용된다. 원본 12건은 한국명만 포함하므로 *Mugil cephalus*임을 spot source 수준에서 단정할 수 없다.
- Impact: 조건부 12 spots. 다른 두 ready 종과 중복을 제거하면 batch 전체에 추가하는 고유 spot은 2개뿐이다.
- Condition profile readiness: `HIGH` after identity resolution. 생태 자료는 충분하지만 먼저 source-level identity를 해소해야 한다.
- Promotion status: `REVIEW_REQUIRED`.

Sources: [MBRIS 숭어](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000028620), [NIFS Mugil cephalus](https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10968), [WoRMS Mugil taxon list](https://www.marinespecies.org/aphia.php?p=taxlist&tName=Mugil), [NIFS 숭어류 구분 자료](https://www.nifs.go.kr/board/actionBoard0018PopupPrevew.do?BBS_ID=20211228034724026HGL), [FishBase](https://www.fishbase.se/Summary/Mugil-cephalus).

## 짱뚱어

- Accepted identity: *Boleophthalmus pectinirostris* (Linnaeus, 1758).
- Raw-name relation: source의 `짱뚱어`는 공식 한국명과 정확히 일치한다.
- Aggregate boundary: `망둑어`는 여러 goby를 가리키는 집계·비표준명이며 짱뚱어의 alias가 아니다. 남방짱뚱어도 별도 종이다.
- Impact: 9 spots. 이 9 spots은 붕장어의 affected set에 포함되므로 두 ready 종의 고유 impact는 총 14 spots이다.
- Condition profile readiness: `MEDIUM`. Intertidal habitat와 temperature 근거는 있으나 salinity, depth, seasonality를 production 조건으로 정규화하는 후속 검토가 필요하다.
- Promotion status: `PROMOTION_READY`.

Sources: [MBRIS public dataset](https://www.data.go.kr/data/15071288/fileData.do), [NIFS](https://www.nifs.go.kr/contents/actionContentsCons0088.do), [WoRMS Boleophthalmus taxon list](https://marinespecies.org/aphia.php?p=taxlist&pid=267096&rComp=%3E%3D&tRank=220), [FishBase](https://www.fishbase.se/summary/Boleophthalmus-pectinirostris).

## Coverage impact

Current coverage is 1,386/1,405.

- 붕장어와 짱뚱어만 나중에 승격하면 고유 14 spots이 새로 매핑되어 1,400/1,405가 된다.
- 숭어 ambiguity까지 해소되어 세 종이 모두 승격되면 고유 16 spots이 새로 매핑되어 1,402/1,405가 된다.

이 값은 coverage impact이며 ranking이나 실제 승격이 아니다.

## Alias policy

승인할 alias 후보는 없다. 붕장어의 상용 통칭, 숭어류의 혼용명, 짱뚱어와 망둑어의 집계 관계를 alias로 만들지 않는다. production alias table 변경은 0이다.

## Future condition profiles

후속 apply 단계에서도 identity promotion과 condition profile 작성은 별도로 검토해야 한다. Temperature, depth, salinity, seasonality, habitat 각각에 source-backed 범위와 국내 해역 적용 근거가 필요하다. 이 batch에서는 profile을 생성하지 않았다.

## No-runtime boundary

Canonical data mutation 0, runtime mapping mutation 0, condition profile creation 0, DB/Supabase write 0이다. 실제 canonical 연결은 별도 promotion apply 단계로 남긴다.
