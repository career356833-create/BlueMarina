# Blue Marina 어종 DB 감사 보고서
## NIFS 크롤링 통합 설계 사전 검토

작성일: 2026-07-31
대상 프로젝트: kidsauto-ai-saas-mvp-next-js
검토 범위: DB 구조, Claude Code 누적 데이터, NIFS 통합 설계

---

## 1. 현재 저장 구조 및 기술 스택

### 1.1 주 저장소
| 항목 | 선택 기술 | 설명 |
|------|---------|------|
| **DB** | Supabase (PostgreSQL) | 사용자, 기관, 콘텐츠 관리 |
| **ORM** | 없음 (직접 클라이언트) | `@supabase/supabase-js` 사용 |
| **정적 데이터** | JSON (메모리 기반) | `src/data/` 폴더 |
| **이미지** | Supabase Storage | uploaded_images 테이블 |
| **검색** | 메모리 필터링 | 인덱싱 없음 |
| **캐시** | 없음 | 클라이언트 메모리만 활용 |

### 1.2 Supabase Schema 현황
**파일**: `supabase/schema.sql`

현재 테이블 구성:
- `profiles` - 사용자
- `institutions` - 기관
- `memberships` - 멤버십
- `uploaded_images` - 업로드된 이미지
- `generated_contents` - 생성된 콘텐츠 (유아 교육 용도)
- `generation_records` - 생성 기록
- `daily_usage_limits` - 사용량 제한
- `subscriptions` - 구독
- `blue_marina_learning_states` - 학습 상태 (보트 면허 시험)

**어종 관련 테이블**: **없음** ❌

---

## 2. Claude Code 누적 데이터 구조

### 2.1 최근 콘텐츠 작업 (2026-07-31)
**경로**: `src/data/fish/`, `src/data/regulations/`, `src/data/seo/`, `src/content/marine-basics/`

생성된 파일 11개:

#### 어종 정보 (3개)
- `fish-korean-rockfish.ts` - 우럭
- `fish-japanese-flounder.ts` - 광어
- `fish-japanese-eel.ts` - 갈치

구조:
```typescript
type FishInfo = {
  kind?: "fish";
  id: string;
  slug: string;
  name: string; // 또는 title
  speciesId?: string;
  scientificName?: string;
  aliases?: string[];
  summary: string;
  category: string;
  habitat?: string;
  season?: string;
  tags?: string[];
  body: string; // 또는 content
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  reviewStatus: "needs_fact_check" | "draft" | "in_review" | "approved" | "rejected";
  relatedQuestionIds?: number[];
  published?: boolean;
}
```

#### 규제 정보 (3개)
- `regulation-korean-rockfish.ts` - 우럭
- `regulation-japanese-flounder.ts` - 광어
- `regulation-japanese-eel.ts` - 갈치

구조:
```typescript
type FishingRegulation = {
  kind?: "regulation";
  id: string;
  slug: string;
  title: string;
  speciesId?: string;
  region?: string;
  closedSeason?: string;
  prohibitedLength?: string | number;
  effectiveFrom?: string;
  effectiveTo?: string;
  legalBasis?: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  reviewStatus: "needs_fact_check" | ... ;
  published?: boolean;
}
```

#### SEO 글 (3개)
- `seo-boat-license-exam-prep.ts`
- `seo-boat-license-grade1-grade2.ts`
- `seo-boat-license-passing-score.ts`

#### 해양 기초 정보 (2개)
- `marine-tides-how-to-read.ts`
- `marine-high-low-tide-difference.ts`

**상태**: 모두 `reviewStatus: "needs_fact_check"`, `published: false`

---

## 3. 기존 어종 관련 데이터 구조

### 3.1 기본 어종 데이터
**파일**: `src/data/fish-data.ts`

```typescript
type FishItem = {
  id: string;
  name: string;
  category: FishCategory;
  season: string;
  habitat: string;
  shortDescription: string;
  description: string;
  fishingTips: string;
  caution: string;
  relatedFish: string[];
};

type FishCategory =
  | "바다낚시 인기어종"
  | "선상낚시 어종"
  | "방파제/갯바위 어종"
  | "계절별 대표어종"
  | "회/식용 인기어종"
  | "주의가 필요한 어종";
```

