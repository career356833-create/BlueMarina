# Blue Marina Production Release Final V1

검증 시각: 2026-10-03 16:30 KST

판정: **BLUE_MARINA_PRODUCTION_RELEASE_COMPLETE_WITH_LIMITATIONS**

## 배포

`main`과 `origin/main`은 `1a1a620bd689310908c887bbb3cb7c41f0c78a12`로 일치한다. 해당 커밋의 GitHub Vercel 성공 상태가 배포 `dpl_UxxqkCsKoH6LUevx9t5G1vYcvAbk`를 가리키고, Vercel에서 이 배포가 Production `READY`이며 `https://blue-marina.vercel.app`에 연결된 것을 확인했다. Git 연동이 이미 목표 SHA를 Production에 배포했으므로 추가 배포는 수행하지 않았다. 기존 dirty worktree를 배포 입력으로 사용하지 않았다. 직전 clean-main 재현성 기록의 전체 테스트·typecheck·lint·build·diff 검증을 확인했다.

## 핵심 사용자 흐름

`/`, `/today-sea`, `/sea`, `/sea/navigation`, `/fishing-spots`, 정상 상세 `/fishing-spots/rock-151`, `/fishing-spots/conditions`, `/fish`, `/license-guide` 모두 HTTP 200이다. 브라우저에서 Today Sea, Sea, Fishing Spot 상세, Conditions, Fish, Guide를 열었고 항법 화면에서 MapLibre 지도, HUD, 목적지 패널과 “직선 방위 참고 · 안전항로 아님” 안내를 확인했다. Fish 공개 목록은 336종으로 표시됐다.

Fishing Hero는 공식 포인트 원본의 `boat-27`, 원본 대상어 `감성돔`, 관측소 선택형 NIFS RISA 수온 문맥을 보여준다. 관측소 선택 시 실제 수온 응답이 표시됐고, 포인트 수온으로 추정하지 않는다는 안내도 있다. `/reservations`는 `Cache-Control: no-store, must-revalidate, max-age=0, private`를 반환한다.

## Account

기존 Kakao 인증 세션에서 계정 홈, 프로필, 저장한 콘텐츠가 로드됐다. 저장 페이지 새로고침 뒤에도 세션이 복원됐고, 로그아웃 후 비인증 안내가 표시됐다. 신규 Kakao 로그인은 사용자 인증 입력이 필요한 화면까지 확인했으며 완료 여부는 아직 검증 중이다. 프로필이나 저장 데이터를 변경하지 않았다.

## Charter · Market · Community

`/charters`, `/charters/partners`, `/charters/onboarding`, `/market`, `/market/new`, `/community`, `/community/new`는 HTTP 200이다. 공개 Charter offer, Market ACTIVE listing, Community published post는 각각 0건이다. 원격 DB에는 Charter `REVIEW_REQUIRED`, Market `SUBMITTED`, Community `SUBMITTED` QA 항목이 각각 1건 있으나 공개 목록에는 나타나지 않는다. 자동 게시도 관찰되지 않았다. 각 비공개 API는 무인증 요청에 401을 반환한다. 이번 release smoke에서 제출·승인·게시 등 쓰기 흐름은 실행하지 않았다.

## 모바일과 보안

390×844 Chromium 모바일 에뮬레이션에서 Home, Fishing Spots, Navigation, Charter, Market, Community, Account의 HTTP 200, 가로 넘침 0, 페이지 오류 0을 확인했다. 항법 지도 렌더링도 확인했다. 실기기 GPS와 핀치 제스처는 이번 검증에 포함되지 않는다.

Production 응답에 CSP, `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`가 있다. CSP에 `unsafe-eval` 허용은 없다. Account·Charter·Market·Community·Operations 비공개 API는 무인증 요청을 401로 차단하고 no-store/noindex를 반환한다. 관련 15개 공개 스키마 테이블의 RLS가 켜져 있다. 홈 HTML에 service-role 환경변수명은 노출되지 않았다. 다른 사용자 토큰을 이용한 RLS 교차 접근 E2E는 반복하지 않았다.

## 제한과 Git 상태

신규 Kakao 재로그인은 사용자 인증 완료가 필요하다. 비즈니스 도메인의 인증된 쓰기 흐름, 실기기 조작, 교차 사용자 RLS E2E는 이 읽기 중심 최종 smoke에서 재실행하지 않았다. 현재 관찰된 P0/P1은 없다. 코드 커밋·추가 배포·Supabase 변경은 0이다. 기존 unrelated worktree 변경은 그대로 보존한다.
