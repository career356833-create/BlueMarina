# NIFS Fish Identity And Relations

이 문서는 Blue Marina NIFS 어종백과의 **슬러그, 표시 카테고리, relatedFish 관계**를 확정하는 설계 문서다.

목표는 세 가지다.

1. 내부 ID와 URL 슬러그를 분리한다.
2. 생물학적 taxonomy와 `/fish` 필터용 category를 분리한다.
3. relatedFish 를 이름 배열이 아니라 **관계 그래프**로 관리한다.

## 1. Slug 정책 확정

### 비교

| 후보 | 장점 | 단점 | 판정 |
| --- | --- | --- | --- |
| 국문명 기반 | 읽기 쉽다 | 이름 변경 시 URL가 흔들린다. 동명이종 충돌이 잦다. | 보류 |
| 영문명 기반 | 상대적으로 짧다 | 영문명이 없거나 흔들릴 수 있다. 한국어 UX가 약하다. | 보류 |
| 학명 기반 | 생물학적으로 안정적이다 | 사용자 친화성이 낮고 누락 가능성이 있다. | 보류 |
| 국문명 + 내부 short ID | 읽기 쉽고 충돌에 강하다 | 생성 규칙을 고정해야 한다. | 후보 |
| 별도 immutable slug | URL 안정성이 가장 높다 | 생성/보존 규칙을 별도로 관리해야 한다. | **채택** |

### 최종 규칙

Blue Marina는 **별도 immutable slug** 정책을 채택한다.

실무 구현은 다음 원칙을 따른다.

- slug는 `FishSpecies.id`와 분리한다.
- NIFS `sourceId`를 slug에 직접 사용하지 않는다.
- 최초 발행 시점에 읽기 쉬운 stem을 만들고, 충돌 방지를 위해 short id 또는 hash suffix를 붙인다.
- 발행 이후 slug는 재계산하지 않고 고정한다.
- 이름이 바뀌어도 기존 slug는 유지한다.
- 새 이름으로 들어온 URL은 `redirectFromSlugs` 또는 slug alias 목록으로 보존한다.

### slug 생성 우선순위

1. 국문명
2. 영문명
3. 학명
4. 내부 short ID fallback

단, 최종 결과는 immutable slug 로 저장한다.

### 충돌 및 변경 규칙

- 같은 slug 후보가 나오면 deterministic suffix 를 붙인다.
- suffix 는 short id 우선, 불가하면 hash suffix 로 고정한다.
- 동명이종은 별도 slug를 갖는다.
- 동일 학명 중복은 같은 species 로 자동 통합하지 않는다.
- 수동 고정 slug 는 허용하되, 변경 이력은 alias 로 남긴다.

## 2. Category 구조 확정

`FishSpecies.taxonomy` 는 **생물학적 분류**만 담당한다.
`/fish` 필터와 카드 배지는 **표시용 category** 로 분리한다.

### 권장 저장 구조

- `fish_display_categories`
- `fish_species_display_categories`

### 역할

- `fish_display_categories`
  - UI 필터용 카테고리 사전
  - 예: `바다낚시`, `민물낚시`, `회유성`, `저서성`
- `fish_species_display_categories`
  - species 와 UI category 의 다대다 연결
  - primary category 와 보조 tag 를 함께 허용

### 확정 원칙

- taxonomy 와 UI category 를 섞지 않는다.
- 한 어종이 여러 UI category 에 속할 수 있다.
- `/fish` 기존 필터와 호환되어야 한다.
- AI 자동 분류는 후보만 생성하고 자동 승인하지 않는다.
- 수동 큐레이션과 taxonomy 기반 추천은 별도 sourceType 으로 기록한다.

### `FishItem.category` 와의 관계

레거시 `/fish` 화면은 `FishItem.category` 를 그대로 쓰지만,
이 값은 canonical taxonomy 가 아니라 **표시용 primary category** 로 간주한다.

즉,

- canonical 저장: display category assignment
- legacy 렌더링: adapter 가 `FishItem.category` 로 변환

## 3. relatedFish 관계 모델

relatedFish 는 이름 문자열 배열이 아니라,
species 간 관계 그래프로 다룬다.

### 관계 타입

- `similar_appearance`
- `same_taxon`
- `same_habitat`
- `confusable`
- `co_search`
- `substitute`

### 권장 관계 테이블

- `sourceSpeciesId`
- `targetSpeciesId`
- `relationType`
- `reason`
- `sourceType` (`official | manual | ai_candidate`)
- `reviewStatus`
- `displayOrder`

### 저장 규칙

- 자기 참조 금지
- 완전 중복 금지
- 동일 방향 중복 금지
- 역방향은 관계 타입에 따라 허용 여부를 분리

### 방향 처리 규칙

- `similar_appearance`, `same_taxon`, `same_habitat`, `co_search` 는 사실상 대칭 관계로 취급한다.
  - 저장 시 `(sourceSpeciesId, targetSpeciesId)` 를 정렬해 하나만 둔다.
- `confusable`, `substitute` 는 방향 의미가 있을 수 있다.
  - 이 경우 source → target 을 유지한다.

### 표시 규칙

`/fish` 목록이나 상세에서 필요한 경우에만 이름 배열로 변환한다.
표시명은 관계 레코드에서 `targetSpeciesId` 를 resolve 해서 만든다.

이 방식의 장점은 다음과 같다.

- 이름 변경에 강하다.
- 동명이종 처리에 안전하다.
- AI 후보와 공식/수동 근거를 분리할 수 있다.

## 4. 결론

확정된 구조는 다음과 같다.

- 슬러그: immutable slug
- category: display category 별도 계층
- relatedFish: species relation graph

이 세 가지는 `/fish` 목록 유지와 `/fish/[slug]` 상세 페이지 확장을 동시에 만족한다.
