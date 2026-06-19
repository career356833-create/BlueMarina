# Blue Marina Long QA Audit

작성일: 2026-06-19

## 1. 최종 판정

전체 판정: **PASS with Notes**

Blue Marina는 현재 **조종면허 학습앱 기준으로 출시 후보 상태**입니다. 일반조종면허 700문항, 요트조종면허 700문항, 총 1,400문항 기반 학습 기능은 정상 동작합니다. 문제풀이, 랜덤문제, 50문항 모의고사, 오답노트, 진도율, 학습분석, 이론학습, 실기학습 1차 구조, 기출문제 센터, 면허취득 로드맵까지 모바일 390px 기준으로 주요 화면 표시와 링크 이동을 확인했습니다.

다만 해양레저 포털 전체 관점에서는 아직 준비중 영역이 많습니다. 특히 홈의 실기학습 섹션은 새로 생성된 실기학습 하위 페이지와 아직 연결되지 않고 Coming Soon 링크를 유지하고 있어, 포털 IA 관점에서 우선 정리가 필요합니다.

## 2. 전체 라우트 QA

아래 라우트는 모바일 390px 기준으로 진입, 주요 텍스트 표시, 가로 스크롤 없음, 콘솔 에러 없음, Runtime/Hydration 오류 없음 상태를 확인했습니다.

- `/`
- `/license-guide`
- `/exam-guide`
- `/safety-guide`
- `/license-issue`
- `/leisure-report`
- `/official-links`
- `/centers`
- `/study?license=general`
- `/study?license=yacht`
- `/random?license=general`
- `/random?license=yacht`
- `/exam?license=general`
- `/exam?license=yacht`
- `/wrong?license=general`
- `/wrong?license=yacht`
- `/progress?license=general`
- `/progress?license=yacht`
- `/analysis?license=general`
- `/analysis?license=yacht`
- `/theory`
- `/practice`
- `/practice/course`
- `/practice/fail-items`
- `/practice/checklist`
- `/practice/videos`
- `/past`
- `/coming-soon?section=해양정보&feature=조석표`
- `/privacy`
- `/terms`
- `/contact`

참고: `/past`는 페이지 본문에 준비 예정 문구가 포함되어 자동 fallback 탐지에 걸릴 수 있으나, 실제 Suspense fallback 고착은 아니며 기출문제 학습센터 화면이 정상 표시됩니다.

## 3. 모바일 QA

모바일 390px 기준 결과:

- 가로 스크롤: 발견되지 않음
- 하단 네비게이션: 문제 선택, 다음 이동, 카드 클릭 흐름에서 주요 버튼을 가리는 문제 없음
- 주요 카드 표시: 정상
- 콘솔 에러: 없음
- Runtime Error, Hydration Error, `[object Event]`: 없음

## 4. 학습 기능 QA

일반조종면허와 요트조종면허 각각 아래 흐름을 확인했습니다.

- 문제풀이: 보기 클릭, 정답/오답 표시, 다음 문제 이동 정상
- 랜덤문제: 보기 클릭, 정답/오답 표시, 다음 랜덤 문제 이동 정상
- 오답노트: 저장된 오답 표시, 다시 풀기 및 다음 오답 이동 정상
- 모의고사: 일반/요트 모두 50문항 제출, 점수 표시, 1급/2급 판정 표시 정상
- 진도율: 면허별 화면 표시 정상
- 학습분석: 면허별 분석 리포트 표시 정상
- 이론학습: `등화 식별` 상세의 관련 문제 풀기 링크가 `/study?license=general&tag=등화`로 정상 이동
- localStorage 분리: 코드 구조상 `blue-marina:{license}:progress`, `wrong`, `exam-history`, `answer-history`로 분리 저장되며, 화면에서도 일반/요트 기록이 다르게 표시됨

## 5. 실기학습 QA

확인 라우트:

- `/practice`
- `/practice/course`
- `/practice/fail-items`
- `/practice/checklist`
- `/practice/videos`

확인 결과:

- 실기 코스 카드 → `/practice/course`: 정상
- 실격 사유 카드 → `/practice/fail-items`: 정상
- 시험 전 체크리스트 카드 → `/practice/checklist`: 정상
- 실기 영상 카드 → `/practice/videos`: 정상
- `/practice/videos`: 외부 영상 링크 0개, iframe 0개, video 태그 0개
- 실제 영상 업로드, 유튜브 임베드, 외부 영상 링크 없음

## 6. 포털 QA

### 면허취득 로드맵

`/license-guide` 내부 링크 확인:

