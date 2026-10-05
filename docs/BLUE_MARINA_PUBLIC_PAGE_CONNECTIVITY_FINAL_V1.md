# Blue Marina Public Page Connectivity Finalization V1

기준: `c7f6003b670fb14ae79e3a8f90e68dd3f502a578` / 2026-10-05.

**PUBLIC_PAGE_CONNECTIVITY_COMPLETE_WITH_LIMITATIONS**

플랫폼 재판정: **BLUE_MARINA_PLATFORM_CONNECTED_AND_ENGINE_READY**. 이는 기존 엔진을 유지한 사용자 이동 경로 판정이며, 이번 작업에서 인증·데이터 공급자·GPS를 새로 Production 인증했다는 뜻은 아니다.

## 범위와 측정

기존 Connectivity & Engine Master Audit V1을 읽은 뒤 현재 main 소스를 다시 조사했다. 과거 33/10/4를 그대로 재사용하지 않았다. 현재는 페이지 템플릿 64개이며, 기존 감사 이후 관리자 moderation 화면이 1개 추가됐다. 기존 분류의 공개 47개와 gated/admin/internal 17개를 구분한다. Account landing은 공개 47개에 포함되지만 로그인·saved·activity 같은 지원 경로는 별도 QA 대상이다.

| 분류 | 현재 main 변경 전 | 변경 후 |
|---|---:|---:|
| CONNECTED | 34 | 44 |
| WEAKLY_CONNECTED | 5 | 3 |
| ISOLATED | 8 | 0 |
| 공개 템플릿 | 47 | 47 |

CONNECTED는 Home에서 도달할 수 있고 유용한 다음/복귀 행동이 있는 화면이다. ISOLATED는 의미 있는 진입 링크가 없는 활성 공개 화면이다. WEAKLY_CONNECTED의 3개 사업 상세 템플릿은 공개 레코드가 없어서 활성 그래프에서 도달할 수 없는 상태다. 정상 상세 진입을 검증한 것으로 계산하지 않으며, unavailable 화면과 부모 목록 복귀만 확인했다. 가짜 레코드나 억지 진입 링크를 만들지 않았다.

보고서에는 47개 각각의 inbound/outbound, primary/secondary CTA, back path, related content, success next action을 기록했다. 실제 렌더링된 링크를 사용하고, 어종 accordion처럼 조건부 노출되는 링크는 클릭 증빙을 구분했다. `activePaths`의 활성 메뉴 판정용 문자열과 dev-audit 목록은 진입 링크로 세지 않는다. `/market/new` 같은 정적 private route가 `/market/[id]`로 잘못 집계되지 않도록 먼저 정적 경로를 대조했다.

## 사전 확정 대상과 적용

| 변경 전 | 경로 | 문제와 연결 |
|---|---|---|
| ISOLATED | `/boatpedia` | Guide의 선박·장비 자료 → 백과 → 용어/안전/Guide |
| ISOLATED | `/dictionary` | Guide·이론 → 용어 사전 → 이론/백과/Guide |
| ISOLATED | `/marine-knowledge` | Guide → 해양 기초지식 → Today Sea/관측소/Guide |
| ISOLATED | `/faq` | Contact·Guide → FAQ → 문의/준비 중 안내/Home |
| ISOLATED | `/coming-soon` | FAQ → 준비 중 기능 → 사용 가능한 서비스/학습 |
| ISOLATED | `/wrong`, `/progress`, `/analysis` | 기존 공통 메뉴에 실제 링크가 없었음. 학습 8개 빠른 이동과 시험 결과 다음 행동으로 연결 |
| WEAK | `/fish` | 펼친 어종 카드 → 해당 이름을 유지한 기존 낚시 포인트 검색 |
| WEAK | `/sea-info` | 직접 조회 종료 뒤 Today Sea/Sea/해양 기초지식으로 연결 |
| WEAK 유지 | `/charters/[id]`, `/market/[id]`, `/community/[id]` | 공개 레코드 부재. 정확한 unavailable 및 부모 복귀를 유지 |

공통 RelatedActions 컴포넌트를 재사용하며 새 페이지, 추천 엔진, 전역 상태를 만들지 않았다. 학습 메뉴는 `license=general/yacht`를 보존하고 invalid 값은 general로 처리한다. 시험 점수·답안 저장 로직은 바꾸지 않았다.

Fish guide의 이름을 canonical species ID로 추측하지 않는다. `감성돔 → /fishing-spots?q=감성돔&source=fish#spot-search`는 명칭 검색이다. 실제 검색 입력과 991개 결과를 확인했으며, 해당 개수를 1:1 종 동정이나 어획 가능성으로 해석하지 않는다. 기존 336종 guide와 canonical 1,258종의 차이를 숨기지 않는다.

## Account·empty state

