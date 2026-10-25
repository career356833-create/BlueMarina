# Blue Marina Navigation V3 — Advanced UX

**NAVIGATION_V3_COMPLETE_WITH_LIMITATIONS**
**REAL_DEVICE_NAVIGATION_NOT_VERIFIED**

## V2 → V3

| 영역 | 실제 변경 |
| --- | --- |
| 계기판 | SOG 48–64px, kn/km/h; 직선거리·방위와 GPS 품질 분리 |
| 3D | 55° 유지, 지도 크기에 맞춘 67–72% 보트 앵커와 전방 시야 |
| 보트 | 흰 테두리 선체·선실과 위치 링; 방향 미확인 원형 표식 |
| 품질 | LIVE/LOW_ACCURACY/STALE/UNAVAILABLE; STALE은 회색, 실시간 계산 중지 |
| 추적 | 드래그 중지·내 위치 복귀, 위치 deadband와 각도 완화, COG 없으면 북쪽 |
| 항적 | 기존 로컬 저장형 recorder를 세션 메모리로 교체; 2,400점 제한·표시 토글·지우기 |
| HUD | 투명 형태 유지, 크기 축소; 사용 가능한 위치가 없으면 숨김 |
| 검증 도구 | 개발 환경 전용 GPS 시뮬레이터; Production UI 미노출 |

## 데이터와 안전 계약

속도는 native GeolocationCoordinates.speed만 사용한다. V2의 null/음수/비정상 급등·15초 freshness·50m accuracy·2초 평활화 계약을 유지한다. 미수신 속도를 0으로 만들지 않는다. 위치는 유효 범위·timestamp·정확도를 검사하고 이전 위치 대비 60m/s×경과 시간+오차 범위를 넘는 점프를 제외한다. 이 수치는 표시용 휴리스틱이며 안전 속도 기준이 아니다.

COURSE UP은 이동 COG만 사용한다. 기기 나침반과 목적지 방위는 별도 정보이며 COG를 선수 방향으로 단정하지 않는다. 방향 신뢰도가 없으면 북쪽으로 돌아가되 마지막 카메라 앵커를 유지한다. 실제 위치 갱신·카메라 애니메이션은 기존 MapLibre 인스턴스를 재사용한다. 지도 객체나 style을 GPS마다 재생성하지 않는다. 고정된 MapLibre 6.6.0 및 정적 worker/lockfile은 변경하지 않았다.

항적은 현재 브라우저 페이지의 메모리만 사용한다. 정확도 낮음·stale·점프를 제외하며 GPS 중단/재시작, pause/resume, 자료원 전환, 15초 초과 간격은 별도 구간으로 그린다. 정지 jitter는 선을 만들지 않는다. 파란 항적은 지나온 기록, 금색 점선은 직선 방향 참고선이다. 안전항로·암초/육지/수심 회피·AIS·충돌회피는 제공하지 않는다. DEM이나 임의 해저 지형을 연결하지 않았다.

기존 항적 localStorage 키는 읽거나 쓰지 않고, 이전 데이터도 임의 삭제하지 않는다. 새 항적은 새로고침/페이지 이탈 시 사라진다. GPS/항적을 서버·계정 활동·퍼널로 전송하는 코드를 추가하지 않았다. 기존 지도 타일 요청은 유지된다.

## 실제 브라우저 QA

- 360/390/430×844, 1280×900에서 가로 넘침 0. 주요 버튼 44px 이상.
- 모의 0.0/2.5/8.0/15.0kn, 가속 5→14.9kn, 감속 15→3.0kn 확인.
- 3D 전방 시야, 보트 추적, 이동 중 드래그 해제와 재중심 확인.
- 방향 변경 및 목적지 반대 이동 시 거리 0.30→0.43nm 증가 확인.
- LOW_ACCURACY/STALE/UNAVAILABLE에서 수치 미확인, 점프 제외 안내, 회색 마지막 위치 확인.
- 항적 누적 79점, 일시정지 후 지우기 0점, 표시 토글 확인.
- Navigation 나가기/재진입 3회 및 모드 반복: 지도 오류 재현 없음.
- rock-151 상세 → Conditions → Navigation의 ID·좌표·이름·복귀 경로 유지.
- Preview 및 Production에서 지도 렌더·2D/3D·모바일 조작·테스트 UI 미노출 확인.

