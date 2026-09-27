# Blue Marina Current State Master Audit V2

**관측일: 2026-09-27. 판정: `PRODUCTION_INFORMATIONAL_CORE_ACTIVE_BUSINESS_BACKENDS_BLOCKED`.** [Production](https://blue-marina.vercel.app)은 현재 `main`과 같은 SHA로 READY이며 정보 탐색 핵심은 실제로 작동한다. Charter·Market·Community의 공개 화면은 있으나 공급과 지속 저장 기반이 없어 거래·활동 서비스로 운영 중이라고 볼 수 없다. 이 문서는 [기계 보고서](../reports/platform/blue-marina-current-state-master-audit-v2.json)의 핵심 판정과 한계를 설명한다.

## 증거 기준과 Git/배포

우선순위는 **Production HTTP/API·실제 브라우저 렌더 → Vercel 배포/환경변수 메타데이터 → main source/빌드 → 날짜가 있는 과거 보고서**다. 단발 요청은 현재 시점의 관측이지 SLA가 아니다. Vercel 커넥터는 팀 scope 403이어서 인증된 로컬 Vercel CLI로 배포·환경변수 **이름만** 확인했다. Supabase Production URL·키가 Vercel 환경에 없어 원격 프로젝트를 특정하지 못했고, 어느 원격 DB에도 연결하거나 쿼리하지 않았다.

- Git: `main` HEAD = `origin/main` = `98b53d2ac41dd46dfc1f3ee7c05b344917143d49`, ahead/behind 0/0.
- Production: 배포 `dpl_BMeZiZsMCtSQD3eLAY2TXwVEZeJa`, 생성 2026-09-27 01:16:55 UTC, READY. Vercel deployment list의 Git SHA도 같은 `98b53d2ac41dd46dfc1f3ee7c05b344917143d49`; 뒤처진 commit 0.
- 감사 시작 시 staged 0, tracked modified 6, untracked **1,546개 파일**(`git status --porcelain=v1 -uall`). `.next-stale-20260825-1` 510, `data` 577, `tools` 147, `reports` 132, `docs` 119가 큰 묶음이다. MBRIS 연구, 데이터, 로그, 실험, 오래된 build가 main 밖에 남아 있다. 이를 삭제·stage하지 않는다.
- 현재 특정 Preview-only **기능 변경**은 확인되지 않았다. Preview에는 KMA 관측·특보 환경변수 이름이 있지만 이번 감사에서 Preview 동작을 재검증하지 않았다.

## 기능별 Production 판정

| 기능 | 상태 | 실사용 판단 |
| --- | --- | --- |
| HOME | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | MarineVideoHero and 6+2 links live; account-backed personalization unavailable. |
| TODAY_SEA | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | RISA live; KMA and KHOA card sources disabled or keyless. |
| SEA_MAP | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | Kakao map tiles and markers rendered in browser; live layers limited. |
| NAVIGATION | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | MapLibre and HUD rendered; physical GPS/PWA unverified; straight-line only. |
| FISHING_SPOTS | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | 1405 source-backed spots; invalid ID 404; four navigation holds. |
| CONDITIONS | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | 38 factual profiles and static read model live; RISA live, FEMO disabled. |
| FISH | `PRODUCTION_ACTIVE_WITH_LIMITATIONS` | Public guide has 336 items, separate from 1258 canonical inventory. |
| CHARTER | `BLOCKED` | Consumer shell is public but zero offers; supply backend/auth absent in Production. |
| MARKET | `BLOCKED` | Public shell and form exist, zero listings; backend/storage absent. |
| COMMUNITY | `BLOCKED` | Public shell and device-local posting preview only; no server posts. |
| GUIDE | `PRODUCTION_ACTIVE` | Public guide and legacy learning routes respond 200. |
| ACCOUNT | `BLOCKED` | Pages are deployed but Production Auth/backend env absent; API 503. |
| OPERATIONS | `BLOCKED` | Main and Production contain route and health API; unauthenticated page 404 and API 401; no authenticated QA. |

`BLOCKED`는 화면이 HTTP 200으로 열리지 않는다는 뜻이 아니다. 사용자가 기대하는 데이터·저장·인증·문의 흐름이 아직 성립하지 않는다는 뜻이다.

## 경로 전수 확인

아래 36개는 모두 main의 `src/app` page와 이번 dirty-worktree build의 `.next/server/app-paths-manifest.json`에 있다. Production은 표의 샘플 URL로 확인했다. `[id]`의 200은 **없는 ID 샘플**이다. Fishing Spot 정상 `boat-60`은 200, 없는 ID는 404·noindex였다. Charter/Market/Community 없는 ID는 200·noindex fallback으로 남아 있다.

| 경로 | Source/Build | Production HTTP | noindex | 실제 제약 |
| --- | --- | ---: | :---: | --- |
| `/` | Y/Y | 200 | N | YES |
| `/today-sea` | Y/Y | 200 | N | YES |
| `/sea` | Y/Y | 200 | N | YES |
| `/sea/navigation` | Y/Y | 200 | N | YES |
| `/fishing-spots` | Y/Y | 200 | N | YES |
| `/fishing-spots/[id]` | Y/Y | 200 (sample) | N | YES |
| `/fishing-spots/conditions` | Y/Y | 200 | N | YES |
| `/fish` | Y/Y | 200 | N | YES |
| `/charters` | Y/Y | 200 | N | ZERO_PUBLIC_OFFERS |
| `/charters/[id]` | Y/Y | 200 (sample) | Y | ZERO_PUBLIC_OFFERS |
| `/charters/onboarding` | Y/Y | 200 | Y | ZERO_PUBLIC_OFFERS |
| `/charters/partners` | Y/Y | 200 | N | ZERO_PUBLIC_OFFERS |
| `/reservations` | Y/Y | 200 | Y | YES |
| `/market` | Y/Y | 200 | N | ZERO_PUBLIC_LISTINGS |
| `/market/[id]` | Y/Y | 200 (sample) | Y | ZERO_PUBLIC_LISTINGS |
| `/market/new` | Y/Y | 200 | Y | ZERO_PUBLIC_LISTINGS |
| `/community` | Y/Y | 200 | N | ZERO_PUBLIC_POSTS |
| `/community/[id]` | Y/Y | 200 (sample) | Y | ZERO_PUBLIC_POSTS |
| `/community/new` | Y/Y | 200 | Y | ZERO_PUBLIC_POSTS |
| `/license-guide` | Y/Y | 200 | N | YES |
| `/account` | Y/Y | 200 | Y | AUTH_UNAVAILABLE |
| `/account/profile` | Y/Y | 200 | Y | AUTH_UNAVAILABLE |
| `/account/saved` | Y/Y | 200 | Y | AUTH_UNAVAILABLE |
| `/account/activity` | Y/Y | 200 | Y | AUTH_UNAVAILABLE |
| `/account/login` | Y/Y | 200 | Y | AUTH_UNAVAILABLE |
| `/admin/operations` | Y/Y | 404 | Y | DENIED_UNAUTHENTICATED |
| `/study` | Y/Y | 200 | N | YES |
| `/theory` | Y/Y | 200 | N | YES |
| `/exam` | Y/Y | 200 | N | YES |
| `/random` | Y/Y | 200 | N | YES |
| `/wrong` | Y/Y | 200 | N | YES |
| `/progress` | Y/Y | 200 | N | YES |
| `/analysis` | Y/Y | 200 | N | YES |
| `/practice` | Y/Y | 200 | N | YES |
| `/practice/videos` | Y/Y | 200 | N | YES |
| `/past` | Y/Y | 200 | N | YES |

Home은 `MarineVideoHero`, primary 6, secondary 2와 작은 개인화 영역이 있다. 비로그인 사용자는 브랜드 진입 중심이고 계정 기반 saved/activity는 인증 환경이 없어 실사용 불가다. `/fish`의 **공개 도감은 336개**이며 1,258개 canonical 조사 인벤토리와 동일한 공개 상품으로 해석하지 않는다.

## 낚시 포인트·Conditions·항법

`src/data/fishing-spots.json`을 직접 집계하면 **1,405개 = 선상 329 + 갯바위 1,076**이다. 좌표 lineage의 과거 검증은 confirmed 979, partial 426, mismatch 0이다. `boat-60/128/129/321` 4곳은 navigation hold이며 지도 표시 차단 2·경고 2다. 상세→Conditions→Sea→Navigation의 spotId 흐름은 main에 있고 정상/없는 ID HTTP 동작을 확인했다. hold를 안전 항로 승인으로 해석하지 않는다.

Conditions profile 파일은 **38개 = READY 5 / PARTIAL 3 / LIMITED 30**. Production read-model POST는 200, `profileContext`와 source 상태를 반환했다. RISA API는 200이고 FEMO는 503 `SOURCE_DISABLED`이다. 정적 프로필과 선택된 관측 사실을 보여주며 자동 적합 판정·점수·순위·확률·nearest-station 추정은 하지 않는다. 과거 comparator 파일이 저장소에 남아 있어도 현재 38종 read-model UI의 자동 비교 흐름으로 보지 않는다.

브라우저에서 Production Kakao 지도 타일·마커와 MapLibre 항법 지도·HUD가 실제로 렌더된 것을 확인했다. 항법 화면에는 heading/bearing/직선 거리, waypoint/track/simulation 관련 UI가 있으나 GPS를 켜지 않은 관측이라 실제 값과 이동 정확도는 확인하지 않았다. 직선 방위는 안전항로·육지/암초/수심 회피가 아니다. 실기기 GPS 권한, heading/speed, 화면 잠금·복귀, 설치형 PWA는 **미검증**이다. 모바일 HUD 겹침 수정은 main/Production에 있으나 이번 감사에서 물리 기기로 재확인하지 않았다.

## 외부 데이터 소스의 현재 상태

| 소스 | Production | 환경/키 | 현재 근거와 한계 |
| --- | --- | --- | --- |
| KAKAO | ACTIVE | public app key present | Browser map tiles and markers rendered; known historical blocked legacy eval; no unsafe-eval CSP |
| MAPLIBRE_BASE | ACTIVE | no project key required | Browser navigation map rendered with KHOA/OSM attribution; reference only |
| RISA | ACTIVE_WITH_LIMITATIONS | flag and key present | 200; 41 returned stations, 65 observation rows, 39 fresh and 2 unavailable stations; oldest row 2026-04-16 |
| FEMO | DISABLED | flag and key absent | 503 SOURCE_DISABLED |
| KMA_OBSERVATION | DISABLED | flag and key absent Production | 503 SOURCE_DISABLED; preview env names present only |
| KMA_WARNING | DISABLED | flag and key absent Production | 503 SOURCE_DISABLED; preview env names present only |
| KMA_FORECAST | HOLD | API key absent | 503 API_KEY_MISSING with valid zone query |
| KHOA_TIDE | HOLD | API key absent | 503 API_KEY_MISSING with station/date query |
| KHOA_NAV_WARNING | DISABLED | flag and key absent | 503 SOURCE_DISABLED |
| KHOA_NAV_AIDS | HOLD | credential absent | 503 SOURCE_CREDENTIAL_REQUIRED |
| KHOA_ROMS | DISABLED | flag and key absent | 503 FEATURE_DISABLED |

RISA의 이번 HTTP 관측: 반환 관측소 **41**, 관측 row **65**, station freshness 분포 fresh 39 / unavailable 2, newest source-local timestamp `2026-09-27 10:00`, oldest `2026-04-16 10:30`. 응답 전체 freshness는 `fresh`였지만 **모든 관측소가 최신이라는 뜻은 아니다.** 소스 시간대는 NIFS가 명시하지 않았다. quota 상태와 인스턴스 간 in-flight dedupe는 미확인이다.

Production 환경변수 이름은 RISA flag/key, `NEXT_PUBLIC_SITE_URL`, Kakao public key 네 종류만 있었다. flag 값은 출력하지 않았으나 RISA API 200으로 ON을 확인했다. FEMO, KMA, KHOA, Charter, Market, Account, Supabase Auth/Service, Operations Auth 관련 이름은 보이지 않았다. KMA forecast와 KHOA tide는 위치·관측소를 넣어 재요청한 결과 `API_KEY_MISSING` 503이었다. KMA 관측/특보와 KHOA 항행경보는 `SOURCE_DISABLED` 503이었다.

## 데이터·백엔드·사업 성과

| 영역 | main 구현 | Production 공개 상태 | 실제 성과/검증 |
| --- | --- | --- | --- |
| Charter | 소비자 목록·상세·문의, onboarding/CSV, 공급 intake API·관리 검토, migration | 상품 **0**, 공급 API 무인증 401, Production flag/Auth 설정 없음 | 연구 Pilot 5업체·12상품과 Sprint 영업 대상 20곳. **연락 0, 응답 0, 제출 0, 승인 0, 게시 0**. 공개 정보 재사용 허가 YES 0 / NO 0 / PENDING 20 |
| Market | 목록·상세·판매글, moderation·image staging 계약, migration | 공개 API `listings: []`, 공개 listing **0**, backend/upload flag 없음 | 실제 판매자/비공개 초안 수는 DB 접근 불가로 **UNKNOWN** |
| Community | 목록·상세·작성, 로컬 댓글·반응·신고 준비 | 공개 post **0**, 지속 서버 backend 없음 | 실제 사용자 수 **UNKNOWN**, 기기 localStorage 작성물은 공개 운영 실적이 아님 |
| Account | profile/saved/activity/recent, Auth 연동 코드와 migration | 페이지 200·noindex이나 API **503**, Auth env 없음 | 로그인 가능한 Production 계정/활성 사용자 수 **UNKNOWN**, 인증 E2E 미실행 |
| Operations | `/admin/operations`, read-only health API | 무인증 페이지 **404**, health **401**·noindex | Auth 설정 없음, `operations_admin` 존재 **UNKNOWN**, 인증된 390/1280 QA 미실행 |

로컬 `supabase/migrations`의 root SQL은 4개이고 Charter·Market·Account migration 파일이 각각 있다. **remote applied 여부는 세 도메인 모두 UNKNOWN**이다. Production Supabase 프로젝트 식별자가 없어서 원격 스키마와 비교하지 못했다. 이전 rehearsal의 “apply 0”은 당시 작업 결과이지 현재 원격 상태의 증거가 아니다. 이번 감사에서 DB apply 0이다.

## 보안·SEO·PWA·QA

Production 응답에서 CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options가 확인됐다. CSP에는 `unsafe-eval`이 없다. Kakao legacy eval violation 1건은 **과거 감사의 차단된 동작**이며 이번 브라우저에서 로그 개수를 재측정한 것은 아니다. 이번 지도 샘플에서는 실제 기능 차단을 보지 않았다. `robots.txt` 200, sitemap **1,424 URL**, root canonical은 Production URL이다. private/admin/API의 noindex 정책은 샘플로 확인했다. `/sw.js`와 실제 manifest 경로 `/manifest.json`은 200이다. SW 파일 접근과 실제 스마트폰 설치/오프라인 복구는 다른 검증이다.

이번 브라우저 QA는 Production의 Sea Map·Navigation 렌더만 다시 확인했다. 과거 360/390/430px Chromium viewport 결과는 **브라우저 에뮬레이션**이며 실기기 GPS/PWA PASS가 아니다. 계정/관리자 인증 QA, 실제 예약/게시/결제 E2E도 없다.

## 사용자·매출 관점과 현재 장애

지금 사용자는 1,405개 포인트를 탐색하고, 38종 Conditions 근거와 선택된 RISA 관측을 읽고, 지도·직선 항법 보조와 336개 공개 어종 도감·면허 가이드를 사용할 수 있다. Charter/Market/Community에서는 화면과 로컬 작성 준비를 볼 수 있지만 **검증된 출조상품 예약·실제 중고거래·공개 커뮤니티 참여는 아직 할 수 없다.** 확인된 상업 거래는 0이고, 비공개 사용자 수·매출은 관측할 수 없어 0이라고 단정하지 않는다. Charter는 `TECH_READY_SUPPLY_NOT_ACQUIRED`, Market도 `TECH_READY_SUPPLY_NOT_ACQUIRED`다.

- **P0: 0.**
- **P1:** Charter 공급자 승인·출조상품/문의 실적 부재; Charter 원격 DB/Auth E2E 불가; 물리 GPS/PWA 안전성 검증 부재.
- **P2:** Market/Account 서버 비활성, KMA/KHOA 소스 미활성, Operations 인증 모니터링 불가, Charter 2곳 연락 전 재확인 필요.
- **P3:** Charter/Market/Community 없는 상세의 HTTP 200+noindex fallback; Kakao legacy eval 차단 로그(과거).
- **INFO:** Fish alias 예외 1, RISA quota·cross-instance dedupe 미검증.

현재는 새 외부 소스를 더 조사하거나 canonical 예외 하나를 더 파는 일, 마켓/커뮤니티 빈 UI를 더 꾸미는 일, 실기기 증거 없이 HUD를 세밀하게 다듬는 일보다 **첫 검증 Charter 공급과 문의 전환**이 낫다. 기술 준비와 20곳 명단이 이미 있으나 실제 연락 0이므로 다음 병목은 공급자 동의와 운영 검증이다. 단 하나의 우선순위는 [Next Priority Roadmap V2](BLUE_MARINA_NEXT_PRIORITY_ROADMAP_V2.md)의 **VERIFIED_CHARTER_SUPPLY_AND_INQUIRY_LAUNCH**다.

감사 테스트 8/8, 전체 1,264/1,264, typecheck·lint·build(정적 페이지 1,465/1,465)·diff check가 통과했다. 이는 기존 미커밋 파일이 많은 현재 작업 트리 기준이며 별도 clean checkout에서 재현한 결과는 아니다. 이번 감사는 새 기능 0, Production deploy 0, DB apply 0, 업체 연락 0, stage/commit/push 0으로 종료한다.
