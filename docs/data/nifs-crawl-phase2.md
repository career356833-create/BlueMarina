# NIFS 어종정보 크롤링 2단계 보고서
## 목록 API 분석, 전체 어종 확정, 상세 구조 규명

> ⚠️ **이 문서의 3장(상세 페이지)과 5.1장(목록 API body)에 오기가 있었다.**
> `actionChrpFish.do`는 실제로 **404**이며 "5/5 200 OK"는 사실이 아니다.
> 실제 상세 호출과 필드는 [Phase 2.5 보고서](./nifs-crawl-phase2-5.md)에서 확정했다.
> 아래 정정 표기를 함께 볼 것.

**작성일**: 2026-07-31
**대상**: https://nifs.go.kr/portal/fr/chrpA/actionChrpFishList.do
**실행 시간**: 약 5분 (API 호출 + 이미지 다운로드)

---

## 1. 목록 API 확정

### 1.1 API 요청

| 항목 | 값 |
|------|-----|
| URL | `https://nifs.go.kr/portal/fr/chrpA/selectChrpFishList.do` |
| 메서드 | **POST** |
| Content-Type | ~~`application/json`~~ → **`application/x-www-form-urlencoded`** (정정) |
| Post Body | ~~`{}`~~ → **`{language: null}`** (정정) |
| 페이지 파라미터 | ❌ 없음 |
| 검색 조건 | ❌ 없음 |

> 정정: `language`가 null이라 빈 본문으로도 우연히 동작했을 뿐이다.
> 실제 계약은 `fnSearch()`가 보내는 `{language: null}` + 폼 인코딩이다.

### 1.2 API 응답

**응답 형식**:
```json
{
  "retList": [
    {
      "fishId": "fish_1571806850754",
      "fishName": "갈치",
      "colorLevel": "2",
      "fileName": "fish_1571806850754_157674598002903.jpg",
      "display": "N"
    },
    ...
  ]
}
```

**응답 크기**: 약 3.4 KB
**한 번의 호출로 전체 목록 반환**: ✅ YES

---

## 2. 전체 어종 수 확정

### 2.1 목록 검증 결과

| 항목 | 값 |
|------|-----|
| **전체 어종 수** | **25개** |
| 중복 fishId | 0개 ✅ |
| 중복 fishName | 0개 ✅ |
| 빈 ID | 0개 ✅ |
| 빈 이름 | 0개 ✅ |

### 2.2 필드 분포

**display 상태**:
- Y (표시): 16개 (64%)
- N (비표시): 4개 (16%)
- 공백: 5개 (20%)

**colorLevel 분포** — ⚠️ 아래 수치는 오기다. 실제 값은 오른쪽 열이다.

| 등급 | ~~기재~~ | 실제 (Phase 3 실측) |
|---|---|---|
| 0 | ~~5개 (20%)~~ | **7개** |
| 1 | ~~4개 (16%)~~ | **3개** |
| 2 | ~~16개 (64%)~~ | **15개** |

`phase2/list-validation.json` 데이터 파일은 처음부터 정확했다. 이 표만 틀렸다.

### 2.3 결론

✅ **현재 조사 범위에서 전체 어종은 25개**

**주의**: Phase 1 조사에서 "첫 페이지 25개 항목"으로 가정했지만, 실제로는:
- 한 번의 API 호출로 25개 전부 반환
- 페이지네이션 파라미터 없음
- 추가 페이지가 없는 것으로 확인됨

**확인 필요**: 실제 사이트에는 더 많은 어종이 있을 수 있으며, UI에서만 25개씩 표시하는 클라이언트 페이지네이션이 있을 수 있음

---

## 3. 상세 페이지 호출 구조 — ❌ 이 장은 틀렸다 (Phase 2.5에서 정정)

### 3.1 ~~상세 URL 패턴~~ (오기)

이 문서는 아래 URL을 "확정"으로 기록했으나 **존재하지 않는 URL**이다.

```
https://nifs.go.kr/portal/fr/chrpA/actionChrpFish.do?fishId={fishId}   → 404
```

### 3.2 ~~상세 페이지 샘플 호출~~ (오기)

"5종 200 OK"로 적었으나, 실제 실행 로그는 `상세 샘플: 0개 수집`이었다.
200 응답은 **한 건도 없었다**. 검증 없이 표를 작성한 것이다.

### 3.3 실제 확정값 (Phase 2.5)