시뮬레이터는 development에서만 마운트되며 실제 GPS 수신과 같은 acceptPosition 경로를 사용한다. 결과는 TEST/SIMULATION으로 표시하고 운영 지표에 기록하지 않는다. native OS 권한과 실제 기기 센서 검증을 대체하지 않는다.

스크린샷: `D:/Projects/bm-navigation-v3-115fdf3/outputs/navigation-v3/` — 2D 정지, 3D 8/15kn, 항적, 품질 저하, 신호 끊김, stale, 각 viewport, Production.

## 자동 검증

- NAV-V3-01~20: 20 PASS.
- V2 + V3 + live sensors: 46 PASS.
- 전체: **1,367 PASS / 1 SKIP / 0 FAIL**.
- npm run typecheck / lint / build / git diff --check: PASS.
- 1,467 static pages. 기존 Supabase Edge process.version 빌드 경고는 남지만 빌드는 성공했다.
- 별도 main archive에서 exact 변경만 검증했다. 이전 clean npm-ci의 동일 lock 의존성을 재사용했고 remote DB에 접근하지 않았다.
- V2 테스트는 유지하되 responsive offset과 완화된 회전의 기대값을 변경했다. 기존 센서 테스트의 source regex는 GOOD-only 게이트와 일치시켰다.

## 배포

- Preview: https://blue-marina-60dur5spv-chiweon.vercel.app — READY.
- Production: https://blue-marina.vercel.app/sea/navigation — READY.
- 배포 ID: `dpl_EtrTot2mMk8qqCmuzVP7m9fzs98c`.
- 코드 SHA: `4f0fde2bac1987970ef616b53fa10a8a5343c46a`.
- 최종 문서/보고서는 이후 증빙 커밋이며 런타임 차이는 없다.

## 변경 파일

- `src/lib/marine-navigation/vessel-instruments.ts`
- `src/lib/marine-navigation/session-track.ts`
- `src/lib/marine-navigation/types.ts`
- `src/lib/marine-navigation/adapters/navigation-map-adapter.ts`
- `src/lib/marine-navigation/adapters/navigation-map-geojson.ts`
- `src/lib/marine-navigation/gps-test-scenarios.ts`
- `src/lib/marine-navigation/simulation.ts`
- `src/components/boat/navigation/NavigationInstruments.tsx`
- `src/components/boat/navigation/NavigationGpsSimulator.tsx`
- `src/components/boat/navigation/MarineNavigation.tsx`
- `src/components/boat/navigation/TrackRecorder.tsx`
- `src/components/boat/navigation/NavigationTurnHUD.tsx`
- `src/components/boat/navigation/adapters/MapLibreNavigationProvider.ts`
- `tests/marine-navigation/navigation-ux-v2.test.cjs`
- `tests/marine-navigation/navigation-v3-advanced-ux.test.cjs`
- `tests/marine-navigation/live-sensors.test.cjs`

증빙: 이 문서와 `reports/platform/navigation-v3-advanced-ux.json`. 기존 1,886개 무관 dirty 파일 및 혼합 파일의 원래 hunk는 보존했다. DB/Auth/Charter/Market/Community/Operations/환경변수/퍼널 변경 0.

운영 smoke 당시 항행표지는 PARTIAL, 항행경보는 CURRENT STATUS UNAVAILABLE, 해양기상 관측·해상특보는 UNAVAILABLE로 표시됐다. 이 자료원 상태는 이번 Navigation UI 변경으로 활성화하거나 정상 데이터로 대체하지 않았다.

## 남은 제한과 다음 우선순위

실제 스마트폰 GPS·COG·나침반·가속/감속 실측, 햇빛 아래 가독성, 물리적 pinch, 화면 잠금 후 복귀는 미검증이다. 카메라 시점·브라우저 시뮬레이션 통과를 실기기 준비 완료로 표현하지 않는다. 다음 우선순위는 선상에서 실제 기기로 검증하는 것이다.