**데이터 수**: ~100+ 어종
**출처**: 원본 불명
**메타데이터**: 없음 (sourceName, sourceUrl 미기록)
**상태 필드**: 없음

### 3.2 현재 사용 화면
**파일**: `src/app/fish/page.tsx`

```typescript
import { fishItems } from "@/data/fish-data";

// 페이지에서 직접 사용
const filteredItems = fishItems.filter((item) => {
  const matchesCategory = category === "전체" || item.category === category;
  const searchable = [
    item.name,
    item.category,
    item.season,
    item.habitat,
    item.shortDescription,
    item.description,
    item.fishingTips,
    item.caution,
    ...item.relatedFish
  ].join(" ");
  return matchesCategory && searchable.includes(query);
});
```

**특징**:
- 클라이언트 사이드 렌더링 (use client)
- 메모리 기반 필터링
- 카드 UI로 표시
- 상세 페이지 라우팅 없음

### 3.3 해양 정보 타입 정의
**파일**: `src/lib/types/data-contract.ts`

```typescript
type CatchLog = {
  id: string;
  userId: string;
  location: Coordinates;
  timestamp: ISODateTimeString;
  species: string[]; // 어종명 배열 (미분류)
  weight?: number;
  length?: number;
  bait?: string;
  tackle?: string;
  photo?: string;
  notes?: string;
};

type FishingSpotVisit = {
  userId: string;
  spotId: string;
  visitedAt: ISODateTimeString;
  catchSummary: {
    species: string[]; // 역시 미분류
    count?: number;
    notes?: string;
  };
};
```

**문제**: species가 단순 문자열 배열이라 어종 정보와의 연결 방식 미정의

---

## 4. 데이터 입력부터 UI까지의 흐름

### 4.1 현재 어종 데이터 흐름

```
src/data/fish-data.ts (JSON 배열)
  ↓
  fishItems export
  ↓
  src/app/fish/page.tsx (클라이언트 렌더)
  ↓
  메모리 필터링 (이름, 설명, 팁, 주의사항 기반)
  ↓
  카드 UI 표시
  (상세 페이지 라우팅 없음)
```

### 4.2 Claude Code 콘텐츠 흐름 (현재: 미연결)

```
src/data/fish/*.ts (FishInfo)
  ↓
  검증기 (validate:content)
  ↓
  [미연결]

src/data/regulations/*.ts (FishingRegulation)
  ↓
  검증기
  ↓
  [미연결]
```

### 4.3 해양 정보 흐름

```
외부 API (KHOA, KMA)
  ↓
  src/lib/sea-info/*.ts (파서)
  ↓
  src/app/api/sea-info/* (라우트)
  ↓
  클라이언트 컴포넌트
  (지도, 낚시 정보 표시)
```

---

## 5. 신규 NIFS 어종 DB와 기존 구조의 매핑

### 5.1 필드 매핑표

| NIFS 레이어 | 필드 | 기존 FishItem | Claude Code FishInfo | 데이터 계약 | 동기화 방식 |
|---------|------|-------------|-------------------|-----------|----------|
| 원본 ID | sourceId | ❌ | ✅ (sourceId) | ❌ | 신규 필드 추가 |
| 원본 URL | sourceUrl | ❌ | ✅ | ❌ | 신규 필드 추가 |
| 어종명 | koreanName | ✅ (name) | ✅ (name/title) | ✅ (species[]) | 통일 필요 |
| 영명 | englishName | ❌ | ✅ | ❌ | FishItem 확장 |
| 학명 | scientificName | ❌ | ✅ | ❌ | FishItem 확장 |
| 분류 | category | ✅ | ✅ | ❌ | 통일 필요 |
| 설명 | description | ✅ (description) | ✅ (body) | ❌ | 통합 필요 |
| 서식지 | habitat | ✅ | ✅ | ❌ | 통일 필요 |
| 제철 | season | ✅ | ✅ | ❌ | 통일 필요 |
| 금어기 | closedSeason | ❌ | ✅ (별도 규제 테이블) | ❌ | 분리 테이블 필요 |
| 금지체장 | prohibitedLength | ❌ | ✅ (별도 규제 테이블) | ❌ | 분리 테이블 필요 |
| 검수 상태 | reviewStatus | ❌ | ✅ | ❌ | FishItem 확장 |
| 게시 상태 | published | ❌ | ✅ | ❌ | FishItem 확장 |

