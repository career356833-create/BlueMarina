# Blue Marina Release Readiness Final V1

**판정: `BLUE_MARINA_RELEASE_READY_WITH_LIMITATIONS`**
기준일: 2026-10-03 KST. 공개 정보 서비스와 Kakao Account, Charter·Market·Community의 제출 및 검토 대기 흐름은 Production에서 동작한다. 공개 승인된 출조상품·판매글·커뮤니티 글은 아직 각각 0건이다. 이 판정은 상품 공급이나 거래·예약의 완성을 뜻하지 않는다.

## 배포와 범위

| 항목 | 확인 결과 |
| --- | --- |
| `main` / `origin/main` | `bf925245f32390dc9033c2c1d56df5010d91a987` 일치 |
| Production | `https://blue-marina.vercel.app`, deployment `dpl_4TVr99veNyp5wJS6eaRgvKZQH1uT` READY, 빌드 Git SHA 동일 |
| Supabase | 기존 프로젝트 `mlfvpaikfpjrgrhwlrjn`, 읽기 전용 감사 |
| 검증한 대표 Production route | 21개 HTTP 200. Home, Today Sea, Sea, Fishing Spots·detail·Conditions, Fish, Guide, Navigation, Charter, Market, Community, Account 포함 |
| 공개 SEO | robots/sitemap HTTP 200, sitemap 1,424 URL, 홈 canonical 정상 |

현재 공개 핵심은 해양·낚시 정보, 1,405 Fishing Spots, 336개 공개 Fish guide, 38개 사실 기반 Condition profile, Guide/Learning이다. 정규화 Fish canonical 1,258건은 공개 guide 건수와 다른 재고다. RISA Conditions API는 HTTP 200으로 확인됐다. Navigation은 직선 방위와 거리를 보여주는 **항법 보조**이며 안전항로, 충돌 회피, AIS 또는 공식 항법장비 대체를 주장하지 않는다. AIS 및 해양 snapshot 개선은 출시 후 범위다.

## 사용자 여정

| 영역 | 현재 증거 | 제한 |
| --- | --- | --- |
| Account | 현재 Production Kakao 세션 복원, 저장 항목 생성→목록/새로고침→삭제를 브라우저에서 통과. 이전 Production E2E에서 프로필 GET/UPDATE 지속성 및 로그아웃·재로그인 통과 | 두 번째 사용자 계정으로 교차 접근 E2E 미실행 |
| Charter | 공개 `/charters`, 파트너 안내, onboarding 표시. 기존 Production E2E에서 본인 제출·재방문·`REVIEW_REQUIRED`, 일반 사용자 admin 거부 확인 | 승인 관리자 성공 E2E와 실제 공급자 승인 미실행. 공개 출조 0 |
| Market | 공개 목록과 등록 화면 정상. 기존 Production E2E에서 제출·본인 재방문/수정, 비공개 signed image upload, 검토 대기 및 일반 사용자 admin 거부 확인 | 승인 관리자 성공 E2E 미실행. ACTIVE 공개 판매글 0 |
| Community | 공개 피드와 작성 화면 정상. 기존 Production E2E에서 게시글·댓글·반응 저장 및 재방문 확인 | 운영자 승인 성공 E2E 미실행. 승인 공개 글 0 |

Charter·Market·Community의 공개 목록은 모두 정직한 빈 상태를 표시하며, QA 기록을 가짜 공급으로 노출하지 않는다. Kakao는 실제 기본 로그인이다. Google/이메일 로그인의 확대 여부는 이 판정의 필수 조건으로 보지 않았다. Auth return path는 코드에서 내부 경로 allowlist를 사용하며 외부 URL을 거부한다. Production feature flag 5개의 **이름**은 Vercel 환경에 존재한다. CLI가 값을 직접 공개하지 않아 `ACCOUNT_BACKEND_ENABLED`, `CHARTER_SUPPLY_INTAKE_ENABLED`, `MARKET_BACKEND_ENABLED`, `MARKET_IMAGE_UPLOAD_ENABLED`, `COMMUNITY_BACKEND_ENABLED`는 이전 E2E와 현재 기능으로 유효 ON을 추론했으며 값을 직접 읽었다고 주장하지 않는다.

## 데이터와 보안

원격 읽기 전용 집계: `fish_species` 1,258, `marine_organisms` 3,016, `auth.users` 3, `profiles` 3, 감사 종료 후 `user_saved_items` 0. Auth 사용자 3명을 실고객 KPI로 간주하지 않는다. Charter 제출 1, Market 판매글 1과 staging 이미지 1, Community 글·댓글·반응 각 1은 QA 기록이다. Charter promotion candidate 0, Market ACTIVE 0, Community 공개 승인 글 0. 모든 QA 콘텐츠는 비공개이며 실제 공급·참여 KPI에서 제외한다.

