# Blue Marina UI 최종 시각 수용검사 V1

2026-11-09. 운영 기준은 `80237a9`, 이전 UI 감사는 `6d8f200`이다. V5 공개 화면의 수정분을 Windows Chrome에서 검수했다. 기존 [64개 화면 감사](BLUE_MARINA_PLATFORM_WIDE_UI_ENGINE_AUDIT_V1.md)의 목록과 판정 기준을 사용했다.

## 출시 판단

**PLATFORM_UI_RELEASE_BLOCKED.** 공개 화면의 레이아웃 수정과 왕복 이동은 수용 가능하다. 최종 Preview의 바다 지도 SDK가 해당 도메인에서 HTTP 401을 반환해 운영 승격을 보류한다. 동일 후보와 키로 HTTPS 로컬에서 실지도를 확인했다. 다음 단계는 해당 Preview 도메인에 대한 공급자 승인 후 같은 주소에서 실지도와 마커를 재확인하는 것이다.

## 화면과 전후 비교

| 영역 | 실제 화면에서 확인한 내용 |
|---|---|
| Home | 모바일 Hero의 제목과 두 탐색 버튼이 하단 메뉴 위에 배치된다. 데스크톱에서는 왼쪽 탐색과 오른쪽 영상이 함께 보인다. |
| Sea | 모바일 제목과 지도 조작부를 덮던 챗봇을 일반 페이지의 하단 호출 방식으로 통일했다. 호출과 닫기를 320·390·1280·1440px에서 확인했다. |
| Sea 지도 진입 | Hero에서 지도로 이동하면 고정 헤더(하단 81px)가 GPS와 레이어 버튼을 가렸다. 앵커 여백 적용 후 모바일 지도 상단 79.5px, 두 버튼 상단 99px, 터치 높이 44px를 측정했다. 레이어를 실제로 열었다. 좁은 화면의 필터 칩 목록은 가로로 스크롤한다. |
| Fishing Spots · Conditions | 포인트와 실제 조건 조회로 이동했다. 모바일 Conditions 제목에서 마지막 음절이 따로 떨어지는 현상을 한글 단어 단위 줄바꿈으로 수정했다. |
| Navigation | V5 지도를 렌더링했다. 헤더와 하단 메뉴를 숨긴 몰입형 화면에서 홈과 포인트 복귀를 각각 사용했다. GPS·방향·줌·추적을 포함한 HUD 버튼 11개의 중심이 두 화면 폭 모두에서 다른 요소에 가려지지 않았고 최소 44×44px였다. |
| Fish | 데스크톱 어종 카드 제목 위에 겹쳐 보이던 장식 문구를 제거했다. 종 설명·탭과 배경 사진을 따로 읽을 수 있다. |
| Charter · Market · Community | 목록, 필터, 등록 버튼, 공개 항목이 없을 때의 안내를 확인했다. 모바일은 한 열로 배치되고 데스크톱 필터는 한 행에서 정렬된다. |
| License · Study | 어두운 공통 헤더에서 밝은 학습 카드로 이어진다. 모바일 하단 메뉴를 유지하며 일반·요트 면허의 문제 분류와 복귀 문맥을 확인했다. |
| Account | 익명 프로필·저장·활동 진입점과 로그인 안내를 확인했다. 로그인 사용자의 데이터와 관리자 화면은 NOT_VERIFIED다. |

- [Sea 모바일 수정 전](../reports/platform/ui-final-visual-acceptance-v1/sea-mobile-before.jpg) · [수정 후](../reports/platform/ui-final-visual-acceptance-v1/sea-mobile-after.jpg)
- [지도 진입 시 버튼 수정 전](../reports/platform/ui-final-visual-acceptance-v1/sea-anchor-before.jpg) · [수정 후](../reports/platform/ui-final-visual-acceptance-v1/sea-anchor-after.jpg)
- [Fish 데스크톱 수정 전](../reports/platform/ui-final-visual-acceptance-v1/fish-desktop-before.jpg) · [수정 후](../reports/platform/ui-final-visual-acceptance-v1/fish-desktop-after.jpg)
- [Conditions 모바일 수정 전](../reports/platform/ui-final-visual-acceptance-v1/conditions-mobile-before.jpg) · [수정 후](../reports/platform/ui-final-visual-acceptance-v1/conditions-mobile-after.jpg)

## 기존 64개 화면과 10개 여정

기존 64개 분류는 기본 동작 통과 42, 부분 검증 13, 관리자 익명 경계 6, 내부·콜백 3이다. 이번에는 12개 경로의 13개 장면을 390×844와 1280×900에서 검수했다. 공개 47개 중 44개는 기존 감사에서 홈으로부터 실데이터로 도달했다. 나머지 3개는 Charter·Market·Community의 비어 있는 상세 화면이다. 47개 모두 홈 복귀 클릭으로 검사했으며, 빈 상세에서의 복귀는 실제 게시물의 노출 검증에 포함하지 않았다.