---

## 6. 필드 충돌 목록

### 6.1 타입 충돌

| 필드 | 기존 값 | Claude Code | 권장 해결 |
|------|--------|-----------|---------|
| `name` vs `title` | string | string (둘 다 사용 가능) | 표준화: `name` 선택 |
| `description` vs `body` | string | string (body 사용) | 통합: body로 통일 |
| `category` | enum (낚시 유형) | string (자유형) | 타입 확장 필요 |
| `relatedFish` | string[] | relatedQuestionIds (number[]) | 어종 상호참조 vs 문제 상호참조 분리 |

### 6.2 메타데이터 누락

기존 FishItem에 **없는** 필드:
- `sourceProvider` (필수: 출처 추적)
- `sourceId` (필수: NIFS ID)
- `sourceUrl` (필수: 원본 링크)
- `sourceCheckedAt` (필수: 수집 시각)
- `contentHash` (권장: 변경 감지)
- `reviewStatus` (필수: 검수 상태)
- `published` (필수: 게시 여부)
- `scientificName` (권장: 어류학 분류)
- `speciesId` (권장: 정규화)

---

## 7. 데이터 중복 및 동기화 위험

### 7.1 현재 문제점

**두 개의 완전히 분리된 어종 데이터 세트**:

1. **기존 fish-data.ts**
   - ~100+ 어종 (FishItem)
   - 메모리 기반
   - 메타데이터 없음
   - UI에 연결됨 ✅
   - Supabase와 분리됨

2. **Claude Code 작업 (FishInfo 등)**
   - 3개 어종 (FishInfo)
   - 스키마 검증 있음 ✅
   - 메타데이터 완비 ✅
   - UI 미연결 ❌
   - Supabase와 분리됨

### 7.2 향후 NIFS 크롤링 시 위험

1. **우럭 데이터 충돌**
   - fish-data.ts의 우럭 (FishItem)
   - fish-korean-rockfish.ts의 우럭 (FishInfo)
   - NIFS의 우럭 (원본 수집)
   → 어느 것이 최신? 손수 관리할 것? 자동 병합? **미정의**

2. **ID 체계 충돌**
   - FishItem: id = "우럭" (어종명 기반)
   - FishInfo: id = "fish-korean-rockfish-ureok" (slug 기반)
   - NIFS: id = sourceId (외부 ID)
   → 동일 어종 인식? **미정의**

3. **삭제 안전성**
   - NIFS 크롤링 실패 시 기존 데이터 삭제 위험
   - 사용자가 이미 보고 있는 데이터 누락 위험
   → Upsert 전략 필요

---

## 8. 마이그레이션 필요 여부

### 8.1 필수 마이그레이션

| 항목 | 필요성 | 이유 |
|------|--------|------|
| **Supabase 어종 테이블 추가** | ✅ 필수 | 메모리 기반에서 DB 기반으로 전환 필요 |
| **FishItem 스키마 확장** | ✅ 필수 | sourceId, reviewStatus, published 추가 |
| **FishingRegulation 테이블** | ✅ 필수 | 금어기·금지체장을 별도 테이블로 정규화 |
| **이미지 테이블 확장** | ✅ 필수 | mediaType (원본/AI) 구분 필요 |
| **html 저장 방식** | ✅ 권장 | JSON 블록 저장 + 컴포넌트 렌더링 |
| **검색 인덱싱** | ❌ 선택 | 현재 메모리 필터링으로 충분 (소규모) |

### 8.2 마이그레이션 순서