- `/exam-guide`
- `/safety-guide`
- `/license-issue`
- `/official-links`
- `/centers`
- `/study`
- `/past`
- `/practice`
- `/theory`
- `/exam`

모든 링크 href 존재를 확인했습니다.

### 공식 신청센터

`/official-links` 외부 공식 링크:

- 외부 링크 수: 17개
- `target="_blank"` 누락: 0개
- `rel="noopener noreferrer"` 누락: 0개
- 온라인 안전교육 직접 URL은 확인중 상태 유지

### 시험장/교육장 안내

`/centers` 확인:

- 지역 필터 표시
- 시설 종류 필터 표시
- 면허 종류 필터 표시
- 검색어 입력 표시
- 지도 기능 준비중 placeholder 표시
- 실제 지도 API 연동 없음

### Coming Soon

`/coming-soon?section=해양정보&feature=조석표` 정상 표시를 확인했습니다.

## 7. 데이터 감사

### 문제 데이터

- 일반조종면허: 700문항
- 요트조종면허: 700문항
- 총합: 1,400문항
- 일반 id 1~700 연속: 정상
- 요트 id 1~700 연속: 정상
- 중복 id: 없음
- 빈 question: 없음
- choices 4개 미만/초과 또는 빈 보기: 없음
- answer 0~3 범위 오류: 없음
- category 빈 값: 없음
- subCategory 빈 값: 없음
- detailCategory 빈 값: 없음
- tags 빈 값: 없음
- 대분류 수: 8개
- 태그 수: 594개

해설 누락:

- 일반조종면허: 14문항
- 요트조종면허: 155문항
- 총합: 169문항

판정: 문제풀이 기능에는 치명적이지 않지만, 학습 품질 관점에서는 해설 보강 우선순위가 높습니다.

### 이론 데이터

- 이론 목차: 30개
- ready: 30개
- draft: 0개
- coming-soon: 0개
- 빈 content: 없음
- examPoints 누락: 없음
- commonMistakes 누락: 없음

## 8. 발견된 버그 및 수정 필요 항목

치명적 오류: 없음

중대 오류:

- 현재 확인된 런타임/빌드/라우트 진입 중대 오류는 없음

경미 또는 구조상 수정 필요:

1. 홈 `실기학습` 섹션의 4개 카드가 아직 Coming Soon 링크를 유지하고 있음
   - 현재 `/practice/course`, `/practice/fail-items`, `/practice/checklist`, `/practice/videos`가 존재하므로 홈 포털 섹션도 실제 라우트로 연결하는 것이 자연스럽습니다.
2. `/past` 본문에 준비 예정 문구가 있어 자동 fallback 탐지와 혼동될 수 있음
   - 실제 오류는 아니지만 QA 자동화 문구 기준을 더 정교하게 할 필요가 있습니다.
3. 일부 공식 수수료/소요 기간/URL이 코드에 하드코딩되어 있음
   - `/exam-guide`, `/safety-guide`, `/license-issue`, `/official-links`
   - 공식 자료 변경 가능성이 있으므로 추후 별도 데이터 파일화와 `sourceCheckedAt` 관리 권장
4. `src/data/categoryTree.ts`에 과거 TODO 주석이 남아 있음
   - 실제 매핑은 완료된 상태이므로 문서/주석 정리 후보입니다.

## 9. 기술 부채

### 사용하지 않는 파일 후보

KidsAuto 시절 구조로 보이는 잔여 컴포넌트/라이브러리 후보:

- `src/components/auth/*`
- `src/components/content/*`
- `src/components/dashboard/*`
- `src/components/layout/*`
- `src/components/saved/*`
- `src/components/ui/*`
- `src/lib/ai/*`
- `src/lib/supabase/*`
- `src/lib/stripe/*`
- `src/lib/content-format.ts`
- `src/lib/local-store.ts`

주의: 실제 삭제 전에는 import 그래프 확인이 필요합니다.

### 사용하지 않는 의존성 후보

현재 Blue Marina 조종면허 앱 기준으로 재검토할 의존성:

- `@supabase/ssr`
- `@supabase/supabase-js`
- `openai`
- `zod`

`clsx`, `tailwind-merge`는 `src/lib/utils.ts`에서 사용되지만, 해당 유틸이 현재 주요 Blue Marina 화면에서 필요한지 추가 확인이 필요합니다.

### 중복/정리 후보