| 여정 | 공개 화면의 실제 클릭 | 남은 범위 |
|---|---|---|
| A 바다 | 홈 → 오늘의 바다 → 바다 지도 → 홈 | Kakao 지도 결과는 아래 환경별 표 참조 |
| B 낚시 | 포인트 boat-27 → Conditions → 항법 → 같은 포인트 → 홈 | 어종 BM-SPECIES-000751, 목적지 좌표·이름·ID 전달 |
| C 도감 | 어종 펼침 → 해당 어종 포인트 검색 → 홈 | 공개 단계 통과 |
| D 출조 | 출조 → 파트너 → 등록 로그인, 예약·문의 안내 | 인증 후 접수 상태 미검증 |
| E 마켓 | 마켓 → 판매글 등록 로그인 → 홈 | 내부 returnTo 유지, 본인 판매글 미검증 |
| F 커뮤니티 | 커뮤니티 → 글쓰기 로그인 → 홈 | 내부 returnTo 유지, 작성·본인 활동 미검증 |
| G 면허 | 가이드 → 학습 → 이론 상세 → 시험 → 오답 → 진도 → 분석 → 홈 | 요트 면허 문맥도 별도 검사 |
| H 계정 | 계정 → 프로필 → 저장 → 홈 | 본인 저장 항목에서 원본으로 이동 미검증 |
| I 지식 | 가이드 → 사전 → 보트백과 → 안전 가이드 → 홈 | 공개 단계 통과 |
| J 도움말 | FAQ → 문의 → 홈 | 공개 단계 통과 |

## 지도·인증 검증 환경

운영 V5에서 Kakao SDK 첫 요청은 HTTP 200이었지만 후속 스크립트가 CSP에 차단됐다. 기존 스크립트 허용 목록에 `https://t1.kakaocdn.net/mapjsapi/js/main/`, 이미지 허용 목록에 `https://t1.kakaocdn.net/mapjsapi/images/` 및 `https://mts.kakaocdn.net/api/v1/tile/`을 추가했다. 일반 eval은 계속 차단된다. 공급자 로딩이 실패하면 종료 상태 한 개와 V5 항법 지도 링크를 제공한다.

| 환경 | 확인한 결과 |
|---|---|
| [최종 Preview](https://blue-marina-jgfre0gpq-chiweon.vercel.app/sea#live-marine-map) | 배포 READY. 요청 출처와 프로젝트 공개 클라이언트 키 일치를 확인했다. 공급자는 도메인을 언급하는 JSON과 HTTP 401을 반환했고 실지도 타일은 0장이었다. 단일 오류 안내의 ‘항법 지도 열기’를 눌러 V5 지도 캔버스 표시를 확인했다. |
| 허용된 로컬 HTTPS 후보 | 부산 지역의 실제 Kakao 지도와 글자·마커를 확인했다. 모바일 12장, 데스크톱 30장 모두 HTTP 200 및 이미지 디코딩을 확인했다. 위치 권한 없이 서비스 기본 좌표에서 촬영했다. |
| Home 링크 | 최종 Preview에서 모바일 20/20개, 데스크톱 21/21개를 직접 클릭했다. 47개 공개 화면에서 홈으로 복귀했고 핵심 여정 10개의 익명 구간이 통과했다. |

[로컬 실지도 모바일](../reports/platform/ui-final-visual-acceptance-v1/authorized-local-sea-390.jpg) · [로컬 실지도 데스크톱](../reports/platform/ui-final-visual-acceptance-v1/authorized-local-sea-1280.jpg)

보호된 Vercel Preview의 열람 세션으로 익명 흐름을 검사했다. 관리자 6개는 HTTP 404, Account API는 HTTP 503과 ACCOUNT_BACKEND_DISABLED, private/no-store, noindex/nofollow를 반환했다. 앱 소유자·관리자의 인증 세션, 실기기 GPS·현장 항적·잠금 복귀는 미검증이다.

## Git 및 회귀 검증

격리된 clean main은 1,444 통과와 2건 건너뜀, 출시 후보는 1,449 통과와 2건 건너뜀을 기록했다. 두 트리에서 typecheck, lint, build, git diff --check가 통과했다. 작업용 D 드라이브 복사본에서 파일과 Git 객체 불일치를 발견해 검증된 객체에서 새 체크아웃을 만들고 의존성을 다시 설치했다. 최종 Preview 앱 커밋은 `0c40fddebadc8e13b407a9b66715b24cc114d640`이다.

V6의 Cesium·VWorld는 별도 브랜치다. 공통 변경 경로인 MarineNavigation.tsx의 홈/이전 버튼, 목적지·항해 세션, 단일 GPS 구독은 추후 통합할 때 기능 회귀를 확인해야 한다. 이 검수에서는 UI 브랜치만 커밋하고 Preview만 배포했다.

[검사 수치와 배포 커밋](../reports/platform/platform-ui-final-visual-acceptance-v1.json) · [실제 화면 증빙](../reports/platform/ui-final-visual-acceptance-v1/)