확인한 비즈니스 테이블 8개는 RLS가 켜져 있다. 점검한 anon/authenticated/service_role의 의도치 않은 `TRUNCATE` 권한은 0이다. 익명 Account·Charter 제출·Community 내 글 API는 401, 공개 Market 목록 API는 200이다. 확인한 API 모두 `no-store`와 `X-Robots-Tag: noindex,nofollow`를 보냈고, Account·Community 내 글 응답은 `private`도 지정했다. `/admin/operations` 비인증 요청은 404와 noindex다. Production에는 CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options가 있으며 `unsafe-eval`은 허용하지 않는다. 브라우저에 service-role 키 노출은 관측되지 않았다. Security Advisor의 CRITICAL/HIGH는 0이다. 이전부터 있던 INFO/WARN 항목은 별도 운영 정리 대상이다.

기존 fish 저장소 3개와 `market-listing-staging`은 모두 private이다. Market bucket은 8 MiB, JPEG/PNG/WebP 제한이다. 이미지 업로드는 서버가 소유자/판매글을 확인하고 signed intent를 발급하며, 객체 경로는 판매자/판매글 단위로 나뉜다. 무제한 공개 업로드는 확인되지 않았다.

## 화면·검색·오류

390×844에서 주요 15 route, 1280×900에서 같은 15 route, 1440×900에서 3 route를 점검했다. 관측한 가로 overflow·중대한 responsive 파손·주요 console error는 0이다. Header, BottomNav와 주요 작성 화면을 확인했으나 키보드·모달 상호작용은 전수 검증하지 않았다. UI migration map은 총 63 template 중 migrated 38, shared shell 6, 의도적 immersive 3, admin/private 16, 공개 미이관 0이다. 실제 스마트폰의 GPS/PWA는 아직 검증되지 않았다.

주요 Home 내부 링크의 대상 route는 HTTP 200이었다. `/fishing-spots/does-not-exist`는 HTTP 404와 noindex이며, 비공개·작성·관리 route는 noindex 처리된다. 없는 Charter/Market/Community detail은 HTTP 200+noindex로 남아 있어 P3 의미론 제한이다. 초기 로딩 표시 후 Charter·Market·Community 피드가 정상 빈 상태로 전환됐고, 끝없는 로딩이나 대량 오류는 관측하지 않았다.

## 출시 장애 등급

| 등급 | 결과 |
| --- | --- |
| P0 | 0. 전체 장애, 데이터 손상, 공개 QA 데이터 유출 관측 없음 |
| P1 | 0. 확인된 핵심 공개·인증·제출 여정 실패 없음 |
| P2 | 실제 승인 공급/게시물 0; 승인 관리자 성공 및 두 번째 사용자 RLS E2E 미실행; 실기기 GPS/PWA와 키보드·모달 전수 QA 미실행; 로컬 임시 비밀파일 2개 수동 삭제 필요 |
| P3 | 없는 일부 business detail의 200+noindex; 일부 외부 해양 소스와 Navigation snapshot 제약; feature flag 실제 문자열 미열람 |

임시 비밀파일은 저장소 밖 아래 두 경로에 **남아 있다**. 내용은 읽거나 출력하지 않았다. 정확한 파일 두 개만 제거하려는 시도가 자동 승인 검토에서 `blocked by policy`로 거부되었다. 사용자가 직접 파일 두 개를 삭제하고 존재 여부를 재확인해야 한다. 이 문제는 Production 노출 증거가 없는 로컬 정리 과제이나, 방치하면 안 된다.

- `C:\Users\USER\AppData\Local\BlueMarinaCommunityV1\build-20261002-150025\checkout\.env.local`
- `C:\Users\USER\AppData\Local\BlueMarinaCommunityV1\build-clean-20261002-150233\checkout\.env.local`

## 검증과 Git

`npm test`: 1,341 PASS / 1 SKIP / 0 FAIL. `npm run typecheck`, `npm run lint`, 별도 깨끗한 committed HEAD 스냅샷의 `npm run build`, `git diff --check` 통과. 빌드에는 Supabase SSR의 Edge Runtime `process.version` 경고가 있었으나 빌드는 성공했으며 이번 브라우저 검사에서 대응되는 실행 오류는 없었다. 현재 작업 디렉터리에는 기존 unrelated 변경 394개 상태 항목이 있으며 보존했다. 이번 감사는 report/docs만 생성했고 Git stage·commit·push는 각각 0이다. Production 배포 및 원격 DB 변경도 0이다.

출시 후 상위 5개는 [Post-launch backlog](BLUE_MARINA_POST_LAUNCH_BACKLOG_V1.md)에 분리했다.
