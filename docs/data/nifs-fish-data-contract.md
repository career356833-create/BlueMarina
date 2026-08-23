# NIFS Fish Data Contract

Blue Marina의 NIFS 어종백과는 현재 두 층으로 나뉜다.

1. **원본 수집/정규화 계층**: Claude 크롤러가 NIFS 원문을 staging 파일로 수집
2. **앱/게시 계층**: Codex가 원본을 검수하고 Supabase 및 앱 표준 구조로 연결

이 문서는 두 역할이 공통으로 따를 데이터 계약을 확정한다.

## 1. 현재 구조 요약

### 유지할 기존 구조

- `src/data/fish-data.ts`
  - `/fish` 목록 화면이 직접 사용하는 레거시 뷰 모델
  - 당장 화면을 깨지 않기 위해 유지
- `src/data/fish/*.ts`
  - `FishInfo`를 사용하는 개별 어종 콘텐츠
  - 신규 표준 콘텐츠의 canonical source에 해당
- `src/data/regulations/*.ts`
  - `FishingRegulation`을 사용하는 금어기/금지체장 콘텐츠
- `src/data/seo/*.ts`
  - `SeoArticle`을 사용하는 SEO용 콘텐츠
- `src/lib/types/content-contract.ts`
  - Claude 콘텐츠 전용 공통 스키마
- `src/types/content.ts`
  - 앱 내 생성 결과/저장 결과를 다루는 런타임 타입

### DB/동기화 쪽 현재 상태

- Supabase는 이미 존재한다.
- 현재 스키마는 학습 앱 중심이며, 어종 백과 전용 테이블은 아직 없다.
- 어종 백과는 **새 테이블 설계만 확정**하고, 실제 마이그레이션은 별도 승인 후 진행한다.

## 2. 4개 데이터 레이어 계약

### A. FishSourceRecord

원본 NIFS 수집 단위이다. Claude가 넘기는 staging 정보와 1:1에 가깝다.

```ts
export type FishSourceRecord = {
  sourceProvider: string;
  sourceId: string;
  sourceUrl: string;
  rawPayload?: unknown;
  rawFilePath?: string;
  rawHtmlPath?: string;
  sourceImageUrls?: string[];
  fetchedAt: string;
  contentHash: string;
  parserVersion: string;
  crawlStatus: FishCrawlStatus;
  errorMessage?: string;
  sourceMissingAt?: string;
  lastSeenAt?: string;
};
```

권장 해석:

- `sourceProvider`와 `sourceId`가 외부 고유키다.
- `contentHash`는 원문 변경 감지 기준이다.
- `rawPayload`와 `rawFilePath`는 둘 다 허용하되, 하나만 있어도 된다.
- `rawHtmlPath`는 HTML 원문 보관 시 사용한다.

### B. FishSpecies

앱이 최종적으로 다루는 canonical species record다.

```ts
export type FishSpecies = {
  id: string;
  slug: string;
  koreanName: string;
  commonName?: string;
  englishName?: string;
  scientificName?: string;
  taxonomy?: FishTaxonomy;
  morphology?: string;
  habitat?: string;
  distribution?: string;
  ecology?: string;
  spawning?: string;
  feeding?: string;
  size?: string;
  season?: string;
  fishingMethods?: string[];
  foodNutrition?: string;
  aliases?: string[];
  officialSourceIds?: FishSourceRef[];
  factReviewStatus: FishFactReviewStatus;
  publishStatus: FishPublishStatus;
  version: number;
};
```

권장 해석:

- `id`는 내부 ID다.
- `slug`는 앱 라우트와 SEO가 함께 쓸 수 있는 canonical key다.
- `scientificName`은 중복 탐지 보조키다.
- `officialSourceIds`는 출처 연결용이며, 실제 source row와 분리한다.

### C. FishGeneratedContent

AI가 생성한 보조 콘텐츠다. 원문과 생성문은 분리한다.

```ts
export type FishGeneratedContent = {
  id?: string;
  fishSpeciesId: string;
  contentType: string;
  targetAudience?: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputSourceHash: string;
  generatedPayload: unknown;
  generatedAt: string;
  reviewStatus: FishGeneratedContentReviewStatus;
  published: boolean;
};
```

권장 해석:

- `inputSourceHash`는 생성 시점에 참조한 원본 집합의 해시다.
- 생성 결과는 원문과 혼합하지 않는다.
- `published`는 실제 노출 여부다.

### D. FishMedia

어종 이미지/미디어 계층이다.

