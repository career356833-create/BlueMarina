import type { FishingRegulation } from "@/lib/types/content-contract";

export default {
  kind: "regulation",
  id: "regulation-japanese-flounder-closedseason",
  slug: "japanese-flounder-regulation",
  title: "광어 금어기 및 금지체장",
  summary:
    "광어(Paralichthys olivaceus)의 금어기 및 금지체장 규정. 겨울 산란기 금어기와 금지체장 24cm 미만.",
  category: "금어기·금지체장",
  body: `# 광어 금어기 및 금지체장

## 개요

광어의 금어기 및 금지체장은 겨울 산란기 보호를 중심으로 규제됩니다.

## 전국 공통 규제

### 금지체장
- **최소 어획 크기**: 24cm 이상
- **24cm 미만**: 포획·판매 금지
- **적용**: 전국 모든 해역

### 금어기
- **기본**: 12월 1일 ~ 2월 28일 (지역별로 상이할 수 있음)
- **산란기 보호**: 겨울 산란기 개체 보호
- **지역 차이**: 남해 등 일부 지역에서는 상이 가능

## 지역별 추가 규제

### 남해 (부산, 경남, 전남)
- 금어기: 12월 1일 ~ 2월 28일
- 금지체장: 24cm 미만
- 비고: 지역별 조정 가능

### 동해 (강원, 경북)
- 금어기: 지역별 상이
- 금지체장: 24cm 미만

### 서해 (인천, 경기, 전북)
- 금어기: 지역별 상이
- 금지체장: 24cm 미만

## 주의사항

**본 정보는 일반적인 참고용이며, 정확한 규제는 해양수산부, 각 지방해양수산청의 공식 고시를 반드시 확인하시기 바랍니다.**

- 매년 규제가 변경될 수 있습니다
- 특정 지역의 금어기가 더 길 수 있습니다
- 수산자원 상태에 따라 규제 강화 가능
- 상업 어업과 레저 낚시 규제가 다를 수 있습니다

## 확인 방법

1. **해양수산부**: www.mof.go.kr
2. **지방해양수산청**: 지역별 공식 고시
3. **어촌계**: 지역 규정
4. **선박 선장**: 선낚이 시 반드시 확인

## 벌칙

금어기 위반, 금지체장 어획, 미보고 판매 등의 위반 시 벌금 또는 처벌을 받습니다.`,
  speciesId: "paralichthys-olivaceus",
  region: "한국 전해역 (12월-2월 금어기)",
  prohibitedLength: "24cm 미만",
  closedSeason: "12월 1일 ~ 2월 28일 (기본, 지역별 상이)",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  legalBasis: "해양수산부 고시",
  sourceName: "해양수산부 수산자원 관리",
  sourceUrl: "https://www.mof.go.kr",
  sourceCheckedAt: "2026-07-31",
  reviewStatus: "needs_fact_check",
  published: false,
} satisfies FishingRegulation;