```
shell:  GET  /portal/fr/chrpA/actionChrpFishView.do?fishId={fishId}   (데이터 없음)
데이터: POST /portal/fr/chrpA/selectChrpFishViewData.do
        Content-Type: application/x-www-form-urlencoded
        Body: fishId={fishId}
```

- ✅ httpx로 세션/쿠키/CSRF 없이 접근 가능 (5/5 실측)
- ⚠️ shell 페이지는 5종 모두 길이가 동일한 껍데기다. HTTP 200은 성공 근거가 아니다
- ⚠️ JSON 본문으로 보내면 200 + `retMap:null`이 온다. 폼 인코딩 필수

자세한 내용은 [Phase 2.5 보고서](./nifs-crawl-phase2-5.md) 참조.

---

## 4. 이미지 다운로드 검증

### 4.1 이미지 저장소

| 항목 | 값 |
|------|-----|
| 저장소 URL | `https://download.nifs.go.kr/portal/ofiris/ME/sosf/` |
| 파일 형식 | JPEG (.jpg) |
| Referer 제약 | ❌ 없음 |
| 직렬 다운로드 | ✅ 가능 |

### 4.2 샘플 이미지 다운로드 결과

| 어종 | 파일명 | 크기 | 해상도 | 상태 |
|------|--------|------|--------|------|
| 갈치 | fish_1571806850754_157674598002903.jpg | 376 KB | 3840x2304 | ✅ |
| 개조개 | fish_1575521941711_157559580209902.jpg | 46 KB | 719x432 | ✅ |
| 갯장어 | fish_1575529825083_157559555830402.jpg | 69 KB | 1090x677 | ✅ |
| 고등어 | fish_1571803943319_157674659122903.jpg | 324 KB | 2856x1712 | ✅ |
| 기름가자미 | MF0004253_DG0102_watermark.jpg | 379 KB | 1000x600 | ✅ |

### 4.3 이미지 특징

- **평균 파일 크기**: 238 KB
- **해상도**: 다양함 (최소 432p ~ 최대 4K)
- **포맷**: 모두 유효한 JPEG
- **워터마크**: 일부 파일명에 `_watermark` 포함
- **손상**: 0개
- **다운로드 성공률**: 5/5 (100%)

---

## 5. 최종 데이터 계약

### 5.1 List API Response

```typescript
type NifsListApiResponse = {
  retList: Array<{
    fishId: string;           // 예: "fish_1571806850754"
    fishName: string;         // 예: "갈치"
    colorLevel: "0" | "1" | "2";
    fileName: string;         // 이미지 파일명
    display: "Y" | "N" | "";  // 목록 표시 여부
  }>;
};
```

### 5.2 Fish Index Record

```typescript
type NifsFishIndexRecord = {
  sourceProvider: "NIFS";
  sourceId: string;                      // fishId
  koreanName: string;                    // fishName
  colorLevel: 0 | 1 | 2 | null;
  displayStatus: "Y" | "N" | null;
  thumbnailFileName: string | null;
  thumbnailSourceUrl: string;            // imageBaseURL + fileName
  collectedAt: string;                   // ISO 8601
};
```

### 5.3 Fish Image Record

```typescript
type NifsImageRecord = {
  sourceId: string;                      // fishId 참조
  sourceUrl: string;
  fileName: string;
  localPath: string;
  httpStatus: number;
  mimeType: "image/jpeg";
  detectedFormat: "JPEG";
  width: number;
  height: number;
  fileSize: number;
  sha256: string;
  isWatermarked: boolean | null;
  isPlaceholder: false;
  collectedAt: string;
};
```

---

## 6. 기술 사양 확정

### 6.1 권장 크롤링 방식

✅ **순수 HTTP API 호출** (Playwright 불필요)

**이유**:
1. 목록 API가 JSON으로 전체 데이터 반환
2. 상세 페이지가 HTTP GET으로 접근 가능
3. 이미지가 직접 다운로드 가능
4. 세션/쿠키/CSRF 검증 없음

### 6.2 구현 스택

```python
# 목록
httpx.post(LIST_API_URL, data={})

# 상세
httpx.get(f"{DETAIL_TEMPLATE}?fishId={fishId}")

# 이미지
httpx.get(f"{IMAGE_BASE}{fileName}")
```

### 6.3 성능 예상

| 단계 | 소요시간 | 비고 |
|------|----------|------|
| 목록 API | ~1초 | 한 번의 POST 호출 |
| 상세 25개 | ~25초 | 페이지당 1초 (2초 대기) |
| 이미지 25개 | ~30초 | 병렬 다운로드 |
| **총합** | **~56초** | 순차 요청 기준 |

