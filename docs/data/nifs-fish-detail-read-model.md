# NIFS Fish Detail Read Model

이 문서는 `/fish/[slug]` 상세 페이지를 위해 **원본, 정규화, AI, 규제, 미디어**를 읽기 전용으로 조합하는 계약을 정의한다.

핵심 원칙은 하나다.

> 저장 레이어는 분리하고, 상세 화면은 read model 로만 조립한다.

## 1. 역할 분리

### 저장 레이어

- `FishSpecies`: canonical species master
- `FishDisplayCategory` / `FishDisplayCategoryAssignment`: UI category layer
- `FishSpeciesRelation`: 어종 관계 그래프
- `FishGeneratedContent`: AI 생성 결과
- `FishMedia`: 미디어 메타데이터
- `FishingRegulation`: 규제/금어기/금지체장

### 읽기 전용 조립 레이어

- `FishDetailViewModel`

상세 화면은 위 저장 레이어를 합성해서 만든다.

## 2. FishDetailViewModel 구성

권장 구조는 다음과 같다.

```ts
FishDetailViewModel {
  identity
  taxonomy
  officialFacts
  quickFacts
  habitat
  distribution
  ecology
  spawning
  feeding
  size
  season
  fishingGuide
  foodNutrition
  aliases
  displayCategories
  categoryAssignments
  regulations
  media
  relatedSpecies
  generatedContents
  officialSources
  reviewBadges
  publishMetadata
  seoMetadata
}
```

## 3. 섹션별 데이터 출처

| 섹션 | 주 데이터 | 보조 데이터 | 비고 |
| --- | --- | --- | --- |
| identity | `FishSpecies` | slug alias, redirect history | URL와 표시명을 분리 |
| taxonomy | `FishSpecies.taxonomy` | 없음 | 생물학적 분류만 |
| officialFacts | `FishSpecies`, `FishSourceRef` | 검수 상태 | 원문 출처와 검수 상태 표시 |
| quickFacts | `season`, `habitat`, `size`, `fishingMethods` | aliases | 카드형 요약에 사용 |
| habitat | `FishSpecies.habitat` | AI 생성 요약 | 원문 우선 |
| distribution | `FishSpecies.distribution` | 없음 | 분포 설명 |
| ecology | `FishSpecies.ecology` | 없음 | 생태 설명 |
| spawning | `FishSpecies.spawning` | 없음 | 산란 설명 |
| feeding | `FishSpecies.feeding` | 없음 | 먹이 설명 |
| size | `FishSpecies.size` | 없음 | 크기 설명 |
| season | `FishSpecies.season` | 없음 | 시즌 설명 |
| fishingGuide | `FishSpecies.fishingMethods` | AI tip 후보 | 낚시법/주의 |
| foodNutrition | `FishSpecies.foodNutrition` | 없음 | 식용/영양 |
| aliases | `FishSpecies.aliases` | 수동 별칭 | 검색 보조 |
| regulations | `FishingRegulation` | species relation | 규제 레이어 분리 |
| media | `FishMedia` | storage | 미디어 레이어 분리 |
| relatedSpecies | `FishSpeciesRelation` | resolve label | 관계 그래프 표시 |
| generatedContents | `FishGeneratedContent` | provider/model metadata | AI 레이어 분리 |
| officialSources | `FishSourceRef` | sourceUrl, title | 원문 링크 표시 |
| reviewBadges | review statuses | publish metadata | 상태 요약 |
| publishMetadata | review/publish 상태 | version | 공개 상태 표시 |
| seoMetadata | detail page generated SEO | canonical URL | 상세 페이지 최적화 |

## 4. 상세 read model 설계 원칙

### identity

- 내부 ID와 slug 를 분리한다.
- slug 는 immutable 이다.
- `slugAliases` 와 `redirectFromSlugs` 로 이전 URL 을 보존한다.

### officialFacts

- fact review 상태와 publish 상태를 함께 보여준다.
- source refs 를 통해 원문 근거를 추적한다.

### quickFacts

- 상세 첫 화면에서 바로 보일 수 있는 짧은 요약만 담는다.
- 장황한 설명은 본문 섹션으로 내려보낸다.

### fishingGuide

- fishingMethods 는 canonical source 를 우선한다.
- tips 와 cautions 는 필요 시 summary level 로만 보여준다.
- 저장 레이어의 원문과 AI 생성 문장은 섞지 않는다.

### regulations

- 규제는 어종과 분리된 별도 레이어다.
- 상세 화면은 규제 참조만 가져오고, 규제 원본을 덮어쓰지 않는다.

### media

- 미디어는 source media 와 generated media 를 함께 다루되 출처를 분리한다.
- copyright / usage / review 상태를 노출한다.

### relatedSpecies

- 이름 배열이 아니라 relation graph 를 join 해서 만든다.
- 중복과 자기 참조를 허용하지 않는다.

### generatedContents

- AI 생성 콘텐츠는 승인된 것만 기본 노출한다.
- 필요하면 review 상태별 탭이나 접기 영역으로 확장할 수 있다.

### seoMetadata

- SEO 메타는 read model 의 파생값으로 취급한다.
- canonical URL 은 slug 정책과 일치해야 한다.

## 5. `/fish` 목록과의 역할 분리

### 기존 `/fish`

- `FishItem` 기반
- 카드형 목록
- 빠른 탐색과 카테고리 필터 중심

### 신규 `/fish/[slug]`

- `FishDetailViewModel` 기반
- 원문, 규제, 미디어, AI 생성물, 관계 그래프 포함
- 상세 설명과 검수 상태 중심

즉,

- 목록은 **가벼운 view model**
- 상세는 **조립된 read model**

으로 분리한다.

## 6. 마이그레이션 전에 확정할 항목

1. slug 는 언제 생성하고 언제 고정할지
2. UI category 를 어떤 sourceType 우선순위로 줄지
3. relatedSpecies 를 대칭 관계로 저장할지, 방향 관계로 저장할지

이 세 가지가 확정되면 `/fish/[slug]` 상세 페이지와 저장 레이어를 안전하게 연결할 수 있다.