```ts
export type FishMedia = {
  id?: string;
  fishSpeciesId: string;
  mediaType: FishMediaType;
  sourceUrl: string;
  storagePath?: string;
  referencedSourceMediaId?: string;
  copyrightStatus: FishCopyrightStatus;
  usageStatus: FishMediaUsageStatus;
  prompt?: string;
  provider?: string;
  generationMetadata?: Record<string, unknown>;
  reviewStatus: FishMediaReviewStatus;
};
```

권장 해석:

- 원본 이미지와 생성 이미지를 모두 담을 수 있게 만든다.
- `referencedSourceMediaId`는 원본 소스 미디어와의 추적 연결이다.
- `copyrightStatus`와 `usageStatus`는 별도 검수 축이다.

## 3. 검수 상태 계약

상태는 아래처럼 분리한다.

- `crawlStatus`: 원문 수집 상태
- `factReviewStatus`: 사실 검수 상태
- `mediaReviewStatus`: 미디어 검수 상태
- `aiReviewStatus`: AI 생성물 검수 상태
- `publishStatus`: 게시 상태

### 권장 상태값

```ts
export type FishCrawlStatus =
  | "pending"
  | "crawling"
  | "complete"
  | "partial"
  | "failed"
  | "missing"
  | "archived";

export type FishFactReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishGeneratedContentReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishMediaReviewStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected";

export type FishPublishStatus =
  | "draft"
  | "review"
  | "published"
  | "hidden"
  | "archived";
```

## 4. ID / slug / upsert 규칙

### 외부 고유키

- 외부 고유키는 **`sourceProvider + sourceId`** 조합이다.
- 이 조합으로 source row를 먼저 찾는다.
- 어종명으로 upsert하지 않는다.

### 내부 ID

- 내부 `FishSpecies.id`는 앱 전용이다.
- NIFS fishId와 직접 동일시하지 않는다.
- 내부 ID는 안정적이어야 하지만, 외부 ID와 같은 형식일 필요는 없다.

### 학명 / 이름 / slug

- `scientificName`은 중복 탐지 보조키로 사용한다.
- 같은 학명이라도 출처가 다르면 동일 species로 자동 병합하지 않는다.
- slug는 canonical URL 키이며, 중복 시 suffix 정책을 사용한다.
- 이름이 바뀌면 `aliases`와 변경 로그로 추적하고, 기존 slug는 리다이렉트 후보로 남긴다.

### Upsert 정책

- 신규 source key: source record 생성
- 동일 hash: `lastSeenAt`만 갱신
- hash 변경: 새 source version 또는 change log 생성
- 수동 검수 완료 필드 자동 덮어쓰기 금지
- 원문 변경 시 factReviewStatus 자동 승인 금지
- source_missing은 manual_review 또는 archived 단계와 분리
- 크롤링 실패로 기존 정상 데이터 삭제 금지
- 게시 중 콘텐츠 자동 비공개 금지

## 5. Claude staging 계약

Claude는 앱 코드나 Supabase를 직접 수정하지 않고 아래 staging 파일만 생성한다.

### 허용 경로

- `data-import/nifs/raw/**`
- `data-import/nifs/manifest/**`
- `data-import/nifs/media/**`
- `data-import/nifs/reports/**`

### 어종별 manifest 권장 필드

- `sourceProvider`
- `sourceId`
- `sourceUrl`
- `rawHtmlPath`
- `rawPayloadPath`
- `imageUrls`
- `fetchedAt`
- `contentHash`
- `parserVersion`
- `crawlStatus`
- `errorMessage?`
- `sourceMissingAt?`
- `lastSeenAt?`

### Claude가 생성하면 안 되는 것

- 내부 FishSpecies ID 최종 확정
- 최종 slug 확정
- factReviewStatus 승인
- publishStatus 변경
- Supabase upsert
- AI 설명과 NIFS 원문 혼합
- 앱 라우트 수정
- UI 수정

## 6. 기존 구조와의 호환 판정

### 유지

- `src/data/fish/*.ts`
- `src/data/regulations/*.ts`
- `src/data/seo/*.ts`
- `src/lib/types/content-contract.ts`

### 어댑터로 연결

- `src/data/fish-data.ts`
  - `/fish` 목록은 즉시 깨지면 안 되므로 기존 view model 유지
  - 향후 `FishSpecies` → legacy view model 어댑터로 연결 가능

### 마이그레이션 대상

- `src/data/fish-data.ts`의 장기적 canonical source 전환
- Supabase fish 전용 테이블

### 폐기 후보

- 없음. 이번 단계에서 폐기하지 않는다.

### 화면/라우트 역할 분리

- `/fish`는 현재 목록/탐색용 레거시 화면
- 향후 `/fish/[slug]`는 canonical species 상세 화면
- regulations는 species와 별도 레이어를 유지

## 7. Supabase 테이블 초안

