# Blue Marina Navigation UX V2

판정: **NAVIGATION_UX_V2_COMPLETE_WITH_LIMITATIONS**

## 구현

기존 MapLibre 6.6.0 지도 인스턴스에 2D(0°)/3D(55°) 카메라 전환과 보트 추적을 연결했다. 3D 추적에서는 화면 중심보다 높이의 1/6 아래에 보트를 배치한다. 드래그로 추적이 중지되고 내 위치 버튼으로 재개된다. 터치 시작 시 진행 중인 카메라 애니메이션을 멈추며 GPS 갱신은 최소 750ms 간격으로 반영한다. 모드 전환으로 지도를 재생성하지 않는다.

현재 위치는 외곽선과 선실이 있는 보트로 표시하며, GPS가 없거나 15초를 넘긴 위치는 실시간 마커로 표시하지 않는다. 기존 정확도 원과 목적지 마커를 유지한다. 확대/축소와 새 제어 버튼의 터치 영역은 44px 이상이다. 전역 Header/BottomNav/chatbot은 항법 화면에서 계속 숨겨진다. 해양 drawer와 접힌 상세 패널, safe-area를 유지했다.

## 속도·방향·거리

- GPS 대지속도(SOG): native `coords.speed` 사용. 기본 kn, km/h 전환. 환산은 각각 m/s × 1.943844, × 3.6.
- null/NaN/음수는 미확인, 유효한 정지 0은 0.0. 좌표 차분으로 임의 속도를 만들지 않는다.
- 정확도 50m 초과 또는 15초 초과 위치는 실시간 수치 계산에서 제외한다.
- 2초 시정수 평활화, 60m/s 초과 및 최근 표본 대비 비정상 양의 급등을 제외한다. 이는 화면 표시용 휴리스틱이며 선박의 안전·성능 기준이 아니다.
- 목적지 방위, GPS COG, 절대 기기 나침반을 구분한다. 원본 속도 1m/s 미만일 때 GPS COG로 회전하지 않는다. 상대 orientation은 절대 방향으로 쓰지 않는다. 방향 미확인 시 지도는 북쪽 기준으로 돌아간다.
- 목적지까지 해리 직선거리와 방위를 표시한다. 오래된 위치로 실시간 계산하지 않는다. 안전항로, 육지/암초/수심 회피, AIS 또는 공식 항법장비 대체를 주장하지 않는다.
- DEM을 연결하지 않았다. 3D는 지도 카메라 시점이며 해저 지형이 아니다. [MapLibre 카메라 API](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/CameraOptions/)를 따른다.

## 검증

| 항목 | 결과 |
| --- | --- |
| NAV-V2-01~18 | 18 PASS |
| V2 + 기존 live sensor tests | 26 PASS |
| 전체 테스트 | 1,347 PASS / 1 SKIP / 0 FAIL |
| typecheck / lint | PASS |
| clean-copy npm ci + build | PASS, 1,467 static pages |
| diff check | PASS |
| 모바일/데스크톱 | 360/390/430×844, 1280×900; overflow 0 |
| 실제 브라우저 모의 이동 | 보트·속도·추적·드래그·재중심·방향 전환 PASS |
| rock-151 연결 | 상세 → Conditions → Navigation → 상세 PASS |
| 지도 진입/복귀 | local 3회, Preview 3회 PASS |
| tile release/unload 오류 | 재현되지 않음; 추정에 의한 lifecycle 변경 없음 |

브라우저에서 3D 기울기와 지도 조작을 직접 확인했다. 단위 전환은 모의 7.8kn → 14.4km/h로 확인했다. 자동 테스트의 카메라 검증은 provider에 전달되는 실제 easeTo 옵션을 지도 대역으로 검사하며, 실제 WebGL 렌더는 브라우저에서 별도 확인했다. NAV-V2-18 자동 검사는 레이아웃 계약이고 실제 overflow는 각 viewport의 DOM 크기와 화면으로 검증했다.

로컬 기존 node_modules에는 MapLibre 6.12.0이 있었으므로 출시 검증에 사용하지 않았다. main archive 별도 폴더에 npm ci를 실행하여 lock의 MapLibre 6.6.0 / Next 15.5.19로 검증했다. lockfile 및 공유/worker 정적 자산은 main과 동일하다. 전체 테스트의 격리 DB 테스트는 저장소 밖 PGlite로 실행했으며 원격 DB에는 접근하지 않았다.

## 배포

- Preview: https://blue-marina-2v18zq7nv-chiweon.vercel.app — READY, 브라우저 확인.
- Production: https://blue-marina.vercel.app/sea/navigation — READY, 브라우저 확인.
- Production deployment: `dpl_A23D7c9zULpVwacBSk1dTRBGb7oT`.
- 배포 코드 SHA: `0368b9843e43236aeff6d04e68b59465dd63839d`.
- 이 문서와 JSON 증빙은 배포 후 별도 문서 커밋으로 기록한다. 배포 코드와 문서 커밋 사이 런타임 차이는 없다.

## 변경 범위와 보존

- `src/app/sea/navigation/navigation-map.css`
- `src/components/boat/navigation/MarineNavigation.tsx`
- `src/components/boat/navigation/NavigationMapShell.tsx`
- `src/components/boat/navigation/adapters/MapLibreNavigationMap.tsx`
- `src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts`
- `src/lib/marine-navigation/adapters/navigation-map-adapter.ts`
- `src/components/boat/navigation/NavigationInstruments.tsx`
- `src/lib/marine-navigation/vessel-instruments.ts`
- `tests/marine-navigation/navigation-ux-v2.test.cjs`

증빙 2개 외 추가 범위는 없다. 기존 1,883개 무관 파일의 해시를 보존했고, 혼합된 Navigation 파일 3개의 기존 ROMS timeout diff도 내용 그대로 남겼다. DB/Auth/Charter/Market/Community/Operations/퍼널 및 환경변수 변경은 0이다.

## 남은 제한과 다음 확인

실제 스마트폰 GPS·이동 속도·나침반·권한 거절/재허용·백그라운드 복귀·물리적 핀치는 미검증이다. 브라우저의 기존 명시적 SIMULATION과 센서 자동 테스트는 실기기 통과로 간주하지 않는다. REAL_DEVICE_NAVIGATION_READY를 주장하지 않는다. 기존 해양 자료의 PARTIAL/CURRENT STATUS UNAVAILABLE도 유지한다.

다음 우선순위는 실제 선상 스마트폰으로 SOG/COG, GPS 오차, 권한과 복귀 동작을 확인하는 것이다.
