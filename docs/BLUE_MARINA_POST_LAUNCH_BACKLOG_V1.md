# Blue Marina Post-launch Backlog V1

기준: [Release Readiness Final V1](BLUE_MARINA_RELEASE_READINESS_FINAL_V1.md), 2026-10-03 KST. 다음 항목은 공개 정보 서비스와 검토 대기형 제출 흐름의 출시 판정을 막지 않는다. 실제 사용량과 운영 준비에 따라 순서를 다시 정한다.

| 순위 | 작업 | 완료 조건 |
| --- | --- | --- |
| 1 | 실제 Charter 공급자 온보딩·승인 및 문의 운영 | 공급자 동의와 출처를 확인하고 운영자 승인 E2E를 거쳐 실제 공개 offer가 생긴다. QA 제출을 공급 KPI에서 제외한다. |
| 2 | 관리자 성공 경로와 두 번째 사용자 권한 검증 | Charter·Market·Community 승인/거절의 권한 있는 관리자 E2E, Account/제출물의 교차 사용자 RLS 거부 E2E를 별도 계정으로 통과한다. |
| 3 | 실기기 모바일 검증 및 접근성 보강 | 실제 스마트폰의 GPS 권한 거부·재허용, 이동/heading, 잠금/복귀, 설치형 PWA, 키보드·모달·CTA 가림 검증을 기록한다. |
| 4 | 해양 데이터·Navigation 보조 기능 신뢰성 | 공급자 snapshot의 유효성·신선도 자동화와 장애 표시를 개선한다. AIS/선박 교통은 출처·지연·책임 범위를 확정한 뒤 별도 검토한다. 안전항로/충돌회피를 추론하거나 주장하지 않는다. |
| 5 | 공개 콘텐츠와 운영 품질 정리 | 실제 Market/Community 승인 콘텐츠 확보, 없는 business detail의 HTTP 404, 기존 Security Advisor WARN/INFO와 로컬 임시 비밀파일 제거 확인을 처리한다. |

현재 공개 Charter offer, Market ACTIVE listing, Community 승인 post는 각각 0이다. 승인 전 콘텐츠나 QA 데이터를 채우기 위해 가짜 재고·예약·거래·반응을 만들지 않는다.