1. **Phase 1: 스키마 정의** (순서도 작성)
   - FishSpecies 테이블 설계
   - FishSourceRecord 테이블 (원본 보존)
   - FishingRegulation 테이블

2. **Phase 2: 기존 데이터 통합**
   - fish-data.ts의 ~100개 어종을 DB로 이관
   - FishInfo, FishingRegulation 데이터 확인

3. **Phase 3: UI 연결**
   - fish/page.tsx를 DB 쿼리 기반으로 재구성
   - 상세 페이지 라우팅 추가

4. **Phase 4: NIFS 크롤링 준비**
   - 원본 수집 레이어 추가
   - 정규화 로직 구현
   - 동기화 정책 적용

---

## 9. 권장 통합 방식

### 9.1 유지할 구조

| 구조 | 이유 | 변경 |
|------|------|------|
| **JSON 기반 메모리 데이터** | 소규모이고 성능 충분 | FishItem에 메타 필드 추가 |
| **메모리 필터링** | 클라이언트 UX 빠름 | 데이터 증가 시 인덱싱 검토 |
| **Supabase 통합** | 이미 구축되어 있음 | 어종 테이블만 추가 |

### 9.2 추가할 구조

```typescript
// 1. 기존 FishItem 확장
type FishItemExtended = FishItem & {
  speciesId?: string;
  scientificName?: string;
  sourceProvider?: "manual" | "NIFS" | ...;
  sourceId?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  contentHash?: string;
  reviewStatus?: ContentReviewStatus;
  published?: boolean;
};

// 2. 원본 기록 (어느 쪽이든 보존)
type FishSourceRecord = {
  sourceProvider: "NIFS";
  sourceId: string;
  sourceUrl: string;
  rawHtmlPath?: string;
  contentHash: string;
  collectedAt: string;
  crawlStatus: "pending" | "complete" | "failed";
};

// 3. 규제 정보 (별도 구조)
type FishRegulation = {
  speciesId: string; // FishItem.speciesId 참조
  region: string;
  closedSeason?: string;
  prohibitedLength?: string | number;
  effectiveFrom: string;
  effectiveTo: string;
  legalBasis: string;
  sourceProvider: string;
  reviewStatus: ContentReviewStatus;
};

// 4. AI 콘텐츠 (분리)
type FishGeneratedContent = {
  fishId: string; // FishItem.id 참조
  audience: "general" | "angler" | "children" | "seo";
  contentType: "introduction" | "ecology" | "fishingGuide" | ...;
  modelProvider: string;
  modelName: string;
  generatedPayload: unknown;
  reviewStatus: "pending" | "approved" | "rejected";
};

// 5. 이미지 (출처별 구분)
type FishMedia = {
  fishId: string;
  mediaType:
    | "source_original"
    | "ai_transformed"
    | "ai_realistic"
    | "ai_character";
  storagePath: string;
  sourceUrl?: string;
  modelProvider?: string;
  usageReviewStatus: "pending" | "approved" | "rejected";
};
```

### 9.3 변경할 구조

1. **FishItem 스키마**
   - 메타필드 추가 (sourceId, reviewStatus, published)
   - scientificName, speciesId 추가
   - contentHash 추가

2. **category 타입**
   - 현재: 낚시 유형만 지원
   - 변경: 더 유연한 분류 체계 필요
   - 권장: enum 대신 string으로 전환 후 validation

3. **상세 페이지 라우팅**
   - 현재: 없음
   - 추가: `/fish/[id]` 또는 `/fish/[slug]`

### 9.4 폐기할 구조

| 구조 | 이유 |
|------|------|
| 어종명만 기반의 동일성 판정 | 학명 추가로 정확도 향상 필요 |
| 메타데이터 없는 fish-data.ts | 출처 추적 필수 |

---

## 10. Claude Code와 합의할 DB 계약

### 10.1 식별자 정책

