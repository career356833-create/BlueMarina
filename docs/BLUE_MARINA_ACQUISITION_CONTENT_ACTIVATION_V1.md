# Blue Marina Acquisition & Content Activation V1

판정: **ACQUISITION_CONTENT_ACTIVATION_READY_WITH_LIMITATIONS**

기준 main/Production: `0899f1b3c552d68ce5e78c9a61a2477d771492b8`. 증빙일 2026-10-05. 새 데이터·광고·자동 공개 없이 기존 로그인/저장/제출/검토 기능의 연결과 읽기 전용 지표를 보완했다.

## 진입면 감사

| 경로 | 이전 | 이후 | 다음 행동 |
|---|---|---|---|
| / | GOOD | GOOD | 기존 영상과 6 primary / 2 secondary 유지. 포인트 저장·업체 등록·판매글 문구만 구체화. |
| /fishing-spots | FRICTION | GOOD | 실제 포인트 → 상세 → 저장 로그인 복귀 / 해당 포인트 경험 공유. |
| /fish | FRICTION | FRICTION | 336 legacy 도감에는 canonical ID가 없어 이름 매핑 금지. 글쓰기는 직접 관련 어종 선택; Conditions 38종에는 exact ID CTA. |
| /today-sea | GOOD | GOOD | 관측 정보 읽기 → 기존 바다 지도·Conditions. 가입을 강제하지 않음. |
| /charters | FRICTION | GOOD | 0개 공개 상태, 출조상품 등록·업체 안내를 함께 노출. |
| /charters/partners | MISALIGNED | GOOD | 접수 활성화 이전 문구 제거. 로그인 후 onboarding, 기존 전화/예약 링크, 수동 게시 절차 안내. |
| /market | FRICTION | GOOD | 검색 결과 0건 → 첫 판매글 등록 → 정확한 로그인 복귀. |
| /community | FRICTION | GOOD | 검색 결과 0건 → 첫 글 작성. 조회 실패를 빈 콘텐츠로 표시하지 않음. |
| /license-guide | GOOD | GOOD | 기존 면허 안내·학습 다음 행동 유지. 가입/판매 강제 없음. |

## 사용자 흐름과 구현

- 일반 낚시 사용자: 공개 포인트/도감 탐색 → 원본 저장 → 경험·질문 작성. 로그인만 한 사용자는 활성으로 계산하지 않는다.
- 업체: Charter/Partners → 로그인 → 기존 onboarding → 기존 검토 이력/owner 상태. 전화·공식 예약 링크를 제출하며 자동 게시는 없다.
- 판매자: Market → 로그인 → 기존 판매글 작성 → 검토 → ACTIVE일 때 공개 상세. 빈 목록에는 첫 판매글 등록을 제공한다.
- Home 영상/레이아웃/primary 6·secondary 2 유지. 설명 문구만 최소 변경했다.
- ParticipationLink는 Auth getUser로 사용자 유효성을 확인한 뒤 보호 목적지 또는 login?returnTo로 이동한다. JS가 없으면 로그인 링크가 남는다. 만료·취소·QA 계정 정지 후 남은 캐시 세션만으로 작성 화면으로 보내지 않는다. 검증된 사용자/만료/네트워크 오류 분기를 runtime test로 확인했다.
- Saved 비로그인 버튼이 안내 문구만 바꾸던 동작을 실제 로그인 이동으로 고쳤다. 원본 복귀 후 사용자가 다시 저장해야 한다. 자동 저장하지 않는다.
- Account에는 포인트 저장·Community·Market 다음 행동을 추가했다. 기존 Saved 원본 링크의 entity ID 검증을 유지했다.
- Spot의 exact ID, Conditions의 기존 canonical ID만 Community로 전달한다. destination의 기존 catalog에서 재검증하며 배열/알 수 없는 ID는 무시한다. legacy /fish 이름을 canonical로 추론하지 않는다.
- Community source 실패는 기존 error boundary로 전달한다. 성공적으로 조회한 검색 결과가 비었을 때만 0건 안내를 사용한다. Market은 기존 실패 경로를 유지한다.

## 측정과 운영

새 analytics vendor/event table은 만들지 않았다. Operations health의 기존 권한 검사·private/no-store·60초 캐시 안에 acquisition 집계를 추가했다. public UI에 사용자나 집계 원본을 노출하지 않는다. 서버 쿼리는 기존 컬렉션을 최대 3개씩 읽으며 상한/실패는 UNKNOWN이다.

`src/lib/acquisition/contract.ts`의 event 이름은 **측정 계약**이다. landing/login/start 이벤트는 UNOBSERVED이며 수집하고 있다고 주장하지 않는다. 제출 완료는 보존된 non-DRAFT 행, 승인은 기존 review history의 distinct target, publication은 현재 공개 stock이다. COMMENT/REPORT 승인 이벤트를 POST 승인으로 잘못 합산하지 않는다.

