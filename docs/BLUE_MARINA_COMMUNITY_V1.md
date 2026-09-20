# Blue Marina Community V1

## Decision

`COMMUNITY_V1_READY_WITH_BACKEND_LIMITATIONS`

Community V1은 바다·낚시 경험을 조황, 출조 후기, 지역 정보, 질문, 선장·업체 게시물, 자유 글로 기록하는 기반이다. 현재 production 게시물은 0건이며 local/staging 작성 흐름만 제공한다. 가상 사용자 글이나 누적 반응 수를 운영 피드에 노출하지 않는다.

## Route architecture

- `/community`: 유형·지역·검색 필터와 최신순/오래된순 피드
- `/community/[id]`: ACTIVE 글 상세, 이미지, 명시적 연결 정보, local 댓글·반응·신고 준비
- `/community/new`: 9단계 local/staging 작성 흐름

Desktop 상단 6개와 Mobile BottomNav 5개는 변경하지 않았다. Fishing Spots 화면에 보조 진입 링크만 추가했다.

## Entity model and lifecycle

`CommunityPost`, `CommunityComment`, `CommunityReaction`, `CommunityReport` 계약을 `src/lib/community`에 정의했다. 게시물 상태는 `DRAFT`, `SUBMITTED`, `ACTIVE`, `HIDDEN`, `REJECTED`, `DELETED`이고 moderation 상태는 `REVIEW_REQUIRED`, `APPROVED`, `REJECTED`, `FLAGGED`다.

작성 결과는 `SUBMITTED / REVIEW_REQUIRED`로 로컬 저장된다. automatic ACTIVE는 0이다. 댓글은 local preview, 반응은 현재 기기의 임시 상태, 신고는 `PREPARED`까지만 만든다. 서버 접수나 공개 저장을 표시하지 않는다.

`CAPTAIN_NOTICE`의 UI 명칭은 `선장/업체 게시물`이다. 인증 시스템이 없으므로 공식 공지나 인증 배지를 표시하지 않는다.

## Linked entity rules

어종, 낚시 포인트, 출조, 마켓은 기존 registry에서 제공한 exact ID를 사용자가 직접 선택할 때만 연결한다. 본문 텍스트에서 entity를 추론하지 않는다.

- Fish: `/fish?speciesId=<canonical-id>`
- Fishing Spot: `/fishing-spots/<exact-spot-id>`
- Charter: `/charters/<exact-charter-id>`
- Market: `/market/<exact-listing-id>`

Charter와 Market production registry가 비어 있으면 선택 항목도 비어 있다. 가짜 연결 대상을 만들지 않는다.

## Moderation and safety

제목·본문 길이, plain text, URL 개수, HTML/script/event handler, 이미지 규칙을 검사한다. 불법 거래, 무기·불법 약물, 보호종 불법 포획·거래, 개인정보, 협박·괴롭힘, 사기성 판매, 위험한 해상 행동 오도, 불법 조업 표현은 rule-based review flag로 기록한다.

이 flag는 법률판정, 범죄판정, 자동 삭제, 계정정지 또는 신뢰도 점수가 아니다. 모든 local submission은 검토 필요 상태를 유지한다.

## Location privacy

지역 입력은 시·도와 시·군·구 수준이다. 자유입력 GPS 필드는 제공하지 않는다. 등록 낚시 포인트는 사용자가 exact ID를 직접 선택할 때만 연결한다. 집 주소나 개인 선박 계류 위치 공개를 유도하지 않는다.

## Images and mobile UX

JPEG, PNG, WebP를 최대 10장, 장당 8 MiB까지 로컬 미리보기한다. SVG, 경로 탐색 파일명, 비정상 크기는 거부한다. 업로드 완료를 표시하지 않는다.

390×844 브라우저에서 카드 1열, 줄바꿈 가능한 제목·본문·entity chip, main CTA 최소 44px, BottomNav 여백, 수평 overflow 0을 확인했다. Community 홈과 작성 화면의 error overlay 및 console error는 0이었다.

## Future backend roadmap

후속 backend는 인증된 작성자 ownership, post submission, moderation, comment, reaction, report persistence, private image staging, audit log를 별도 migration과 API 검토로 추가해야 한다. 이 V1에서는 migration, DB apply, auth 변경, production activation을 모두 수행하지 않았다.

## Verification

- targeted: 33/33 PASS
- total: 1028/1028 PASS
- typecheck: PASS
- lint: PASS
- build: PASS
- diff check: PASS

Realtime chat, DM, follow, ranking/recommendation, 포인트 경제, 광고 기능은 포함하지 않았다.
