# Blue Marina Supabase 학습기록 동기화

## 목적

Blue Marina의 문제풀이, 오답노트, 진도율, 모의고사 기록은 브라우저 `localStorage`를 기본 저장소로 사용한다.
Supabase 환경변수와 로그인 세션이 있는 경우에는 같은 데이터를 Supabase에도 비동기 저장한다.

## 저장 방식

- 기본 동작: localStorage 즉시 저장
- 보조 동작: Supabase 로그인 사용자의 면허별 학습 상태를 `blue_marina_learning_states`에 upsert
- 복구 동작: 로컬 기록이 비어 있으면 Supabase에서 면허별 상태를 불러와 localStorage에 hydrate

## 테이블

`supabase/schema.sql`에 `public.blue_marina_learning_states`가 추가되어 있다.
실제 Supabase 프로젝트에는 아래 migration 파일을 적용한다.

- `supabase/migrations/202606300001_blue_marina_learning_states.sql`

핵심 컬럼:

- `user_id`
- `license_type`: `general` 또는 `yacht`
- `progress`
- `wrong_ids`
- `answer_history`
- `exam_history`
- `updated_at`

## RLS 정책

로그인한 사용자는 자기 행만 조회, 생성, 수정, 삭제할 수 있다.

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

클라이언트 학습 동기화는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 있을 때만 동작한다.
실제 키는 Git에 커밋하지 않는다.

## 동작 위치

- 저장 큐: `src/lib/boat/supabase-sync.ts`
- localStorage + sync 연결: `src/lib/boat/storage.ts`
- hydrate 진입점:
  - 홈
  - 진도율
  - 학습 분석

## 현재 한계

- 로그인 UI가 Blue Marina용으로 별도 정리되어 있지 않다.
- localStorage에 기존 기록이 있으면 Supabase 기록으로 덮어쓰지 않는다.
- 충돌 병합은 아직 없다.
- 오프라인 중 실패한 sync 재시도 큐는 아직 없다.

## 다음 단계

1. Blue Marina용 로그인/계정 화면 정리
2. Supabase 프로젝트에 `supabase/migrations/202606300001_blue_marina_learning_states.sql` 적용
3. 테스트 계정으로 일반/요트 학습 기록 저장 확인
4. 새 브라우저에서 Supabase 기록 hydrate 확인
5. localStorage와 Supabase 충돌 병합 정책 설계
