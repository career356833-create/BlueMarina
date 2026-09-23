# Blue Marina Platform UX Integration V1

## Decision

`PLATFORM_UX_V1_READY_WITH_LIMITATIONS`

Blue Marina의 SEA, FISHING, FISH, CHARTER, MARKET, COMMUNITY, GUIDE를 하나의 navigation contract와 짧은 서비스 진입 구조로 연결했다. Charter, Market, Community는 화면과 로컬 검토 흐름이 준비되어 있지만 production 데이터와 backend activation이 아직 없으므로 제한 상태를 유지한다.

## Platform service map

| 영역 | 대표 경로 | 역할 | 상태 |
| --- | --- | --- | --- |
| HOME | `/` | 브랜드 진입점 | Active |
| SEA | `/sea`, `/today-sea` | 바다 탐색과 오늘의 정보 | Active |
| FISHING | `/fishing-spots`, `/fishing-spots/conditions` | 포인트와 환경 조건 | Active |
| FISH | `/fish` | 어종 도감 | Active |
| CHARTER | `/charters` | 출조 탐색과 문의 경계 | Data limited |
| MARKET | `/market` | 해양·낚시 장비 거래 탐색 | Backend limited |
| COMMUNITY | `/community` | 명시적 엔티티 연결 커뮤니티 | Backend limited |
| GUIDE | `/license-guide` | 면허·안전·학습 진입 | Active |

## Navigation authority

Desktop navigation은 `HOME / SEA / FISHING / FISH / MARKET / GUIDE` 여섯 개다. FISHING은 Fishing Spot과 Charter/Reservation 하위 흐름의 desktop active owner다. Community는 desktop top nav에 추가하지 않는다.

Mobile BottomNav는 `홈 / 바다 / 출조 / 어종 / 가이드` 다섯 개다. 출조는 `/charters`와 그 하위 경로에서 활성화된다. `/fishing-spots`는 mobile 출조 상태로 강제 표시하지 않는다. Market과 Community는 BottomNav 항목을 만들지 않는다.

## Home role

Home은 `MarineVideoHero`를 유지하는 Brand Entry다. 핵심 진입은 오늘의 바다, 바다 지도, 낚시 포인트, 출조 찾기, 어종 도감, 마켓 여섯 개다. 커뮤니티와 면허·가이드는 보조 링크로 배치한다. 근거 없는 NEW, BEST, 추천 badge를 사용하지 않는다.

## Primary journeys

- Fishing Spot에서 어종, Conditions, Sea, Navigation으로 이어지는 기존 `spotId`, `speciesId`, `returnTo` 흐름을 보존한다.
- Fishing Spots에서 Conditions, Charter, Community로 직접 이동할 수 있다.
- Charter 빈 상태에서 Fishing Spot, Fish, Conditions, Sea로 이동할 수 있다. 업체 onboarding은 작은 보조 링크다.
- Market 빈 상태는 로컬 판매글 초안과 Community로 이어진다.
- Community의 Fish, Fishing Spot, Charter, Market 연결은 사용자가 명시적으로 선택한 엔티티만 사용한다.
- Guide는 기존 학습·시험·실기 경로를 secondary journey로 유지한다.

## Empty, error, and loading conventions

Charter, Market, Community는 production record가 없음을 그대로 표시하고 사용 가능한 다음 행동을 제공한다. 전역 loading과 not-found 화면은 동일한 marine tone, semantic status, 44px 이상 CTA를 사용한다. backend feature flag가 꺼져도 fake submit, fake moderation, fake availability를 표시하지 않는다.

## Responsive and accessibility behavior

Navigation은 nested route에서 `aria-current="page"`를 제공한다. 모든 주요 CTA는 link/button semantics와 focus-visible outline을 유지한다. Mobile BottomNav는 safe-area padding과 다섯 칸 구성을 유지하며, Home service grid는 390px에서 두 열로 줄어든다. Desktop은 1280px에서 최대 폭과 섹션 간격을 유지한다.

## Backend limitations

- Charter production records: 0
- Market production records: 0
- Community production posts: 0
- DB/Supabase migration 또는 apply: 0
- Backend activation: 0
- 자동 ACTIVE, fake booking, fake moderation success: 0

## Non-goals

새 도메인, database migration, backend activation, 추천·랭킹, realtime chat/DM/follow, Fish canonical/condition registry 변경, SeaMapView 변경은 이 작업에 포함하지 않는다.