```typescript
// 내부 기본키
type FishSpecies = {
  id: string; // 내부 PK: "fish-korean-rockfish-ureok"

  // 외부 참조 (정규화 어종)
  speciesId: string; // "sebastes-koreanus" 등

  // 원본 추적 (NIFS 크롤링)
  sourceProvider: "NIFS" | "manual" | ...;
  sourceId: string; // "NIFS:12345"

  // unique 제약
  // (sourceProvider, sourceId) 조합은 unique
};
```

### 10.2 Upsert 정책

```typescript
// 신규 수집 시 처리 규칙
{
  sourceProvider: "NIFS",
  sourceId: "NIFS:12345",
  contentHash: "abc123...",

  // 기존 레코드 찾기
  existing = db.query(
    "sourceProvider = ? AND sourceId = ?",
    ["NIFS", "NIFS:12345"]
  );

  if (!existing) {
    // 신규 레코드: 생성
    db.insert(newRecord);
  } else if (existing.contentHash !== contentHash) {
    // 원본 변경: 업데이트
    db.update(existing.id, {
      ...newRecord,
      updatedAt: now(),
      changeReason: "source_content_updated",
    });
  } else {
    // 동일: 스킵 (lastCheckedAt만 갱신)
    db.update(existing.id, {
      lastCheckedAt: now(),
    });
  }

  // 수동 검수 콘텐츠는 절대 덮어쓰지 않음
  if (existing.reviewStatus === "approved" ||
      existing.publishStatus === "published") {
    // 변경 알림만 기록
    auditLog.add({
      type: "source_update_with_approved_content",
      fishId: existing.id,
      action: "skipped",
    });
  }
}
```

### 10.3 원본/정규화/AI 레이어

```typescript
// A. 원본 수집 레이어 (변경하지 않음)
type FishSourceRecord = {
  sourceProvider: "NIFS";
  sourceId: string; // "NIFS:native_id_here"
  sourceUrl: string;
  rawHtmlPath?: string;
  rawPayloadPath?: string;
  contentHash: string;
  collectedAt: string;
  crawlStatus: "pending" | "complete" | "failed";
  lastError?: string;
};

// B. 정규화 어종 레이어 (Codex 관리)
type FishSpecies = {
  id: string; // 내부 PK
  koreanName: string; // NIFS 원본
  englishName?: string;
  scientificName?: string;
  speciesId?: string;

  description?: string;
  habitat?: string;

  sourceProvider: "NIFS";
  sourceId: string; // A와 동일 ID

  factReviewStatus: "pending" | "reviewed" | "approved" | "rejected";
  publishStatus: "draft" | "review" | "published" | "archived";
};

// C. AI 확장 콘텐츠 레이어 (Claude Code 관리)
type FishGeneratedContent = {
  fishId: string;
  audience: "general" | "angler" | "children" | "seo";
  contentType: "introduction" | "ecology" | "fishingGuide" | ...;

  modelProvider: string;
  modelName: string;

  generatedPayload: unknown; // JSON 블록 또는 markdown
  reviewStatus: "pending" | "approved" | "rejected";
  generatedAt: string;

  // A의 contentHash 저장 (원본 변경 감지)
  sourceHash: string;
};
```

### 10.4 이미지 타입 정의

```typescript
type FishMedia = {
  id: string;
  fishId: string;

  // 이미지 출처
  mediaType:
    | "source_original"      // NIFS 원본 이미지
    | "ai_transformed"       // 원본 가공 (색상 보정 등)
    | "ai_realistic"         // 실제 같은 AI 생성
    | "ai_character"         // 캐릭터 AI 생성
    | "ai_infographic";      // 인포그래픽

  // 저장소
  storagePath: string;        // Supabase Storage 경로
  sourceUrl?: string;         // 원본 URL (NIFS 등)

  // 파일 메타
  mimeType: string;
  width?: number;
  height?: number;
  fileSize?: number;
  sha256?: string;

  // 생성 정보 (AI만 해당)
  modelProvider?: string;
  modelName?: string;
  promptVersion?: string;
  parentMediaId?: string;    // 원본 이미지를 참고한 변형

  // 검수
  usageReviewStatus: "pending" | "internal_only" | "approved" | "rejected";

  createdAt: string;
};
```

