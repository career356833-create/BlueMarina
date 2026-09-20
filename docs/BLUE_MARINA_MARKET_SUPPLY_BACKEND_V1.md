# Blue Marina Market Supply Backend V1

## Decision

`MARKET_SUPPLY_BACKEND_V1_READY_WITH_ENV_LIMITATIONS`

Market V1의 로컬 판매글 작성 계약을 서버 저장, 검증, 관리자 검토, 공개 상태 전이 계약으로 연결했다. 이 결과는 코드와 migration artifact 수준에서 검증됐다. local/remote Supabase migration과 Storage bucket apply는 모두 0이며, 인증된 실제 환경 E2E는 수행하지 않았다.

## Persistence contract

Migration `20260920115127_market_supply_backend_v1.sql`은 다음 5개 테이블을 정의한다.

- `market_listings`: 판매글과 원본·정규화·검증 snapshot, idempotency metadata
- `market_listing_images`: private staging object metadata와 노출 상태
- `market_listing_contacts`: 판매자 연락 수단과 공개 동의 상태
- `market_listing_reviews`: 관리자 판정과 사유, review snapshot
- `market_listing_audit_logs`: 생성, 제출, 검증, 검토, 상태 전이 이력

모든 테이블은 RLS를 활성화한다. `anon`과 `authenticated`의 직접 권한을 철회하고 서버의 `service_role`만 저장소에 접근한다. API가 Supabase Auth의 `auth.getUser(token)`으로 사용자를 다시 확인한 뒤 소유권과 관리자 권한을 검사한다. 관리자 권한은 `app_metadata.market_role = market_admin`만 사용한다.

Migration apply 상태:

- local apply: 0
- remote apply: 0
- production touched: 0

## API and workflow

API는 create, fetch, list, validate, status, review, image upload intent를 제공한다. 생성 요청에는 8~128자의 idempotency key가 필요하며, 동일 판매자의 같은 원문은 content hash로 중복을 막는다. 256 KiB 요청 제한과 actor별 10분 10회 경계를 둔다.

판매글 상태는 `DRAFT → SUBMITTED → ACTIVE → RESERVED/SOLD/HIDDEN` 흐름을 기본으로 한다. `SUBMITTED → REJECTED`와 `RESERVED → ACTIVE/SOLD/HIDDEN`도 명시적으로 허용한다. 서버에 처음 저장되는 상태는 `SUBMITTED / REVIEW_REQUIRED`다. 관리자가 검토 사유와 함께 승인해야만 `ACTIVE`가 된다. automatic ACTIVE: 0.

`RESERVED`와 `SOLD`는 결제 증빙이나 거래 보증이 아니다. 판매자 또는 관리자가 각각 거래 중, 판매 완료로 표시한 운영 상태다. 공개 목록은 `ACTIVE`만 노출하고 `RESERVED`와 `SOLD`는 기본 목록에서 제외한다.

표준 오류 코드는 `VALIDATION_ERROR`, `AUTH_REQUIRED`, `FORBIDDEN`, `LISTING_NOT_FOUND`, `INVALID_STATE_TRANSITION`, `DUPLICATE_SUBMISSION`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA`, `RATE_LIMITED`, `INTERNAL_ERROR`다.

## Image storage boundary

이미지는 private staging bucket `market-listing-staging`을 전제로 signed upload intent만 발급한다. JPEG, PNG, WebP만 허용하고 파일당 8 MiB, 판매글당 8장으로 제한한다. 파일명 traversal, MIME/확장자 불일치, 비정상 치수를 거부한다. 서버는 bucket을 생성하거나 공개로 바꾸지 않는다. 승인 전 public image exposure는 0이다.

- bucket apply: 0
- remote Storage mutation: 0

## Privacy and public reads

판매자의 연락처는 별도 테이블에 두고 `public_opt_in` 기본값을 false로 둔다. 공개 목록과 상세 read model은 연락처를 제거하며 `ACTIVE`만 노출한다. `SUBMITTED`, `RESERVED`, `REJECTED`, `SOLD`, `HIDDEN`은 공개 조회에서 제외한다.

## Feature flags

- `MARKET_BACKEND_ENABLED`: 정확히 `true`일 때만 backend repository를 연다.
- `MARKET_IMAGE_UPLOAD_ENABLED`: 정확히 `true`일 때만 signed upload intent를 발급한다.

두 flag는 기본 false다. Supabase 설정이나 서버 자격 증명이 불완전하면 기존 빈 production registry를 유지한다.

## Production rollout checklist

1. 식별된 local 또는 staging Supabase에 migration을 적용하고 5개 테이블, RLS, revoke/grant 상태를 재검증한다.
2. private `market-listing-staging` bucket과 seller/listing 경로 정책을 별도 검토 후 생성한다.
3. seller와 `market_admin` 테스트 계정으로 create, validate, review, lifecycle, ownership 차단 E2E를 실행한다.
4. 승인된 이미지 공개 경로와 연락처 opt-in 표현을 별도 승인한다.
5. E2E가 통과한 환경에서만 두 feature flag를 단계적으로 활성화한다.

## Verification and limitations

- targeted: 39/39 PASS
- total: 995/995 PASS
- typecheck: PASS
- lint: PASS
- build: PASS
- diff check: PASS

Migration, Auth, RLS, Storage 계약은 정적 검사와 in-memory workflow test로 검증했다. 실제 local 또는 staging Supabase가 적용되지 않았으므로 authenticated DB/Storage E2E는 후속 activation rehearsal 범위다.

결제, escrow, 배송 연동, realtime chat은 이 버전에 포함하지 않는다. production record 추가와 자동 활성화도 0이다.
