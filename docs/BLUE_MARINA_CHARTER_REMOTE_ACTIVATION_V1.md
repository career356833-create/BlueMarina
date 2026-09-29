# Blue Marina Charter Remote Activation V1

## 판정

`CHARTER_BACKEND_PRODUCTION_ACTIVE_WITH_LIMITATIONS`

2026-09-29 기준 `https://blue-marina.vercel.app`에서 일반 Kakao 로그인 사용자가 출조 정보를 제출하고, 서버에 저장된 본인 제출 내역을 다시 열어 검증할 수 있다. 테스트 제출 1건은 `REVIEW_REQUIRED`이며 관리자 승인, promotion candidate, 공개 출조상품은 모두 0건이다. 이 테스트 행은 실제 공급 KPI에서 제외한다.

## Production 흐름

`/charters/partners` → `/charters/onboarding` → `/account/login?returnTo=%2Fcharters%2Fonboarding` → Kakao 로그인 → 등록 화면 복귀를 확인했다. 파트너 안내에서 직접 입력과 CSV 템플릿 경로를 제공한다. 로그인한 일반 사용자가 추가 공급자 역할 없이 최소 테스트 정보를 제출했고, Supabase에 owner-linked 제출과 감사 이력이 저장됐다. 제출 시 상태가 `REVIEW_REQUIRED`가 되었고, 검증 오류 0건, 확인 사항 2건, 공공 등록정보 대조 `NO_MATCH`로 표시됐다. 선박명과 출항항명은 제공되지 않았으므로 경고로 남겼다. 가격, 좌석, 일정, 실제 선박 또는 업체 연락처를 만들어 넣지 않았다.

등록 화면에서 본인 제출 내역을 재방문하고 재검증을 두 차례 실행했다. 확인 사항은 매번 2건으로 유지됐다. 초기 배포에서 재검증 시 경고가 중복되는 문제를 발견해 원본 payload를 다시 정규화하도록 수정했다.

## 접근 및 공개 경계

- `CHARTER_SUPPLY_INTAKE_ENABLED=true`를 Production에 설정하고 동일한 main SHA로 READY 배포했다. Market 및 다른 기능 플래그는 변경하지 않았다.
- 미인증 제출 API는 HTTP 401, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`를 반환한다.
- 공급자의 목록과 상세 조회 및 재검증은 본인 제출에 한정된다. 관리자 화면은 별도 `scope=admin`으로 `charter_admin`을 다시 검사한다. 일반 Kakao 계정에서 관리자 목록과 상세가 `AUTH_REQUIRED`로 거부됐다. 검토·승인 API도 관리자 역할을 요구하며 정상 사용자 화면에는 승인 조작이 나타나지 않는다.
- Charter 관련 4개 테이블은 RLS가 켜져 있고 `anon` 및 `authenticated` 직접 SELECT/INSERT 권한이 없다. 서비스는 서버의 service-role client로 사용자 ID를 확인한 후 소유권을 적용한다.
- `REVIEW_REQUIRED`는 업체 인증이나 공개 승인이 아니다. `/charters`는 계속 정직한 빈 상태이며 공개 registry, review, promotion candidate는 0건이다.

## 검증과 데이터 보존

390×844 및 1280×900에서 `/charters`, `/charters/partners`, `/charters/onboarding`을 확인했다. 세 화면 모두 가로 넘침이 없었다. CSV 템플릿은 Production에서 HTTP 200으로 내려왔으며, 기존 dry-run parser 계약은 테스트로 유지된다. 대량 CSV 제출이나 외부 업체 연락은 하지 않았다.

기존 데이터는 `fish_species` 1,258, `marine_organisms` 3,016, Auth 사용자 3, profiles 3, saved items 0으로 유지됐다. 새 Charter 테스트 제출 1건과 감사 이력 5건을 확인했다. 원격 migration/DDL, Supabase 설정 변경, Account profile/saved 또는 Market 데이터 변경은 없었다. Kakao 재로그인에 따른 Auth 로그인 메타데이터 갱신은 이 불변식에 포함하지 않는다. Supabase Security Advisor의 CRITICAL/HIGH는 0건이며 기존 INFO/WARN 항목은 남아 있다.

코드 수정 검증: Charter 대상 테스트 25/25, 전체 1,330 PASS / 1 SKIP, typecheck, lint, build, `git diff --check` 모두 통과했다. Production은 `a4e8a8ad25e33c07b8def983d6d71a58cb493b11`을 READY로 제공했다.

## 제한

- 승인된 `charter_admin` 테스트 계정이 없어 관리자 승인 성공 E2E는 수행하지 않았다. 일반 사용자 거부 경계는 Production에서 확인했다.
- 두 번째 사용자 세션이 없어 사용자 간 실제 JWT 격리 E2E는 수행하지 않았다. 서비스 수준 owner-only 테스트와 원격 RLS/권한 상태로 보완했다.
- 테스트 제출은 삭제 API가 없어 `REVIEW_REQUIRED`로 보존하며 실제 공급·연락·승인 KPI에서 제외한다.
- actor rate limit은 현재 서버 인스턴스 메모리 기준이다.

다음 독립 작업은 `MARKET_BACKEND_PRODUCTION_ACTIVATION`이다. 이번 작업에서는 Market을 활성화하지 않았다.