- Account 로그인 요청은 saved/activity/profile의 원래 내부 returnTo를 유지한다.
- Saved link는 entity type과 ID가 맞는 내부 경로인지 확인한다. 잘못된 URL은 이유를 표시하고 올바른 부모 목록으로 연결한다.
- 실제 FISH bookmark 경로인 Conditions `speciesId`를 Home에서도 유지한다. 존재하지 않는 `/fish/[id]` 형식은 Home에서 제외하고 Account에서 도감 fallback을 제공한다.
- URL 유효성은 원격 레코드의 공개 상태를 보증하지 않는다. 삭제·비공개 콘텐츠는 기존 상세 unavailable 화면과 목록 링크가 처리한다. 원격 상태 조회 엔진은 추가하지 않았다.
- ACTIVE Market 활동은 공개 상세로, 나머지는 `/market/new#listing-ID`의 본인 관리 화면으로 이동한다. 서버 인증·소유권 경계를 유지한다.
- 기기 로컬 Community 활동은 서버 게시 이력이라고 표시하지 않고 기존 작성/내 글 화면으로 안내한다. Charter 문의 이력 미연결도 그대로 표시한다.
- Charter empty → 업체 안내/등록·다른 해양 서비스, Market empty → 판매글 작성·관리/Community, Community empty → 글 작성/낚시 포인트를 유지했다. Market의 오래된 로컬 임시저장 안내는 현재 검토 요청 흐름에 맞췄다.

## 여정 검증

| 여정 | 결과 | 실제 확인 / 한계 |
|---|---|---|
| Home → Spot → Conditions → Navigation | COMPLETE_WITH_FRICTION | rock-151·감성돔에서 Conditions 선택과 목적지 좌표/이름·상세 복귀 확인. clean 환경 지도 공급자/GPS 재인증 없음 |
| Home → Fish → 관련 행동 | COMPLETE | 어종 카드 클릭, 명칭 검색 전달 및 결과 확인 |
| Home → Charter → Partner/Onboarding | COMPLETE_WITH_FRICTION | 실제 링크 클릭 완료. clean 환경 신규 인증/제출은 미실행 |
| Home → Market → New | COMPLETE_WITH_FRICTION | empty CTA 및 작성 화면 도착. 제출/공개 데이터 생성 없음 |
| Home → Community → New | COMPLETE_WITH_FRICTION | empty CTA 및 작성 화면 도착. 제출/공개 데이터 생성 없음 |
| Login → Account → Saved → 원본 | COMPLETE_WITH_FRICTION | saved 로그인 returnTo 클릭, helper/권한 경계 회귀 테스트. 실제 로그인·원격 saved 데이터 browser E2E는 미실행 |
| Guide → Study → Exam/Practice → Progress | COMPLETE | yacht 문맥으로 Guide→Study→Exam→Progress 클릭, Practice family 전수 화면 확인, 시험 결과 next CTA 회귀 테스트 |

## 반응형·접근성

별도 clean-main archive에 이번 파일만 복사하고 빌드한 뒤 로컬 `3479` 포트에서 검증했다. 원본 dirty worktree의 코드나 환경변수 파일을 빌드에 섞지 않았다.

- 390×844와 1280×900, 각 54개 경로 / 총 108회 화면 검사.
- 직접 변경 화면, 공통 Learning/Portal 메뉴가 영향을 주는 화면, 계정 signed-out 경로, 주요 여정 및 business detail fallback 포함.
- 측정된 가로 넘침 0, 추가한 navigation CTA 가로 잘림 0.
- 모바일 관련 링크 영역과 BottomNav 간격, 키보드 focus-visible, 데스크톱 학습 메뉴를 스크린샷으로 확인.
- 추가 링크 최소 44px 터치 높이, nav 이름, h2, 학습 `aria-current`, 어종 accordion `aria-expanded` 적용.
- Header 6개, BottomNav 5개 진입점 유지. Navigation의 Header/BottomNav/chatbot 숨김 및 직선 방위≠안전항로 의미 유지.
- 실제 터치 장치·GPS, 새 authenticated Account 시각 검증은 이번 작업에서 수행하지 않았다.

## 검증 및 Git 범위

전용 테스트 14개: URL safety, entity 일치, dead saved fallback, Home Conditions FISH 링크, private activity routing, internal auth return, 학습 렌더링·license, 어종 검색, 시험 next CTA, 실제 route inventory, Home에서 활성 공개 그래프 도달성, source CTA 증빙.

최종 clean 검증 결과는 동반 JSON의 `verification`에 기록한다. 이전 dirty worktree의 테스트 총계를 가져오지 않는다. 기존 unrelated tracked/untracked 파일은 시작 시 SHA-256을 기록하고 종료 전에 다시 비교한다.

정확한 변경 목록만 stage하여 `feat(platform): complete public page connectivity`로 commit/push한다. 별도 chatbot·해양 layer·Supabase·보안 감사 등 기존 미커밋 산출물은 제외한다.

이번 작업의 새 데이터·새 엔진·Navigation core/AIS·Supabase mutation·Vercel env 변경·수동 Production deploy는 모두 0이다. 배포 후 실제 인증과 공급자 상태를 포함한 최종 운영 smoke는 후속 확인 사항이다.

## 최종 실행 결과

- targeted: 14 PASS
- clean full: 1,260 PASS / 1 SKIP / 실패 0 (총 1,261)
- typecheck / lint / build / diff: PASS
- build static pages: 1,467
- unrelated 1,881개 파일 SHA-256: 변경 0
- 이번 exact scope: 25개 파일

최종 빌드에서 yacht 학습 메뉴와 Account Saved의 내부 로그인 복귀 링크를 다시 확인했다. 새 파일은 docs/report, RelatedActions, LearningNavigation, content-links, 전용 테스트 6개이며, 기존 파일 변경은 19개다. 상세 whitelist는 보고서 preservation.files에 기록했다.
