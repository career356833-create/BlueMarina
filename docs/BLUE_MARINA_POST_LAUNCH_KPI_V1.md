# Blue Marina Post-launch KPI V1

증빙일: 2026-10-05. 실제 원격 read-only 집계와 기존 QA marker를 사용한다. 이메일·사용자 ID·토큰·개별 글 제목은 기록하지 않는다.

## 현재 실적

| 지표 | Real | QA | 의미 |
|---|---:|---:|---|
| 등록 계정 | 3 | 18 | 누적 signup 이벤트 아님, 현재 auth 행 21개 |
| 보존 기록에서 관측되는 첫 참여자 | 0 | 5 | saved와 non-DRAFT 제출의 고유 owner; 도메인 간 중복 제거 |
| 현재 저장 항목 | 0 | 0 | 삭제된 저장은 포함 안 됨 |
| Charter 제출 | 0 | 3 | 승인 2 + 검토 대기 1 |
| Market 제출 | 0 | 3 | 숨김 2 + 제출 대기 1 |
| Community 제출 | 0 | 7 | 숨김 2 + 거절 상태 5 |
| 승인 이력이 있는 Charter/Market/Community | 0 / 0 / 0 | 2 / 2 / 2 | distinct review target |
| 거절 이력이 있는 Community | 0 | 4 | 상태 REJECTED 5와 다름. 이력이 없는 과거 행을 invent하지 않음 |
| 현재 공개 Charter/Market/Community | 0 / 0 / 0 | 0 / 0 / 0 | Charter registry, Market ACTIVE, Community ACTIVE+APPROVED |

Admin first action 0. 로그인의 성공 자체는 first action이 아니다. 기존 사용자 소유 QA 표시 행도 QA로 분류한다. missing owner는 UNKNOWN; 일반 사용자 수에 억지로 넣지 않는다.

## 계산 계약

- First saved: 보존된 user_saved_items에서 고유 user 수. first Community/Charter/Market: 보존된 non-DRAFT 제출의 고유 owner 수.
- First actions: 네 집합의 union. 관측 가능한 하한이며 lifetime activation으로 이름 붙이지 않는다.
- Submission → Approved: Real distinct approved targets / Real retained submitted records. 분모 0이면 UNKNOWN.
- Approved → Currently public: Real public stock / Real distinct approved targets. 동일 cohort가 아니며 lifetime publication률이 아니다. 분자가 분모보다 크면 UNKNOWN.
- Charter approval/publication은 별도 시스템 경계이므로 approved→public 비율 UNKNOWN.
- Visitors, landing, Kakao start/complete, submission start, login→first action, UTM/referrer actual: 전부 UNKNOWN/UNOBSERVED. 0 또는 추정치로 대체하지 않는다.
- cap 1000 도달·쿼리 실패·불완전 identity는 UNKNOWN. 60초 단위 캐시여서 순간적으로 지연될 수 있다.

## 제안 목표 — 실적 아님

첫 통제된 유입 실험의 최소 학습 목표: Real first saved user 1명, Real Charter/Market/Community 첫 제출 각 1건, 검토를 통과한 Real 공개 콘텐츠 1건. 이는 제안 목표이며 유료 집행/달성/일정 약속이 아니다. 전환율 목표는 관측 가능한 denominator가 마련되기 전 설정하지 않는다.

## 운영 행동

Operations의 유입·첫 참여와 기존 pending age/NEEDS ATTENTION을 함께 확인 → 도메인 권한을 가진 관리자가 검토 → 실제 공개 reader와 owner 상태 확인. QA와 admin은 분리한다. Charter는 검증된 공급자 동의와 별도의 수동 registry release가 필요하다. 가짜 상품/게시물/리뷰로 목표를 채우지 않는다.

Attribution은 allowlist 설계만 존재하고 수집하지 않는다. 따라서 실험 중 최초 제출의 증가만 관측할 수 있으며 광고 채널의 기여도를 주장할 수 없다.
