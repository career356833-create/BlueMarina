import type { FishingRegulation } from "@/lib/types/content-contract";

export default {
  kind: "regulation",
  id: "regulation-korean-rockfish-closedseason",
  slug: "korean-rockfish-regulation",
  title: "우럭 금어기 및 금지체장",
  summary:
    "우럭(Sebastes koreanus)의 금어기 및 금지체장 규정. 지역별로 상이하므로 해역별 규제 확인 필수.",
  category: "금어기·금지체장",
  body: `# 우럭 금어기 및 금지체장

## 개요

우럭의 금어기 및 금지체장은 지역별로 다르게 규제됩니다.

## 지역별 규제 현황

### 서해 (인천, 경기, 전북 해역)
- 금어기: 4월 1일 ~ 6월 30일 (산란기)
- 금지체장: 24cm 미만
- 비고: 지역 및 시기에 따라 변동 가능

### 동해 (강원, 경북 해역)
- 금어기: 지역별로 상이
- 금지체장: 24cm 미만
- 비고: 공식 규제 확인 필요

### 남해 (부산, 경남, 전남 해역)
- 금어기: 지역별로 상이
- 금지체장: 24cm 미만
- 비고: 지역별 규제 적용

## 주의사항

**본 정보는 일반적인 참고용이며, 정확한 규제는 해양수산부, 각 지방해양수산청, 지역 어촌계의 공식 고시를 반드시 확인하시기 바랍니다.**

- 규제는 매년 변경될 수 있습니다
- 특정 지역의 금어기가 다를 수 있습니다
- 선박 구획별로 규제가 다를 수 있습니다
- 레저 낚시와 상업 어업의 규제가 다릅니다

## 확인 방법

1. **해양수산부 공식 사이트**: www.mof.go.kr
2. **지방해양수산청**: 지역별 청의 공식 공시
3. **어촌계**: 지역 어촌계의 자체 규정
4. **선장/가이드**: 경험 있는 선장과 상담

## 벌칙

금어기 위반 또는 금지체장 어획 시 벌금 또는 처벌을 받을 수 있습니다.`,
  speciesId: "sebastes-koreanus",
  region: "한국 연안 (지역별 상이)",
  prohibitedLength: "24cm 미만 (지역별 상이 가능)",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  legalBasis:
    "해양수산부 고시 (매년 개정, 지역별 어촌계 규정 참고 필요)",
  sourceName: "해양수산부 공식 고시",
  sourceUrl: "https://www.mof.go.kr",
  sourceCheckedAt: "2026-07-31",
  reviewStatus: "needs_fact_check",
  published: false,
} satisfies FishingRegulation;
