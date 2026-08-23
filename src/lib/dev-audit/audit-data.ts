export type AuditDesignStatus = "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "ON_HOLD";

export type AuditImplementationStatus =
  | "PLANNED"
  | "IMPLEMENTED"
  | "CONNECTED"
  | "WORKING"
  | "VERIFIED"
  | "PARTIAL"
  | "MOCK_ONLY"
  | "DISCONNECTED"
  | "BROKEN"
  | "DEAD_CODE"
  | "DEPRECATED"
  | "UNKNOWN";

export type AuditIssue = "REVIEW_REQUIRED" | "PWA_RISK" | "NONE";

export type AuditFeature = {
  featureId: string;
  category: string;
  name: string;
  route?: string;
  initialPlan: boolean;
  addedLater: boolean;
  designStatus: AuditDesignStatus;
  implementationStatus: AuditImplementationStatus;
  runtimeStatus: AuditImplementationStatus;
  relatedFiles: string[];
  evidence: string;
  issue: AuditIssue;
  recommendedAction: string;
  lastVerifiedAt?: string;
};

export type AuditRisk = {
  name: string;
  impact: string;
  evidence: string;
  recommendedAction: string;
  resolved: boolean;
};

const auditedAt = "2026-07-30";

export const auditFeatures: AuditFeature[] = [
  {
    featureId: "learning-question-bank",
    category: "면허 학습",
    name: "일반·요트 문제은행",
    route: "/study",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "WORKING",
    runtimeStatus: "VERIFIED",
    relatedFiles: ["src/data/questions.ts", "scripts/check-learning-core.cjs"],
    evidence: "일반 700문항, 요트 700문항과 ID·선택지·정답·해설 검증 통과",
    issue: "NONE",
    recommendedAction: "법령·문항 사실성은 별도 편집 검수로 관리",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-study",
    category: "면허 학습",
    name: "카테고리·태그 문제풀이",
    route: "/study",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "WORKING",
    runtimeStatus: "WORKING",
    relatedFiles: ["src/app/study/page.tsx", "src/lib/boat/questions.ts"],
    evidence: "카테고리 및 태그 조회 헬퍼가 학습 코어 검증에 포함됨",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "일반·요트별 브라우저 시나리오를 기록",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-random",
    category: "면허 학습",
    name: "랜덤 문제",
    route: "/random",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/app/random/page.tsx"],
    evidence: "면허별 무작위 선택 및 재시작 UI 소스 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "실기기 답안·재시작·면허 전환 QA",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-exam",
    category: "면허 학습",
    name: "50문항 모의고사",
    route: "/exam",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "WORKING",
    runtimeStatus: "WORKING",
    relatedFiles: ["src/app/exam/page.tsx", "src/lib/boat/exam.ts"],
    evidence: "50문항 선택과 면허별 저장 구조가 검증됨",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "제출·재응시·점수 UI 시나리오 기록",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-wrong-progress",
    category: "면허 학습",
    name: "오답노트·진도율",
    route: "/wrong",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "WORKING",
    runtimeStatus: "VERIFIED",
    relatedFiles: ["src/app/wrong/page.tsx", "src/app/progress/progress-client.tsx", "src/lib/boat/storage.ts"],
    evidence: "오답·진도·이력·초기화의 면허별 분리가 자동 검증됨",
    issue: "NONE",
    recommendedAction: "새로고침 후 화면 값 수동 확인",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-analysis",
    category: "면허 학습",
    name: "학습 분석·취약 추천",
    route: "/analysis",
    initialPlan: true,
    addedLater: true,
    designStatus: "COMPLETED",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/app/analysis/analysis-client.tsx", "src/lib/boat/weakness.ts"],
    evidence: "카테고리 정답률, 약점 태그, 추천 문제 계산 코드 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "실제 이력 데이터로 추천 링크 검증",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-theory",
    category: "면허 학습",
    name: "이론 학습",
    route: "/theory",
    initialPlan: true,
    addedLater: false,
    designStatus: "COMPLETED",
    implementationStatus: "WORKING",
    runtimeStatus: "VERIFIED",
    relatedFiles: ["src/data/theories.ts", "src/app/theory/page.tsx"],
    evidence: "30개 이론 항목이 ready 상태인지 학습 코어 검증 통과",
    issue: "NONE",
    recommendedAction: "공식 기준 변경 시 콘텐츠 편집 검수",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "learning-supabase-sync",
    category: "면허 학습",
    name: "Supabase 학습 동기화",
    route: "/progress",
    initialPlan: false,
    addedLater: true,
    designStatus: "IN_REVIEW",
    implementationStatus: "CONNECTED",
    runtimeStatus: "PARTIAL",
    relatedFiles: ["src/lib/boat/supabase-sync.ts", "src/lib/boat/storage.ts"],
    evidence: "환경변수·사용자 부재 시 안전하게 건너뛰는 테스트 통과",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "로그인·DB 스키마·충돌 처리 실환경 검증",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "sea-tide",
    category: "해양 포털",
    name: "KHOA 조석 정보",
    route: "/sea-info",
    initialPlan: false,
    addedLater: true,
    designStatus: "COMPLETED",
    implementationStatus: "CONNECTED",
    runtimeStatus: "PARTIAL",
    relatedFiles: ["src/app/api/sea-info/tide/route.ts", "src/lib/sea-info/tide-normalize.ts"],
    evidence: "서버 라우트·정규화·키 누락 오류 처리 구조 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "관측소 코드와 운영 키 상태를 별도 확인",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "sea-forecast",
    category: "해양 포털",
    name: "KMA 소해구 예보",
    route: "/sea-info",
    initialPlan: false,
    addedLater: true,
    designStatus: "IN_REVIEW",
    implementationStatus: "CONNECTED",
    runtimeStatus: "PARTIAL",
    relatedFiles: ["src/app/api/sea-info/marine-forecast/route.ts", "src/lib/sea-info/kma-marine-zone.ts"],
    evidence: "CSV 파서와 해구 매핑 엔진 존재, 유효 zone 확정은 별도 과제",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "공식 API가 허용하는 Lzone/Szone을 검증",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "sea-map",
    category: "해양 포털",
    name: "바다 지도·GPS·레이어",
    route: "/sea",
    initialPlan: false,
    addedLater: true,
    designStatus: "IN_REVIEW",
    implementationStatus: "CONNECTED",
    runtimeStatus: "PARTIAL",
    relatedFiles: ["src/components/sea/MapView.tsx", "src/lib/sea/kakao-maps.ts"],
    evidence: "Kakao SDK, 위치 권한, 낚시포인트·3종 어항 레이어 코드 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "모바일·배포 도메인·마커 성능을 다시 검증",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "fishing-spots",
    category: "해양 포털",
    name: "출조거점 검색",
    route: "/fishing-spots",
    initialPlan: false,
    addedLater: true,
    designStatus: "COMPLETED",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/data/fishing-spots.json", "src/app/fishing-spots/fishing-spots-client.tsx"],
    evidence: "1,405개 정적 데이터와 검색 UI 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "데이터 품질과 검색 시나리오 점검",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "centers",
    category: "해양 포털",
    name: "시험장·교육장 센터",
    route: "/centers",
    initialPlan: true,
    addedLater: true,
    designStatus: "COMPLETED",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/data/marine-centers.ts", "src/app/centers/page.tsx"],
    evidence: "127개 시설 데이터와 필터·검색 코드 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "공식 링크·주소·좌표 보강을 별도 추적",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "reference-centers",
    category: "해양 포털",
    name: "어종·용어·보트·해양지식·FAQ",
    route: "/fish",
    initialPlan: false,
    addedLater: true,
    designStatus: "COMPLETED",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/app/fish/page.tsx", "src/app/dictionary/page.tsx", "src/app/boatpedia/page.tsx"],
    evidence: "정적 데이터 기반 검색·필터·상세 펼침 구조 존재",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "콘텐츠 정확성·출처·중복 편집 감사",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "pwa",
    category: "PWA",
    name: "Manifest·서비스워커·오프라인",
    route: "/",
    initialPlan: true,
    addedLater: false,
    designStatus: "IN_REVIEW",
    implementationStatus: "IMPLEMENTED",
    runtimeStatus: "PARTIAL",
    relatedFiles: ["public/manifest.json", "public/sw.js", "src/components/PwaRegister.tsx"],
    evidence: "manifest, icon, production SW 등록 코드 존재",
    issue: "PWA_RISK",
    recommendedAction: "stale bundle, 설치, 업데이트, 오프라인 기기 QA",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "catch-booking-market",
    category: "확장 기능",
    name: "조황·예약·방송·마켓·선장",
    route: "/coming-soon",
    initialPlan: false,
    addedLater: true,
    designStatus: "IN_PROGRESS",
    implementationStatus: "MOCK_ONLY",
    runtimeStatus: "MOCK_ONLY",
    relatedFiles: ["src/components/boat/home/HomeLanding.tsx", "src/app/coming-soon/page.tsx"],
    evidence: "홈 진입점이 Coming Soon 페이지로 연결됨",
    issue: "NONE",
    recommendedAction: "실제 데이터·정책·백엔드 승인 뒤 독립 구현",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "legacy-content-subsystem",
    category: "정리 후보",
    name: "기존 콘텐츠 스튜디오·대시보드·저장 목록",
    initialPlan: false,
    addedLater: false,
    designStatus: "ON_HOLD",
    implementationStatus: "DEAD_CODE",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/components/content", "src/components/dashboard", "src/lib/local-store.ts"],
    evidence: "Blue Marina 라우트에서 직접 소비 근거를 찾지 못함",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "동적 import까지 포함한 도달성 확인 후 처리",
    lastVerifiedAt: auditedAt
  },
  {
    featureId: "ai-stripe",
    category: "정리 후보",
    name: "AI Provider·Stripe 설정",
    initialPlan: false,
    addedLater: false,
    designStatus: "ON_HOLD",
    implementationStatus: "DISCONNECTED",
    runtimeStatus: "UNKNOWN",
    relatedFiles: ["src/lib/ai", "src/lib/stripe/config.ts"],
    evidence: "감사한 Blue Marina 라우트의 소비·결제 흐름 근거 없음",
    issue: "REVIEW_REQUIRED",
    recommendedAction: "향후 역할을 확정하기 전 삭제하지 않음",
    lastVerifiedAt: auditedAt
  }
];

