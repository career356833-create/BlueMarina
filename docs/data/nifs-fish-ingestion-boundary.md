# NIFS Fish Ingestion Boundary

이 문서는 Claude 크롤러와 Blue Marina 본체의 책임 경계를 고정한다.

## 1. 역할 분리

### Claude

Claude는 **정적 정보 수집과 staging 파일 생성**만 담당한다.

허용:

- NIFS 원문 수집
- raw HTML / JSON / 이미지 메타데이터 정리
- manifest 생성
- 출처/변경/오류 리포트 생성

금지:

- 앱 코드 수정
- Supabase 직접 수정
- DB upsert
- 라우트 수정
- UI 수정
- 환경변수 수정

### Codex

Codex는 아래를 담당한다.

- 계약 정의
- 원본 정규화
- 검수
- Supabase 설계 및 적용 검토
- 앱 연결
- 최종 lint/build

## 2. Claude 전용 작업 경로

Claude가 수정할 수 있는 경로:

- `src/content/**`
- `src/data/fish/**`
- `src/data/regulations/**`
- `src/data/seo/**`
- `data-import/nifs/raw/**`
- `data-import/nifs/manifest/**`
- `data-import/nifs/media/**`
- `data-import/nifs/reports/**`

Claude가 수정하면 안 되는 경로:

- `src/app/**`
- `src/components/**`
- `src/lib/types/**`
- `src/lib/db/**`
- `src/lib/ai/**`
- `src/lib/boat/**`
- `src/lib/sea-info/**`
- `src/lib/geocoding/**`
- `src/lib/geo/**`
- `src/data/fish-data.ts`
- API routes
- `middleware.ts`
- `package.json`
- `.env.local`
- 문제풀이 엔진
- 지도/GPS 기능

## 3. 파일명 규칙

- lowercase `kebab-case`
- 의미가 드러나는 단어만 사용
- 동일 주제는 동일한 prefix 유지
- 날짜/버전은 꼭 필요할 때만 포함

예:

- `nifs-fish-raw-20260731.json`
- `nifs-fish-manifest-20260731.json`
- `nifs-fish-report-20260731.md`

## 4. ID / slug 규칙

- `id`는 영구적으로 안정적이어야 한다.
- `slug`는 lowercase `kebab-case`를 사용한다.
- `sourceProvider + sourceId`는 외부 고유키다.
- 어종명만으로 upsert하지 않는다.
- 같은 학명이라도 출처가 다르면 자동 병합하지 않는다.

## 5. 출처 기록 규칙

모든 staging record는 최소한 아래를 포함한다.

- `sourceProvider`
- `sourceId`
- `sourceUrl`
- `fetchedAt`
- `contentHash`
- `parserVersion`

필요 시 추가:

- `rawHtmlPath`
- `rawPayloadPath`
- `imageUrls`
- `crawlStatus`
- `errorMessage`

## 6. Claude staging 산출물 형태

### raw

원문 HTML, JSON, 이미지 URL 목록을 보관한다.

### manifest

어종별 1개 이상의 manifest 파일을 둔다.

권장 필드:

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

### media

원문 이미지와 생성 이미지의 출처 추적만 유지한다.

### reports

검증 결과, 실패 목록, 중복 후보, 출처 누락 등의 보고를 둔다.

## 7. 검증 규칙

Claude staging 데이터는 Codex가 아래를 검증한 뒤에만 다음 단계로 넘어간다.

- duplicate `sourceProvider + sourceId`
- duplicate `slug`
- missing required fields
- invalid dates
- invalid review status
- invalid relatedQuestionIds
- source missing / last seen 갱신 여부
- 원문과 생성문 혼합 여부

## 8. 변경 감지 규칙

- hash가 같으면 내용 재생성 없이 `lastSeenAt`만 갱신
- hash가 달라지면 새 source version 또는 change log를 생성
- source missing은 즉시 삭제가 아니라 review 흐름으로 넘긴다
- 사실 검수 완료된 필드는 원문 변경만으로 자동 승인하지 않는다
- 게시 중인 콘텐츠는 원문 오류로 자동 비공개하지 않는다

## 9. 통합 절차

1. Claude가 전용 폴더에 데이터 생성
2. Claude가 staging 검증 수행
3. Codex가 계약과 실제 데이터를 비교
4. Codex가 앱에 연결
5. Codex가 `npm run validate:content`
6. Codex가 `npm run lint`
7. Codex가 `npm run build`

## 10. 운영 원칙

- 임의 사실 생성 금지
- 공식 출처 우선
- 원문과 AI 생성물 혼합 금지
- 앱 구조 변경 금지
- existing data 이동/변환은 Codex 승인 전 금지
