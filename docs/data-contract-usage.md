# Blue Marina Data Contract Usage Guide

## Purpose
`src/lib/types/data-contract.ts`는 Blue Marina의 공통 도메인 계약을 담는 상위 타입 레이어다.  
이 파일의 목적은 해양 데이터, 조황 기록, 선장 데이터, AI 예측 결과를 한 번에 묶는 것이 아니라, **각 도메인이 공통으로 이해할 수 있는 최소 계약**만 제공하는 데 있다.

## Current type ownership

| Domain | Canonical source | Role |
| --- | --- | --- |
| Sea info runtime / API transport | `src/lib/sea-info/types.ts`, `src/lib/sea-info/tide-normalize.ts`, `src/lib/sea-info/kma-marine-forecast.ts` | KHOA/KMA 응답 정규화와 전송 계약 |
| App-wide sea contract | `src/lib/types/data-contract.ts` | 홈/해양정보/UI/저장소에서 쓰는 공통 계약 |
| Learning state / exam history | `src/lib/boat/storage.ts`, `src/lib/boat/supabase-sync.ts` | 문제풀이, 진도율, 오답, 시험 기록 |
| Question bank | `src/lib/boat/questions.ts`, `src/data/questions.ts`, `src/data/yacht-questions.ts` | 출제 데이터와 면허별 문제 집합 |
| AI provider interface | `src/lib/ai/types.ts`, `src/lib/ai/index.ts` | 생성형 AI 공급자 계약 |

## Type-by-type usage

### 1) `SeaSummary`

사용 위치:
- `HomeLanding`
- `sea-info` 화면
- API adapter

권장 사용 방식:
- UI는 `SeaSummary`만 소비한다.
- KHOA/KMA 원본 응답은 직접 UI로 전달하지 않는다.
- `sea-info`의 route handler 또는 normalize layer가 원본 응답을 `SeaSummary`로 변환한다.

비권장:
- `src/lib/sea-info/types.ts`의 transport 전용 타입을 홈 UI에서 직접 쓰는 것
- upstream 응답 필드명을 UI에서 직접 참조하는 것

### 2) `SeaInterestProfile`

사용 위치:
- 사용자 설정
- localStorage
- Supabase

권장 사용 방식:
- 관심 해역 선택값은 localStorage에 먼저 저장하고, 필요 시 Supabase로 동기화한다.
- `observatoryId`는 관측소 식별자, `location`은 표시용 위치 정보로 유지한다.

비권장:
- 현재 위치 권한 결과를 자동 저장하는 것
- 관측소 선택을 KHOA/KMA 원본 응답에 종속시키는 것

### 3) `CatchLog`

사용 위치:
- 조황 기록
- 사진 기록
- 선장 데이터

권장 사용 방식:
- 사용자 조황 기록과 선장 조황 기록을 같은 형태로 저장할 때 사용한다.
- 사진, 메모, 채비, 미끼 정보는 선택 필드로 유지해 입력 부담을 줄인다.

비권장:
- 문제은행 오답 기록과 혼합하는 것
- 출조 기록의 UI 상태를 질문 데이터와 엮는 것

### 4) `FishingSpotVisit`

사용 위치:
- 출조 기록
- 방문 이력

권장 사용 방식:
- 특정 출조거점에 방문한 이력을 저장할 때 사용한다.
- 날씨/조석 스냅샷은 당시 시점의 축약값만 담고, 원본 API 필드 전체는 저장하지 않는다.

비권장:
- `CatchLog`와 동일한 모델로 취급하는 것
- 지도 SDK 마커 데이터와 직접 결합하는 것

### 5) `CaptainInsight`

사용 위치:
- 선장 서비스
- 추천 콘텐츠

권장 사용 방식:
- 특정 선장, 선박, 권역, 추천 어종, 권장 조건을 묶는 운영용 데이터로 사용한다.
- 검증 상태(`verified`)를 반드시 두어 사용자 노출 전 신뢰도를 구분한다.