### 10.5 검수 상태 정의

```typescript
// 콘텐츠 검수 상태
type ContentReviewStatus =
  | "pending"        // 검수 대기
  | "in_review"      // 검수 중
  | "approved"       // 승인
  | "rejected"       // 거부
  | "needs_fact_check"; // 사실 확인 필요

// 어종 사실 검수
type FactReviewStatus =
  | "pending"        // 원본 미검증
  | "reviewed"       // 1차 검증 완료
  | "approved"       // 최종 승인
  | "rejected";      // 거부 (삭제 예정)

// 게시 상태
type PublishStatus =
  | "draft"          // 작성 중
  | "review"         // 검수 대기
  | "published"      // 공개
  | "archived";      // 보관
```

### 10.6 마이그레이션 체크리스트

**Claude Code가 준수해야 할 사항**:

- [ ] 모든 FishInfo에 sourceProvider, sourceId, sourceUrl 명시
- [ ] 모든 FishingRegulation에 effectiveFrom, legalBasis 명시
- [ ] relatedQuestionIds는 기존 문제 ID 확인 필수
- [ ] published 기본값: false
- [ ] reviewStatus 기본값: "needs_fact_check"
- [ ] scientificName은 선택사항 (있으면 추가, 없으면 빈 상태)
- [ ] FishInfo와 FishingRegulation 혼동 금지

**Codex가 준비해야 할 사항**:

- [ ] FishSpecies 테이블 추가 (Supabase)
- [ ] FishRegulation 테이블 추가
- [ ] FishMedia 테이블 추가 (mediaType 필드)
- [ ] FishSourceRecord 테이블 추가 (원본 보존)
- [ ] FishGeneratedContent 테이블 추가 (AI 콘텐츠)
- [ ] fish/[id] 상세 페이지 추가
- [ ] fish-data.ts를 FishSpecies로 마이그레이션
- [ ] 검수 워크플로우 추가
- [ ] SEO 메타데이터 처리

---

## 11. NIFS 크롤링을 위한 최종 DB 계약

### 11.1 테이블 정의안 (Supabase)