실행하지 않는 migration 초안이다.

### 7.1 fish_source_records

- PK: `id` 또는 `(source_provider, source_id)` unique key
- UNIQUE: `(source_provider, source_id)`
- index: `content_hash`, `last_seen_at`, `crawl_status`
- columns:
  - source_provider
  - source_id
  - source_url
  - raw_payload
  - raw_file_path
  - raw_html_path
  - source_image_urls
  - fetched_at
  - content_hash
  - parser_version
  - crawl_status
  - error_message
  - source_missing_at
  - last_seen_at
  - created_at
  - updated_at

### 7.2 fish_species

- PK: `id`
- UNIQUE: `slug`
- index: `scientific_name`, `korean_name`, `publish_status`, `fact_review_status`
- columns:
  - id
  - slug
  - korean_name
  - common_name
  - english_name
  - scientific_name
  - taxonomy
  - morphology
  - habitat
  - distribution
  - ecology
  - spawning
  - feeding
  - size
  - season
  - fishing_methods
  - food_nutrition
  - aliases
  - fact_review_status
  - publish_status
  - version
  - created_at
  - updated_at

### 7.3 fish_species_sources

- PK: `id`
- UNIQUE: `(fish_species_id, source_record_id)`
- FK:
  - `fish_species_id -> fish_species.id`
  - `source_record_id -> fish_source_records.id`
- index: `fish_species_id`, `source_record_id`
- purpose: one species to many source records

### 7.4 fish_generated_contents

- PK: `id`
- FK: `fish_species_id -> fish_species.id`
- index: `fish_species_id`, `content_type`, `review_status`, `generated_at`
- columns:
  - fish_species_id
  - content_type
  - target_audience
  - provider
  - model
  - prompt_version
  - input_source_hash
  - generated_payload
  - generated_at
  - review_status
  - published

### 7.5 fish_media

- PK: `id`
- FK: `fish_species_id -> fish_species.id`
- optional FK: `referenced_source_media_id -> fish_source_media.id` if raw media table is later added
- index: `fish_species_id`, `media_type`, `review_status`
- columns:
  - fish_species_id
  - media_type
  - source_url
  - storage_path
  - referenced_source_media_id
  - copyright_status
  - usage_status
  - prompt
  - provider
  - generation_metadata
  - review_status

### 7.6 fish_change_logs

- PK: `id`
- FK: `fish_species_id -> fish_species.id`
- index: `fish_species_id`, `changed_at`, `change_type`
- purpose: source change / review history

### 7.7 optional helper tables

- `fish_aliases`
- `fish_taxonomy`

## 8. 추천 검수 상태 전이

### crawlStatus

`pending -> crawling -> complete`

`pending -> crawling -> partial`

`pending -> crawling -> failed`

`complete -> missing -> archived`

### factReviewStatus

`pending -> needs_review -> approved`

`needs_review -> rejected`

### mediaReviewStatus

`pending -> needs_review -> approved`

`needs_review -> rejected`

### aiReviewStatus

`pending -> needs_review -> approved`

`needs_review -> rejected`

### publishStatus

`draft -> review -> published`

`published -> hidden`

`published -> archived`

## 9. 현재 구조 판정

### 유지

- `src/data/fish-data.ts`
- `src/data/fish/*.ts`
- `src/data/regulations/*.ts`
- `src/data/seo/*.ts`
- `src/lib/types/content-contract.ts`

### 어댑터로 연결

- `FishSpecies -> FishItem view model`
- `FishInfo -> canonical content rendering`
- `FishingRegulation -> regulation cards`
- `SeoArticle -> landing/support content`

### 마이그레이션

- `fish-data.ts`의 핵심 필드와 검색 기능은 장기적으로 `FishSpecies` 기반으로 이동 가능
- 다만 이번 단계에서 즉시 이관은 하지 않는다

### 폐기 후보

- 없음

## 10. 승인 필요 항목

다음은 사용자 승인이 있어야 실제 적용할 수 있다.

1. fish 전용 Supabase 마이그레이션 생성
2. `src/data/fish-data.ts` canonical 이관 시점
3. `FishGeneratedContent`와 `FishMedia`의 실제 AI/스토리지 연결
4. Claude staging 폴더의 실제 생성 스크립트 도입 여부
5. `/fish/[slug]` 상세 라우트의 신규 도입 시점

## 11. 검증 기준

- 기존 앱 코드 변경 없음
- 기존 데이터 개수 변경 없음
- DB 변경 없음
- Claude 허용 경로와 충돌 없음
- 원본 / 정규화 / AI / 미디어 혼합 없음
- ID / slug / source key 충돌 없음
- `npm run validate:content`
- `npm run lint`
- `npm run build`