비권장:
- 조황 기록 원본과 같은 테이블에 섞는 것
- 학습앱 문제/이론 데이터와 같은 계층에 두는 것

### 6) `ForecastFeatureVector`

사용 위치:
- prediction engine
- AI feature 생성

권장 사용 방식:
- 조석, 파고, 바람, 수온, 기압, 강수, 너울, 시점, 위치를 표준 입력 벡터로 사용한다.
- KHOA/KMA 원본 필드 대신 예측 엔진 전용 정규화 입력으로 다룬다.

비권장:
- UI 렌더링용으로 직접 쓰는 것
- API 원문 필드명을 그대로 노출하는 것

### 7) `PredictionResult`

사용 위치:
- AI 결과
- 사용자 추천 화면

권장 사용 방식:
- 예측 점수, 추천 어종, 추천 해역, 신뢰도, 이유를 표준 결과로 저장한다.
- 추천 UI는 `PredictionResult`만 보면 되도록 설계한다.

비권장:
- AI provider의 원시 응답을 직접 화면에 뿌리는 것
- 학습앱 진도/합격 예측과 혼합하는 것

## Import rules

1. UI는 가능하면 `src/lib/types/data-contract.ts`를 우선 소비한다.
2. API 응답 타입은 `data-contract`로 직접 쓰지 않는다.
3. 흐름은 `API -> normalize -> data-contract -> UI` 순서를 유지한다.
4. AI는 `ForecastFeatureVector`와 `PredictionResult`만 사용한다.
5. 면허 학습 타입과 해양 데이터 타입은 서로 재사용하지 않는다.

## Existing type comparison

### `src/lib/sea-info/types.ts`
현재 파일은 KHOA/KMA 원본 응답과 해양 요약 내부 표현을 함께 담고 있다.  
이 파일은 **transport / normalize 중심**으로 유지하고, UI와 저장은 `data-contract`를 우선 사용한다.

### `src/lib/boat/storage.ts`
현재 파일은 문제풀이와 진도율의 로컬 저장용 타입을 담당한다.  
이 파일은 학습 도메인 전용으로 유지하고, 해양 조황/선장 데이터는 같은 저장소 키를 공유하지 않는다.

### `src/lib/ai/types.ts`
현재 파일은 생성형 AI 공급자 인터페이스만 정의한다.  
실제 예측 데이터 계약은 `ForecastFeatureVector`, `PredictionResult`로 분리하는 것이 맞다.

## Conflict risk

현재 충돌 가능성이 큰 지점은 다음과 같다.

- `SeaSummary`가 `src/lib/sea-info/types.ts`와 `src/lib/types/data-contract.ts`에 동시에 존재할 수 있음
- `CatchLog`가 향후 `boat/storage.ts`와 역할이 겹칠 수 있음
- `PredictionResult`가 기존 `boat/prediction.ts`의 합격 예측과 이름이 비슷할 수 있음

따라서 이름은 비슷해도 역할은 분리해야 한다.

## Supabase table mapping candidates

후속 Supabase 연결 시 다음 이름이 자연스럽다.

- `sea_interest_profiles`
- `catch_logs`
- `fishing_spot_visits`
- `captain_insights`
- `prediction_results`

해양 데이터 테이블은 학습 상태 테이블(`blue_marina_learning_states`)과 분리하는 것이 좋다.

## Recommended next step

1. 해양 데이터 UI가 `SeaSummary`를 우선 소비하도록 정리
2. 관심 해역 저장을 `SeaInterestProfile`로 고정
3. 조황 기록과 방문 이력을 Supabase 테이블로 분리
4. 예측 엔진은 `ForecastFeatureVector -> PredictionResult` 경로로 고정
5. 마지막에 선장용 데이터와 추천 콘텐츠를 별도 도메인으로 확장