- 포털 카드 스타일이 여러 페이지에 반복됨
- `SectionTitle` 유사 컴포넌트가 여러 페이지에 중복 존재
- 실기학습 카드/기출 카드/면허 로드맵 카드 구조를 공통 컴포넌트로 묶을 수 있음

### placeholder로 남은 부분

- 해양정보: 조석표, 물때 정보, 해상날씨, 항로표지 가이드
- 실기시험 안내 세부 페이지
- 교육장 안내 데이터
- 지도 서비스
- 해양용품
- 커뮤니티
- AI 학습센터
- AdSense 실제 코드
- PWA 오프라인 캐시 고도화
- 실기 영상 실제 콘텐츠
- 연도별/회차별 기출문제 데이터
- 전국 시험장/교육장 실제 데이터

## 10. 출시 가능도 평가

100점 기준:

- 조종면허 학습앱: **88점**
  - 1,400문항, 모의고사, 오답노트, 분석, 이론 30개가 갖춰져 있어 학습앱으로는 출시 후보 수준입니다.
  - 감점 요인: 일부 해설 누락, 해설 품질 편차 가능성, 계정/동기화 부재

- 조종면허 포털: **72점**
  - 면허 안내, 공식 링크, 시설 안내 구조가 있으며 기본 포털 역할은 가능합니다.
  - 감점 요인: 실제 시설 데이터 부족, 일부 제도 정보 하드코딩, 홈 링크 일부 미연결

- 해양레저 포털: **48점**
  - 확장 IA는 있으나 해양정보/용품/커뮤니티/AI 기능이 대부분 준비중입니다.
  - 현재는 해양레저 플랫폼보다는 조종면허 학습앱에 가깝습니다.

최종 단계 평가:

현재 Blue Marina는 **문제은행 앱을 넘어 조종면허 학습앱 단계에 진입했고, 해양레저 포털로 확장 중인 상태**입니다.

## 11. 다음 개발 우선순위 TOP30

### 버그 수정

1. 홈 실기학습 섹션 카드 4개를 실제 `/practice/*` 라우트로 연결
2. `/past` 준비 예정 문구와 QA fallback 탐지 혼동 제거
3. 기존 KidsAuto 잔여 컴포넌트 import/사용 여부 정밀 감사
4. 공식 수수료/URL/소요 기간 하드코딩 데이터 파일화
5. PWA service worker 캐시 정책 재검토

### 콘텐츠 보강

6. 해설 누락 169문항 보강
7. 해설 품질 낮은 문항 샘플링 검수
8. 이론 30개 콘텐츠 전문성 검수
9. 실기 코스 학습 콘텐츠 세분화
10. 실격 사유 콘텐츠를 공식 기준 확인 후 보강
11. 체크리스트 문구를 시험장 안내 기준으로 보강
12. 면허시험 안내 최신 공식 자료 기준 재검수
13. 수상안전교육 안내 최신 공식 자료 기준 재검수
14. 면허증 발급 안내 최신 공식 자료 기준 재검수
15. 레저활동 신고 안내 공식 기준 검수

### 데이터 입력

16. 전국 필기시험장 실제 데이터 구축
17. 전국 실기시험장 실제 데이터 구축
18. 수상안전교육장 실제 데이터 구축
19. 면제교육장 실제 데이터 구축
20. 시설 데이터 `sourceUrl`, `sourceCheckedAt` 관리
21. 연도별 기출문제 데이터 확보
22. 회차별 기출문제 데이터 확보
23. 빈출 유형 통계 데이터 생성

### 신규 기능

24. 시설 안내 지역/유형 필터를 실제 데이터 기반으로 고도화
25. 카카오맵 또는 네이버지도 연동 검토
26. 기출문제 전용 풀이 모드 구축
27. 학습분석에서 이론학습 추천 정교화
28. 오답노트 필터와 태그별 복습 강화

### 수익화

29. AdSense 실제 슬롯 적용 전 정책 페이지/콘텐츠 밀도 최종 점검
30. 해양용품 추천/제휴 영역을 광고 정책에 맞게 별도 설계

## 12. 검증 결과

장시간 QA 중 확인:

- 전체 라우트 모바일 QA: PASS
- 주요 학습 기능 클릭 QA: PASS
- 일반/요트 모의고사 50문항 제출 QA: PASS
- 공식 링크 target/rel QA: PASS
- 데이터 감사: PASS with 해설 누락 보강 필요

최종 검증 명령:

- `npm run lint`: PASS
- `npm run build`: PASS

## 13. 커밋/배포 상태

요청에 따라 이 감사 작업에서는 commit, push, 배포를 수행하지 않았습니다.