첫 행동은 현재 남아 있는 saved/submission의 고유 owner 수다. deleted save나 삭제된 제출물을 복원할 수 없어 lifetime activation이 아니다. QA identity/record marker, admin, unclassified를 Real에서 제외한다. 같은 일반 owner가 QA 표시 행과 실제 행을 모두 가졌다면 실제 행을 우선하여 한 번만 센다. 로그인→첫 참여율은 UNKNOWN, 분모 0·상한/실패도 UNKNOWN이다. 승인→공개 수치는 현재 보유 상태 비율이며 cohort conversion이 아니다.

현재 실제값·제안 목표·집계 정의는 [KPI 문서](BLUE_MARINA_POST_LAUNCH_KPI_V1.md)에 분리했다. 기존 pending age/NEEDS ATTENTION과 moderation 링크를 함께 사용한다. 새 알림/자동복구/권한은 추가하지 않았다.

## Attribution

UTM source/medium/campaign은 작은 고정 allowlist, referrer는 알려진 host의 coarse source로 정규화하는 설계만 제공했다. 알 수 없는 값은 UNKNOWN. URL/path/query/fragment/credentials/개인 문자열은 남기지 않는다. **이번 V1은 이를 수집·저장·전송하지 않으며 submission 연결도 아직 없다.** 채널별 광고 효율은 계산하지 않는다.

## 공개 loop 경계

- Market/Community: 기존 서버 검토 → 승인 상태 → 공개 reader → owner 상태를 유지. QA 공개 0, 자동 승인/공개 0. 기존 서비스/권한/이미지 정책 테스트 통과. 이번 작업에서 새 remote submission/moderation은 실행하지 않았다.
- Charter: 승인 → publication candidate까지 기존 backend. 공급자 동의/출처를 검증한 후 별도 검토된 registry release가 있어야 공개 상세가 생긴다. 승인 건수를 공개 건수로 치환하지 않았다. 자동화된 end-to-end publication이 완성됐다고 주장하지 않는다.

## 검증과 SEO

별도 git archive(main)+정확한 26개 코드/테스트 파일 복사본으로 검증했다. 기존 dirty worktree의 파일은 포함하지 않았다. 문서 3개를 더해 최종 commit scope 29개다.

- targeted 16 PASS; clean full 1,294 PASS / 1 SKIP. typecheck/lint/build/diff 모두 PASS; static pages 1,467.
- 390×844/1280×900: 9개 진입면, 포인트 상세/글쓰기 문맥, 보호 CTA, 가로 overflow 0. Charter/Market/Community CTA 클릭 후 정확한 returnTo를 관측했다.
- 로컬 clean build에는 Production auth env를 넣지 않았다. 카카오 버튼의 준비 중 표시는 이 로컬 환경의 제한이다. 새 OAuth 완료/로그인 후 작성·관리자 화면을 이번 턴의 실검증 PASS로 기록하지 않는다.
- Production baseline 9개 공개 경로 HTTP 200, production canonical 일치. Account/Charter private/Operations API 무인증 401. Market/Community 공개 GET은 정상 200이며 private 접근 PASS로 오인하지 않는다. CSP unsafe-eval 차단 유지.
- metadata는 실제 정보·검토된 콘텐츠 설명이며 가짜 후기/인기/매물 schema를 추가하지 않았다. private compose/admin noindex 유지.
- 원격은 read-only aggregate 확인만 수행했다. DB/Auth/Storage/env 변경·새 QA/실제 사용자 생성·광고·업체 연락 모두 0.

## 남은 제한

1. Fresh Kakao authentication, authenticated owner submission and authenticated operations browser E2E were not replayed in this task. Local UI checked CTA-to-login paths; existing callback/ownership/moderation tests passed.
2. No landing/login/start event store exists. Those stages and conversion rates are UNKNOWN. Attribution is an allowlisted design contract only; no collection, persistence or transmission.
3. First actions are unique owners of retained saves/non-DRAFT submissions, not lifetime event analytics. Deleted saves cannot be reconstructed. Current public stock is not a publication event count or cohort rate.
4. Charter approval creates a candidate. Verified provider consent and a separate reviewed registry release are still required before public detail publication; no automated activation was added.
5. Legacy /fish guide IDs are not canonical IDs. No name inference; manually select a related species. Exact species context is supported by the existing 38-species Conditions catalog.
6. Operations reads are capped below 1000 rows per collection and use existing 60-second cache. Failed/capped reads and unknown owners yield UNKNOWN. Storage count may remain unavailable under existing schema exposure policy.
7. Physical GPS/PWA/gesture and paid advertising are outside this task.

## 다음 우선순위

**실제 소규모 유입 실험** 하나를 선정한다. 시작 전 새 Kakao→첫 제출 QA를 통과하고, 첫 Real 제출/검토/공개를 관측한다. 캠페인별 전환율은 수집 근거가 생기기 전 보고하지 않는다. 이번 작업에서 광고는 실행하지 않았다.
