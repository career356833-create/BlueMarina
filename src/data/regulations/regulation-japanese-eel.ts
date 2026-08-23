import type { FishingRegulation } from "@/lib/types/content-contract";

export default {
  kind: "regulation",
  id: "regulation-japanese-eel-closedseason",
  slug: "japanese-eel-regulation",
  title: "갈치 금어기 및 금지체장",
  summary:
    "갈치(Trichiurus lepturus)의 금어기 및 금지체장 규정. 연중 낚시 가능하나 금지체장은 12cm 이상.",
  category: "금어기·금지체장",
  body: `# 갈치 금어기 및 금지체장

## 개요

갈치의 금지체장 규제는 전국적으로 통일되며, 연중 낚시가 가능합니다.

## 전국 공통 규제

### 금지체장
- **최소 어획 크기**: 12cm 이상
- **12cm 미만**: 포획·판매 금지
- **측정 방법**: 머리 끝에서 꼬리 끝까지
- **적용**: 전국 모든 해역

### 금어기
- **레저 낚시**: 특정 금어기 없음 (연중 가능)
- **상업 어업**: 지역별, 어법별 상이 가능
- **비고**: 레저 낚시와 상업 어업 규제 다름

## 지역별 상황

### 남해권 (부산, 경남, 전남)
- 가장 많이 서식하는 지역
- 연중 낚시 가능
- 7-9월 성수기

### 동해권 (강원, 경북)
- 서식량 적음
- 연중 가능하나 시즌 제한 있을 수 있음

### 서해권 (인천, 경기, 전북)
- 서식량 제한적
- 지역별 규제 확인 필요

## 주의사항

**본 정보는 일반적인 참고용이며, 정확한 규제는 해양수산부, 각 지방해양수산청의 공식 고시를 반드시 확인하시기 바랍니다.**

- 금지체장은 정기적으로 검토됩니다
- 상업 어업 규제는 더 엄격할 수 있습니다
- 특정 어업 구획에서 제한 가능
- 자원 상태에 따라 변경 가능

## 확인 방법

1. **해양수산부**: www.mof.go.kr
2. **지방해양수산청**: 지역별 공식 고시
3. **어촌계**: 지역 규정 확인
4. **낚시 가이드**: 현지 가이드와 상담

## 벌칙

금지체장 미만 어획, 판매, 유통 시 벌금을 받을 수 있습니다.

## 낚시 실무

- 낚시 중 12cm 미만 개체는 즉시 방류
- 어획 후 개별 측정 및 기록 권장
- 상업 판매 시 정부 인증 필요`,
  speciesId: "trichiurus-lepturus",
  region: "한국 전해역",
  prohibitedLength: "12cm 미만",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  legalBasis: "해양수산부 고시",
  sourceName: "해양수산부 수산자원 관리",
  sourceUrl: "https://www.mof.go.kr",
  sourceCheckedAt: "2026-07-31",
  reviewStatus: "needs_fact_check",
  published: false,
} satisfies FishingRegulation;