```sql
-- 원본 수집 레이어
CREATE TABLE fish_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider TEXT NOT NULL CHECK (source_provider IN ('NIFS', 'manual')),
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_html_path TEXT,
  raw_payload_path TEXT,
  content_hash TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  crawl_status TEXT NOT NULL CHECK (crawl_status IN ('pending', 'complete', 'failed')),
  last_error TEXT,
  UNIQUE (source_provider, source_id)
);

-- 정규화 어종 레이어
CREATE TABLE fish_species (
  id TEXT PRIMARY KEY,
  korean_name TEXT NOT NULL,
  english_name TEXT,
  scientific_name TEXT,
  species_id TEXT UNIQUE,

  description TEXT,
  habitat TEXT,
  season TEXT,
  tags TEXT[],

  source_provider TEXT NOT NULL,
  source_id TEXT NOT NULL,

  fact_review_status TEXT NOT NULL DEFAULT 'pending',
  publish_status TEXT NOT NULL DEFAULT 'draft',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (source_provider, source_id)
    REFERENCES fish_source_records(source_provider, source_id)
);

-- 규제 정보
CREATE TABLE fish_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_id TEXT NOT NULL REFERENCES fish_species(id),
  region TEXT NOT NULL,

  closed_season TEXT,
  prohibited_length TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE NOT NULL,
  legal_basis TEXT NOT NULL,

  source_provider TEXT NOT NULL,
  fact_review_status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI 생성 콘텐츠
CREATE TABLE fish_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_id TEXT NOT NULL REFERENCES fish_species(id),

  audience TEXT NOT NULL,
  content_type TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,

  generated_payload JSONB,
  source_hash TEXT,

  review_status TEXT NOT NULL DEFAULT 'pending',

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (fish_id) REFERENCES fish_species(id)
);

-- 이미지 저장
CREATE TABLE fish_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_id TEXT NOT NULL REFERENCES fish_species(id),

  media_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  source_url TEXT,

  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  sha256 TEXT,

  model_provider TEXT,
  model_name TEXT,
  parent_media_id UUID REFERENCES fish_media(id),

  usage_review_status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 11.2 동기화 로직

```typescript
// NIFS 크롤링 후 어종 동기화
async function syncNIFSFish(nifsFish: NIFSFishData): Promise<FishSpecies> {
  const sourceKey = {
    sourceProvider: "NIFS",
    sourceId: nifsFish.nativeId,
  };

  // 1. 원본 기록 추가/업데이트
  const sourceRecord = await db
    .from("fish_source_records")
    .upsert({
      ...sourceKey,
      sourceUrl: nifsFish.url,
      contentHash: calculateHash(nifsFish.rawContent),
      collectedAt: new Date().toISOString(),
      crawlStatus: "complete",
    });

  // 2. 기존 어종 확인
  const existing = await db
    .from("fish_species")
    .select()
    .match(sourceKey)
    .single();

  // 3. Upsert 로직
  if (!existing) {
    // 신규: 생성
    return await db
      .from("fish_species")
      .insert({
        id: generateFishId(nifsFish.koreanName),
        koreanName: nifsFish.koreanName,
        englishName: nifsFish.englishName,
        scientificName: nifsFish.scientificName,
        ...sourceKey,
        factReviewStatus: "pending",
        publishStatus: "draft",
      })
      .single();
  } else if (existing.contentHash !== sourceRecord.contentHash) {
    // 원본 변경: 업데이트
    return await db
      .from("fish_species")
      .update({
        description: nifsFish.description,
        habitat: nifsFish.habitat,
        factReviewStatus: "pending", // 재검증 필요
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .single();
  } else {
    // 동일: 스킵
    return existing;
  }
}
```

---

## 12. 미해결 사항 및 향후 결정 필요

| 항목 | 현황 | 담당 | 기한 |
|------|------|------|------|
| Supabase 테이블 설계 최종 확정 | 초안 완성 | Codex | 2026-08-15 |
| 기존 fish-data.ts 마이그레이션 계획 | 미정 | Codex | 2026-08-15 |
| NIFS 크롤러 구현 | 미정 | Claude Code | TBD |
| AI 콘텐츠 생성 프롬프트 | 미정 | 기획 | TBD |
| 이미지 저장소 정책 | 미정 | Codex + Claude Code | TBD |
| SEO 메타데이터 생성 방식 | 미정 | Claude Code | TBD |

---

## 13. 결론

### 현 상황 요약

1. **기존 구조**: 메모리 기반 FishItem (~100개)
2. **Claude Code 작업**: 스키마 정의 및 콘텐츠 3개 (FishInfo, FishingRegulation)
3. **Supabase**: 어종 테이블 없음
4. **UI**: fish-data.ts만 사용, 상세 페이지 없음

### 권장 통합 전략

**단계적 통합**:
1. FishItem 스키마 확장 (메타필드 추가)
2. Supabase 어종 테이블 추가
3. 기존 데이터 마이그레이션
4. UI 연결 (상세 페이지 추가)
5. NIFS 크롤링 레이어 추가

**핵심 원칙**:
- 원본, 정규화, AI 콘텐츠 분리
- 출처 추적 필수 (sourceProvider, sourceId)
- 검수 상태 관리 필수
- 기존 데이터 보호 (무분별 덮어쓰기 금지)
- 메타데이터 완전성

### 다음 액션 아이템

**Codex 담당**:
- [ ] Supabase 테이블 설계 최종 확정
- [ ] 마이그레이션 스크립트 작성
- [ ] fish/[id] 상세 페이지 추가
- [ ] 검수 워크플로우 UI 추가

**Claude Code 담당**:
- [ ] FishInfo, FishingRegulation 스키마 준수
- [ ] NIFS 크롤러 구현 (별도 파일)
- [ ] AI 콘텐츠 생성 파이프라인
- [ ] 이미지 처리 로직

---

**감사 완료**
이 문서를 기반으로 Codex와 Claude Code 간 DB 계약 체결을 권장합니다.