export const auditRisks: AuditRisk[] = [
  {
    name: "한글 문자열 인코딩",
    impact: "사용자 화면과 매니페스트 텍스트가 깨질 수 있음",
    evidence: "최근 화면 제보 및 일부 소스/매니페스트 감사 출력",
    recommendedAction: "UTF-8 소스·빌드·기기 화면을 한 묶음으로 검증",
    resolved: false
  },
  {
    name: "Service Worker stale bundle",
    impact: "새 배포 뒤 오래된 JS/CSS가 로드되어 런타임 오류 가능",
    evidence: "public/sw.js의 정적 캐시명과 cache-first Next asset 전략",
    recommendedAction: "설치·업데이트·오프라인·강제 새로고침 QA",
    resolved: false
  },
  {
    name: "지도·GPS 현장 검증",
    impact: "배포 도메인 SDK 또는 모바일 권한에서 지도가 실패할 수 있음",
    evidence: "Kakao SDK·권한·레이어 구조는 있으나 재현 가능한 기기 기록 부족",
    recommendedAction: "iOS/Android 및 배포 도메인에서 권한·마커·성능 확인",
    resolved: false
  },
  {
    name: "Coming Soon 진입점",
    impact: "완성 기능으로 오인될 수 있음",
    evidence: "홈의 조황·예약·방송·마켓·선장 진입점이 placeholder로 연결",
    recommendedAction: "출시 메시지와 메뉴 우선순위를 검토",
    resolved: false
  }
];

export const auditChecks = [
  { name: "학습 코어", command: "npm run check:learning-core", status: "passed", detail: "1,400문항·이론·헬퍼 검증 통과" },
  { name: "학습 저장소", command: "npm run check:learning-storage", status: "passed", detail: "면허별 이력·오답·초기화 분리 검증 통과" },
  { name: "TypeScript", command: "npm run typecheck", status: "passed", detail: "타입 검사 통과" },
  { name: "Lint", command: "npm run lint", status: "passed", detail: "ESLint 통과" },
  { name: "Production build", command: "npm run build", status: "passed", detail: "40개 정적 페이지 생성 완료" }
] as const;

export function getAuditIssueCount() {
  const featureIssues = auditFeatures.filter(
    (feature) =>
      feature.implementationStatus === "BROKEN" ||
      feature.implementationStatus === "DISCONNECTED" ||
      feature.implementationStatus === "MOCK_ONLY" ||
      feature.implementationStatus === "DEAD_CODE" ||
      feature.issue !== "NONE"
  ).length;
  return featureIssues + auditRisks.filter((risk) => !risk.resolved).length;
}

export const devAuditEnabled =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_DEV_AUDIT === "true";
