# Fishing Condition RISA Production Activation V1

**Decision: `RISA_PRODUCTION_ACTIVATION_COMPLETE_WITH_LIMITATIONS`.** Production에서 NIFS RISA 관측을 활성화했다. FEMO는 계속 비활성이다. 관측 자료가 오래되었으면 `STALE`로 표시하고, 어종 생태 정보와 자동 비교하거나 조황을 판정하지 않는다.

## 브랜치 분리와 배포

`codex/risa-preview-observability-v1`의 두 커밋(`98510104`, `6198a3fb`)을 `main`과 실제 diff로 비교했다. 캐시, 인스턴스 내 in-flight 중복 요청 합치기, 자료원 상태, 실패 격리와 서버 전용 키 경계는 이미 `main`에 있다. 브랜치의 런타임 diff는 `VERCEL_ENV=preview`와 `RISA_OBSERVABILITY_DEBUG=true`가 함께 있을 때만 기록하는 진단 로그다. Production에는 이 debug 코드와 이에 결합된 테스트를 반영하지 않았다. Preview 측정 report/docs는 검증 브랜치에 보존하고, 필요한 수치와 제한은 이 최종 증빙에 기록했다. 새 런타임 코드 커밋은 없다.

Production에는 사용자 승인 후 기존 Preview의 `NIFS_RISA_API_KEY` Secret 적용 범위를 Vercel 설정 화면에서 Production까지 확장했다. 비밀값을 읽거나 기록하지 않았다. `NIFS_REALTIME_FISHING_ENABLED=true`를 Production에 설정했다. Production의 `NIFS_FISHERY_ENVIRONMENT_ENABLED`와 `RISA_OBSERVABILITY_DEBUG`는 미등록 상태이며, 다른 환경변수는 변경하지 않았다.

기존 clean pushed `main` SHA `4fdfefea7cd22912feece1bad5c7d01da22e05f7`의 Production 배포를 새 환경변수로 재배포했다. 새 배포 `dpl_GbWhAn7nQYtYRD57LkTfr9PwziZe`는 `READY`이고, Vercel deployment API에서 동일한 Git SHA를 확인했다. 로컬 worktree의 unrelated 변경은 배포에 포함하지 않았다.

## Production smoke

`/api/fishing-condition/environment/realtime`은 HTTP 200으로 관측소 41개, 관측행 65개를 반환했다. 최신 NIFS 표본의 자료원 시각은 `2026-09-26T13:30:00`이며 시간대는 `UNSPECIFIED_BY_NIFS`다. 현재 최신성 정책상 `STALE`이다. 기장(`bgj8a`) 표층의 표시 수온은 `24.2 °C`였다. 이어진 소수의 반복 조회는 HTTP 200이며 Vercel CDN `HIT`였다. 응답 본문의 `fresh_fetch`는 CDN이 원래 본문을 재전달한 것이므로 새로운 upstream fetch의 증거로 해석하지 않는다.

명시적으로 선택한 감성돔·9월·기장·표층 read-model은 HTTP 200 `PARTIAL`이다. `profileContext`, 계절성 및 RISA `observationContext`가 존재하며 RISA 상태는 `STALE`, FEMO 상태는 `DISABLED`다. 어종을 농어로 변경해도 기장·표층 선택은 유지됐고 캐시 조회로 결과가 나왔다. FEMO 독립 API는 HTTP 503 `SOURCE_DISABLED`를 유지했다. Production에 upstream 장애를 의도적으로 주입하지 않았고, 기존 주입 테스트는 RISA 실패 시 profile과 seasonality를 보존한 200 `PARTIAL`을 검증한다.

실제 Production 화면에서 38종 selector, 정점·수심 선택, 관측 시각·시간대 미확인·오래된 관측 안내, 별도의 어종 참고 정보와 제한 문구를 확인했다. 390×844 viewport의 문서 너비는 375px로 가로 넘침이 없었고 관측 카드와 하단 내비게이션이 겹치지 않았다. 데스크톱 표시도 확인했다. 관찰한 브라우저 콘솔 오류와 경고는 각각 0건이다.

새 배포의 짧은 로그 창에서 36개 요청 중 Conditions 관련 14개를 확인했다. 예상 밖 5xx 0건, runtime error 0건, retry storm 0건이다. FEMO 비활성 확인 때문에 발생한 503 세 건은 예상된 응답이다. Production에는 upstream fetch 개별 계측을 넣지 않았다. 이전 Preview의 cold 동시 5요청은 4개 서버리스 인스턴스에서 NIFS endpoint 8호출을 만들었으므로 cross-instance dedupe는 보장하지 않는다. NIFS quota와 비용도 `QUOTA_UNKNOWN`이다.

키 이름과 NIFS 직접 호출 흔적을 찾는 Production HTML 및 해당 HTML이 참조한 JS 18개 검사에서 노출 0건이었다. 이는 전체 브라우저 fetch/XHR 캡처를 대체하지 않는다. 서버 전용 adapter와 UI 소스도 비밀 키가 클라이언트로 내려가지 않는 경계다.

## 안전 경계와 롤백

자동 comparator, 점수, 순위, 확률, Fishing Spot에서 최근접 관측소 추론은 모두 0이다. 현재 관측 사실과 어종별 참고 근거를 분리한다. 자료원의 시각을 임의로 한국 시간대로 확정하지 않는다. FEMO 활성화와 DB/Supabase 적용도 0이다.

관측 API 반복 5xx, Conditions 전체 5xx, NIFS 재시도 폭증, 키 노출, UI crash, 자동 판정 회귀, 심각한 지연 또는 응답 schema 파손 시 Production의 `NIFS_REALTIME_FISHING_ENABLED=false`를 먼저 적용하고 clean main SHA로 재배포한다. 이번 짧은 관찰에서 trigger는 없었으므로 롤백은 수행하지 않았다.

최종 수치와 검증 결과는 [report](../reports/fishing-condition/risa-production-activation-final-v1.json)에 기록한다. 알려진 제한은 NIFS quota 미확인, cross-instance 중복 호출 가능성, 자료원 시간대 미문서화, 현재 표본의 `STALE`, Production 개별 upstream 호출 수 미계측, 전체 fetch/XHR 캡처 및 Production 장애 주입 미수행이다.