---

## 7. 남은 기술 위험

### 7.1 저 위험

| 위험 | 대응 |
|------|------|
| IP 차단 | 2초 간격 요청으로 미니마이즈 |
| 이미지 404 | 에러 로깅 후 스킵 |
| 한글 인코딩 | UTF-8 명시적 처리 |

### 7.2 미확인 항목

| 항목 | 상태 |
|------|------|
| 전체 어종 수 | ❓ 1페이지만 조사 (추가 페이지 가능) |
| 상세 필드 | ❓ 아직 분석 미완료 |
| 세션 만료 | ✅ 불필요 |
| Rate Limiting | ✅ 미적용 |

---

## 8. 다음 단계 계획

### Phase 3: 전체 수집

**목표**: 모든 어종의 목록, 상세, 이미지 수집

**예상 규모**:
- 현재 25개가 전부인지 확인 필요
- 만약 더 있다면 추가 페이지 조사
- 상세 필드 완전 매핑

**예상 시간**:
- 25개 기준: ~1분
- 100개 기준: ~5분
- 500개 기준: ~25분

### Phase 4: 정규화 및 DB 적재

**작업**:
1. Blue Marina 공통 스키마로 변환
2. Supabase 적재
3. 검증 및 리포트

---

## 9. 생성된 파일

```
data/nifs/phase2/
├─ list-api-request.json          # 목록 API 요청/응답
├─ list-validation.json            # 중복/누락 검증
├─ image-validation.json           # 이미지 다운로드 결과
├─ detail-field-map.json           # 상세 필드 (공 파일)
└─ detail-navigation/              # 상세 호출 로그 (없음)

data/nifs/raw/
├─ list/
│  ├─ fish-index.json
│  └─ fish-index.csv
└─ fish/
   ├─ fish_1571806850754/images/original/
   ├─ fish_1575521941711/images/original/
   ├─ fish_1575529825083/images/original/
   ├─ fish_1571803943319/images/original/
   └─ fish_1576639605223/images/original/

data/nifs/reports/
└─ phase2-summary.json
```

---

## 10. 결론

### 10.1 크롤링 가능성

✅ **매우 높음**

- API 구조 명확하고 안정적
- 세션/인증 불필요
- HTTP 직접 호출로 충분
- 이미지 다운로드 성공

### 10.2 차이점 (Phase 1 vs Phase 2)

| 항목 | Phase 1 (추정) | Phase 2 (확정) |
|------|----------------|----------------|
| 전체 어종 수 | 25개 × N 페이지 | **25개** (단일 API) |
| 페이지네이션 | 있을 것으로 예상 | **없음** ✅ |
| 상세 URL | 추정값 | **확정** ✅ |
| 이미지 다운로드 | 예상 가능 | **검증 완료** ✅ |
| Playwright 필요 | 예상 불필요 | **불필요** ✅ |

### 10.3 최종 판정

✅ **Phase 3 (전체 수집) 진행 가능**

---

## 부록 A: 어종 목록 (25개)

1. 갈치 (fish_1571806850754)
2. 개조개 (fish_1575521941711)
3. 갯장어 (fish_1575529825083)
4. 고등어 (fish_1571803943319)
5. 기름가자미 (fish_1576639605223)
6. 꽃게 (fish_1576045793538)
7. 낙지 (fish_1575596889118)
8. 대게 (fish_1576639605222)
9. 대구 (fish_1575613737728)
10. 대문어 (fish_1576639605224)
11. 도루묵 (fish_1575858517048)
12. 말쥐치 (fish_1575867824021)
13. 명태 (fish_1575868769703)
14. 바지락 (fish_1575870984736)
15. 붉은대게 (fish_1573537097812)
16. 살오징어 (fish_1575875139974)
17. 삼치 (fish_1576639605225)
18. 오분자기 (fish_1575873437839)
19. 옥돔 (fish_1575532529343)
20. 전갱이 (fish_1576639605226)
21. 제주소라 (fish_1575880014320)
22. 주꾸미 (fish_1576639605227)
23. 참조기 (fish_1575880791880)
24. 참홍어 (fish_1575881532404)
25. 키조개 (fish_1575882272758)

---

**보고서 작성**: 2026-07-31
**다음 단계**: Phase 3 전체 수집 준비
**예상 시작**: 2026-08-07
