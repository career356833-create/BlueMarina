# Blue Marina UI 수정 기록 V1

| 우선순위 | 재현한 동작 | 수정·재검증 |
|---|---|---|
| P0 | /sea의 모바일 진입에서 Kakao SDK에 maps만 존재할 때 생성자가 준비된 것으로 처리해 화면이 중단됨 | autoload=false 콜백과 실제 지도 생성자·이벤트 검증까지 대기. 같은 요청 진행 중에는 Promise 공유, 실패 시 재시도 가능. 익명 Preview에서 공급자 오류 후 화면 유지 |
| P1 | 항법의 이전 버튼으로 포인트에는 돌아갈 수 있지만 메인으로 직접 나갈 수 없음 | 기존 항법 상단 바에 별도 홈 추가. 포인트 복귀와 홈을 각각 클릭 |
| P1 | Charter·Market 관리 경로 직접 방문 시 익명에게 관리 화면 골격이 보임 | 기존 서버 역할 경계를 목록·상세까지 적용. 두 도메인의 4개와 기존 운영 관리자 2개 모두 익명 404 |
| P1 | 화면 이동 시 저장하지 않은 입력의 유실 가능 | Charter, Market, Community 폼의 변경 상태와 항해 중 이탈 경고 연결. 출조 폼에서 취소 시 입력 유지, 승인 시 홈 이동 확인 |
| P1 | 마켓 상세의 상류 조회 실패를 상품 없음으로 처리 | 잘못된 ID·비공개·실제 누락을 분리하고 운영 조회 오류는 오류 경계로 전달. Market·Community에 재시도, 부모 목록, 홈 제공 |
| P1 | 요트 면허에서 이론 상세로 들어가면 일반 면허로 전환 | 이론 카드·목록·문제 복습에 선택한 면허 전달. 요트 상세와 부모를 왕복 |
| P2 | 밝은 학습 카드 위에 모바일 하단 메뉴 배경이 투명함. 홈과 서비스 제목의 어절이 분절됨 | 공통 하단 메뉴의 불투명 배경과 홈·Sea·Fish·Market 제목의 줄바꿈 조정. 데스크톱과 모바일 화면 검토 |
| P2 | 직접 진입 및 내부 이동에서 뒤로가기 목적지가 일관되지 않음 | 같은 출처의 실제 이전 항목을 우선하고 직접 진입 시 부모로 이동 |
| P2 | 홈에서 도움말을 찾으려면 다른 서비스로 우회. 출조 목록이 비어 있으면 문의 안내 진입도 어려움 | 홈 하단 FAQ·문의, 출조 목록에 예약·문의 안내 추가. 공개 정보만 사용하는 왕복 경로 확인 |

수정 전후 [바다 화면](../reports/platform/ui-engine-audit-v1/before-sea-focused.jpg)과 [수정 후 화면](../reports/platform/ui-engine-audit-v1/after-sea-focused.jpg), [항법 수정 전](../reports/platform/ui-engine-audit-v1/before-sea_navigation-focused.jpg)과 [항법 수정 후](../reports/platform/ui-engine-audit-v1/after-sea_navigation-focused.jpg)를 비교할 수 있다. 실제 지도 공급자 성공 여부, 인증된 계정과 장치 검증 범위는 [감사 보고서](BLUE_MARINA_PLATFORM_WIDE_UI_ENGINE_AUDIT_V1.md)에 기록했다.

[어종 도감 제목 수정 전](../reports/platform/ui-engine-audit-v1/before-fish-1280.jpg) · [수정 후](../reports/platform/ui-engine-audit-v1/after-fish-1280.jpg) · [데스크톱 바다 화면 수정 전](../reports/platform/ui-engine-audit-v1/before-sea-1280.jpg) · [수정 후](../reports/platform/ui-engine-audit-v1/after-sea-1280.jpg) · [모바일 마켓 수정 전](../reports/platform/ui-engine-audit-v1/before-market-390.jpg) · [수정 후](../reports/platform/ui-engine-audit-v1/after-market-390.jpg)
