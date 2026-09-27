# Blue Marina Charter Partner Acquisition V1

**판정: `CHARTER_PARTNER_ACQUISITION_V1_READY_WITH_LIMITATIONS`.** 업체가 등록을 준비할 수 있는 공개 안내·CSV·문안·검토 패키지를 구축했다. 실제 공급자 연락, 승인, 게시, 백엔드 활성화는 하지 않았다. 기존 Verified Supply Pilot의 5개 업체·12개 조사 상품은 모두 `REVIEW_REQUIRED`이며 공개 후보 0건이다.

## 모집 및 제출

`/charters/partners`는 출조업체 대상 공개 안내 페이지다. `/charters`의 빈 상태에서 연결하며, 직접 입력은 기존 `/charters/onboarding`, CSV는 기존 bulk import dry-run과 supply staging contract를 사용한다. 새 공급자 시스템은 만들지 않았다. CSV 다운로드는 `/charters/partners/template.csv`이고 원본은 `data/charters/templates/charter-partner-pilot-template.csv`다. 예시 행은 `DEMO_PLACEHOLDER`이며 실제 업체처럼 보이는 가짜 정보는 없다.

파트너 페이지는 등록 범위, 준비 자료, 제출 경로, 검토 순서, FAQ 9개, 문의 준비 상태를 설명한다. 현재 공개 제휴 연락처가 없어 이메일·전화 CTA나 가짜 문의 접수는 두지 않았다. 직접 제출은 로그인과 활성화된 intake backend가 필요한 기존 흐름에 의존한다. CSV는 파서 필수 열을 모두 포함하지만 `business_name`과 `notes`는 작성 보조용이며 현재 파서가 저장하지 않는다. 이를 제출 가이드에 명시했다.

SEO는 공개 모집 페이지로 판단해 `noindex`를 설정하지 않고 canonical metadata와 제목·설명을 제공한다. `/charters`의 공개 빈 상태에서 연결된다. 기존 sitemap의 정적 경로 19개와 총 1,424개 URL 검증을 유지하기 위해 이번 배치에서는 sitemap 항목을 늘리지 않았다.

## 연락 및 운영

연락 문안은 전화·문자·이메일·카카오톡/DM 네 형태다. 실제 발송은 하지 않았다. 1페이지 제휴 소개 원고와 관리자 검토 체크리스트를 함께 준비했다. `data/charters/partners/v1/partner-outreach-tracker.csv`는 헤더만 있는 빈 tracker다. 10~30개 업체가 파일럿 대상 범위이며, `CONTACTED`는 실제 연락 후에만 입력한다.

## 공개 동의와 검토

기존 onboarding에 업체·상품 정보 및 제공한 전화·공식 예약 링크의 승인 후 공개 가능성을 알리는 확인 체크를 추가했다. 수정·게시 중단 요청과 부정확 정보의 비노출 가능성도 알린다. 이 체크는 현재 클라이언트 상태이며 **서버에 동의 이력이나 서명을 남기지 않는다.** 따라서 관리자에게는 별도의 공급자 공개 승인 근거 확인이 필요하다. 개인정보를 과도하게 제출하지 않도록 안내한다.

관리자는 업체 신원, 연락 경로, 선박·출항항, 상품·어종, 가격·일정, MOF crosswalk, 중복·충돌, 출처, 공개 동의를 검토한다. 공급자 제출 또는 명시 승인, 출처, 명확한 신원, 연락 경로, 중요 충돌 0, 관리자 검토가 공개 후보 최소 조건이다. 기존 `APPROVED`는 promotion candidate까지이며 자동 Production 게시가 아니다. 사업 모델 후보는 향후 featured placement, qualified lead fee, subscription, booking integration이지만 현재 가격 정책으로 정하지 않았다.

## 파일럿 KPI

실제 실적은 연락 0, 관심 0, 제출 0, 승인 0, 게시 0이다. 운영 목표 예시는 업체 20곳 연락, 5곳 응답, 3곳 제출, 3~10개 상품 공개다. 별도로 접촉 업체 수, 관심, 제출, 승인, 게시, 연락 CTA 클릭을 계측 항목으로 정의했다. 이 수치는 **목표**이며 현재 성과가 아니다. 기존 analytics 연동이 확인되지 않아 새 vendor나 이벤트 송신 코드는 추가하지 않았다.

## 제한 및 경계

백엔드·실제 제휴 연락 채널이 준비되지 않은 환경에서는 제출 또는 문의를 완료할 수 없다. 공개 listing 0, 실제 연락 0, DB/Supabase apply 0, Production deploy 0이다. 자동 인증·실시간 좌석·예약 확정·매출 보장 문구는 없다. 파일럿 운영 정책, 연락 경로, 동의 증빙 저장을 갖춘 뒤 실제 모집을 시작해야 한다.

검증: 신규 대상 테스트 8/8, 전체 1250/1250, typecheck, lint, build, diff check 통과. 로컬 페이지와 직접 등록 CTA를 데스크톱 브라우저에서 확인했고 CSV 다운로드는 HTTP 200 및 attachment 헤더를 확인했다. 브라우저 도구에서 390px viewport 전환을 사용할 수 없어 모바일 실화면은 미검증이며, 배포 전 해당 크기에서 overflow·FAQ·CTA를 재확인해야 한다.
