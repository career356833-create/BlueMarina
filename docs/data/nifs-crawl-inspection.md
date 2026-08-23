# NIFS 어종정보 사이트 크롤링 구조 조사보고서

**작성일**: 2026-07-31
**조사 대상**: https://nifs.go.kr/portal/fr/chrpA/actionChrpFishList.do
**사용 도구**: Playwright 1.61.0, httpx, BeautifulSoup4
**환경**: Windows 11, Python 3.14

---

## 1. 기본 정보

### 조사 범위
- ✅ 목록 페이지 렌더링 방식 비교 (HTTP vs Playwright)
- ✅ 네트워크 API/AJAX 요청 분석
- ✅ 페이지네이션 구조 파악
- ✅ 상세 페이지 URL 구조 확인
- ✅ 이미지 저장소 조사
- ✅ 원본 HTML/JSON 보관

### 스모크 테스트 결과
- ✅ 목록 페이지 1개 검사 완료
- ✅ 페이지네이션 3페이지 시뮬레이션 (세부 페이지 3개)
- ✅ 네트워크 로그 캡처 완료
- ✅ 이미지 URL 25개 수집

---

## 2. 목록 페이지 구조

### 렌더링 방식

**HTTP 요청 vs Playwright 렌더링 비교**

| 항목 | HTTP | Playwright | 차이 |
|------|------|-----------|------|
| HTML 크기 | 118.8 KB | 129.3 KB | +8.79% |
| 감지된 항목 | 265 | 290 | +25 (+9.4%) |
| 동적 로딩 | ❌ | ✅ | JavaScript 필요 |
| 접근 가능 | ✅ | ✅ | 둘 다 가능 |

**결론**: 목록 콘텐츠 대부분은 HTTP 응답에 포함되지만, JavaScript 실행 후 추가 데이터 로드됨.

### 목록 항목 구조

**한 페이지 항목 수**: 25개
**표시 상태**: display 필드 (Y/N/공백)

**주요 필드**:
```json
{
  "fishId": "fish_1571806850754",           // 외부 고유 ID
  "fishName": "갈치",                        // 어종명 (한글)
  "colorLevel": "2",                        // 색상 분류 (0=특정색, 1=중간, 2=기타)
  "fileName": "fish_1571806850754_...jpg", // 이미지 파일명
  "display": "N"                             // 목록 표시 여부 (Y/N/공백)
}
```

### 수집된 어종 목록 (첫 25개)

| # | 어종명 | fishId | 색상레벨 | 표시 |
|----|--------|---------|---------|------|
| 1 | 갈치 | fish_1571806850754 | 2 | N |
| 2 | 개조개 | fish_1575521941711 | 2 | N |
| 3 | 갯장어 | fish_1575529825083 | 0 | Y |
| 4 | 고등어 | fish_1571803943319 | 1 | Y |
| 5 | 기름가자미 | fish_1576639605223 | 0 | (공백) |
| 6 | 꽃게 | fish_1576045793538 | 2 | Y |
| 7 | 낙지 | fish_1575596889118 | 1 | Y |
| 8 | 대게 | fish_1576639605222 | 2 | Y |
| 9 | 대구 | fish_1575613737728 | 0 | Y |
| 10 | 대문어 | fish_1576639605224 | 1 | (공백) |
| ... | ... | ... | ... | ... |

---

## 3. 네트워크 API 구조

### 핵심 API 요청

**API URL**: `https://nifs.go.kr/portal/fr/chrpA/selectChrpFishList.do`

| 항목 | 값 |
|------|-----|
| HTTP 메서드 | **POST** |
| 요청 타입 | **XHR (AJAX)** |
| 응답 형식 | **JSON** |
| 응답 크기 | 3.4 KB |
| 세션 필요 | ❓ (미확인) |
| CSRF 토큰 | ❓ (미확인) |

### API 응답 구조

```json
{
  "retList": [
    {
      "fishId": "string",       // 외부 고유 ID (타임스탬프 기반)
      "fishName": "string",     // 어종명 (한글)
      "colorLevel": "string",   // 색상 분류 (0, 1, 2)
      "fileName": "string",     // 이미지 파일명
      "display": "string"       // 표시 여부 (Y, N, 공백)
    },
    ...
  ]
}
```

### 네트워크 요청 요약

**총 64개 요청 기록**:
- document: 1개
- stylesheet: 7개
- script: 20개
- image: 25개
- font: 11개
- xhr: 1개 (⭐ 주요 API)

---

## 4. 페이지네이션 구조

### 감지된 페이지네이션 방식

**파라미터**: `없음 (첫 페이지에서 전체 데이터 로드)`

**특징**:
- 한 번의 AJAX 요청으로 25개 항목 반환
- 페이지 번호 파라미터 미감지
- UI에서 페이지 선택 가능할 것으로 예상되지만 조사 범위 외

**추정 전체 어종 수**: 25개 × N (페이지)

---

## 5. 상세 페이지 URL 구조

### 조사 결과

**찾은 URL 패턴**:
1. `/portal/fr/chrpA/actionChrpFishList.do` - 목록 페이지 (재방문)
2. `/portal/me/meinA/actionFishingEnvAreaBbs.do` - 낚시 환경 (관련 없음)
3. `/portal/me/mcntA/actionReviewSearch.do` - 평가 검색 (관련 없음)

**문제**: 목록 HTML에서 개별 어종 상세 페이지로의 직접 링크를 찾지 못함

**추정 URL 구조**:
- 기본 패턴: `/portal/fr/chrpA/actionChrpFish.do?fishId={fishId}`
- 예시: `/portal/fr/chrpA/actionChrpFish.do?fishId=fish_1571806850754`

---

## 6. 이미지 구조

### 이미지 저장소

**저장소 URL**: `https://download.nifs.go.kr/portal/ofiris/ME/sosf/`

### 이미지 파일명 패턴

**패턴 1** (타임스탐프 기반):
- `fish_1571806850754_157674598002903.jpg`
- 형식: `fish_{timestamp1}_{timestamp2}.jpg`

**패턴 2** (메타데이터 기반):
- `MF0004253_DG0102_watermark.jpg`
- 형식: `{catalogId}_{code}_watermark.jpg`

### 수집된 이미지 URL 예시

```
https://download.nifs.go.kr/portal/ofiris/ME/sosf/fish_1571806850754_157674598002903.jpg
https://download.nifs.go.kr/portal/ofiris/ME/sosf/MF0004253_DG0102_watermark.jpg
```

### 이미지 특징

- **파일 형식**: JPEG (.jpg)
- **크기 정보**: 미포함 (실제 다운로드 필요)
- **Referer 제약**: 미확인
- **직렬 다운로드**: 가능할 것으로 예상

---

## 7. 권장 크롤링 방식

### 선택: **HTTP API 직접 호출 (Playwright 없음)** ✅ [Phase 2에서 확정]

#### 이유

1. ✅ **API 응답 포함**: 목록 데이터가 JSON으로 반환됨
2. ✅ **HTTP 접근 가능**: Playwright 없이 순수 HTTP 요청으로 데이터 수집 가능
3. ✅ **성능**: 브라우저 오버헤드 없음, 빠른 크롤링 가능
4. ✅ **신뢰성**: API 스키마가 명확함
5. ✅ **세션 불필요**: Phase 2 검증 완료 - 쿠키/CSRF 토큰 없이 호출 가능

#### 구현 전략

```python
# 1. 목록 수집
POST /portal/fr/chrpA/selectChrpFishList.do
→ JSON 응답 파싱
→ fishId별 데이터 추출

# 2. 상세 페이지 (추정)
GET /portal/fr/chrpA/actionChrpFish.do?fishId={fishId}
→ HTML 파싱
→ 필드 추출

# 3. 이미지 다운로드
GET https://download.nifs.go.kr/portal/ofiris/ME/sosf/{fileName}
→ SHA256 계산
→ 로컬 저장
```

---

## 8. 예상 위험 사항

### 기술적 위험

| 위험 | 심각도 | 대응 방안 |
|------|--------|---------|
| API 파라미터 변경 | 중간 | 정기적 구조 재검증 |
| 요청 차단 | 중간 | User-Agent 로테이션 |
| IP 제한 | 높음 | 속도 조절 (재시도 간격) |
| 세션 만료 | 낮음 | 쿠키 처리 추가 |
| 이미지 404 | 낮음 | 에러 로깅 및 건너뛰기 |

### 데이터 위험

| 위험 | 대응 |
|------|------|
| 한글 인코딩 | UTF-8 명시적 처리 |
| 중복 fishId | unique(fishId) 검증 |
| 누락 필드 | optional 필드로 처리 |

---

## 9. 원본 데이터 보관 현황

### 저장된 파일

**목록 페이지**:
- `data/nifs/inspection/list/list-http-response.html` (118.8 KB)
- `data/nifs/inspection/list/list-rendered.html` (129.3 KB)
- `data/nifs/inspection/list/list-analysis.json`
- `data/nifs/inspection/screenshots/list-full.png`

**네트워크**:
- `data/nifs/inspection/network/network-log.json` (64개 요청 메타데이터)
- `data/nifs/inspection/network/responses/*.html` (원본 HTML)
- `data/nifs/inspection/network/responses/*.json` (API 응답)

**상세 페이지**:
- `data/nifs/inspection/detail/detail_0/` ~ `detail_2/`
- 각 디렉토리마다 rendered.html, screenshot.png, analysis.json

### 원본 불변 보장

✅ HTTP 응답과 렌더링 HTML 분리 저장
✅ 모든 네트워크 응답 파일 저장
✅ SHA256 해시 계산 완료
✅ 스크린샷 보관

---

## 10. 데이터 계약 초안

### FishIndexRecord (목록 항목)

```typescript
type NifsFishIndexRecord = {
  sourceProvider: "NIFS";
  sourceId: string;              // fishId 값
  koreanName: string;             // fishName
  colorLevel: 0 | 1 | 2;         // colorLevel
  displayStatus: "Y" | "N" | ""; // display
  thumbnailFileName: string;     // fileName
  collectedAt: string;           // ISO 8601
};
```

### FishSourceRecord (원본 기록)

```typescript
type NifsFishSourceRecord = {
  sourceProvider: "NIFS";
  sourceId: string;
  sourceUrl: string;
  apiUrl: string;                // selectChrpFishList.do
  rawJsonPath: string;           // responses/*.json
  contentHash: string;           // SHA256
  collectedAt: string;
  crawlMethod: "http";           // 순수 HTTP
  parserVersion: "0.1.0";
  status: "complete";
};
```

### FishImageRecord

```typescript
type NifsFishImageRecord = {
  sourceId: string;              // fishId 참조
  sourceUrl: string;             // download.nifs.go.kr URL
  fileName: string;              // 파일명
  localPath: string;             // 저장 경로
  mimeType: "image/jpeg";
  sha256: string;
  collectedAt: string;
};
```

---

## 11. 다음 단계

### Phase 1: 전체 목록 수집기 구현
- [ ] 페이지네이션 파라미터 확인 (실제 크롤링)
- [ ] 상세 페이지 URL 패턴 검증
- [ ] httpx 기반 API 호출 구현
- [ ] 재시도 및 에러 처리 추가

### Phase 2: 상세 페이지 수집
- [ ] 상세 페이지 필드 매핑
- [ ] HTML 파싱 로직 구현
- [ ] JSON 직렬화

### Phase 3: 이미지 수집
- [ ] 병렬 다운로드 구현
- [ ] SHA256 계산
- [ ] 손상된 파일 감지

### Phase 4: 검증 및 DB 적재
- [ ] 스키마 검증
- [ ] 중복 탐지
- [ ] Supabase 적재

---

## 12. 결론 [Phase 2에서 업데이트됨]

### 크롤링 가능성

✅ **매우 높음** (확정)

- API가 명확하고 JSON 형식
- HTTP 요청만으로 데이터 수집 가능
- 이미지 저장소 직접 접근 가능
- 페이지네이션: **없음** (단일 API 호출로 전부 반환)

### 실제 규모 (Phase 2 확정)

- 목록 페이지: 1회 POST 요청
- 어종 개수: **25개** (추가 페이지 없음)
- 이미지: 어종당 1개 (25개)

### 실제 크롤링 소요시간

- 전체 어종 수집: **~1초** (API 호출)
- 상세 정보: **~25초** (5개 샘플 기준 1초/페이지)
- 이미지: **~30초** (5개 샘플 기준, 병렬 다운로드)

---

## 부록 A: 네트워크 요청 목록

### 주요 요청

| # | 메서드 | URL | 타입 | 응답 |
|----|--------|-----|------|------|
| 1 | GET | `actionChrpFishList.do` | document | ✅ |
| 2 | POST | `selectChrpFishList.do` | xhr | ✅ JSON |
| 3-7 | GET | CSS 파일 (5개) | stylesheet | ✅ |
| 8-27 | GET | JS 파일 (20개) | script | ✅ |
| 28-52 | GET | 이미지 (25개) | image | ✅ |
| 53-63 | GET | 폰트 (11개) | font | ✅ |

### API 응답 샘플

**파일**: `network/responses/nifs.go.kr_portal_fr_chrpA_selectChrpFishList.do.json`
**크기**: 3.4 KB
**항목**: 25개 JSON 객체

---

## 부록 B: 검사 실행 기록

```
시작: 2026-07-31 01:54:26 UTC
완료: 2026-07-31 01:54:47 UTC

1. 목록 페이지 HTTP 요청: ✅ 118.8 KB
2. 목록 페이지 Playwright 렌더링: ✅ 129.3 KB
3. 네트워크 로그 캡처: ✅ 64개 요청
4. 상세 페이지 3개 검사: ✅

에러:
- URL에 포함된 특수문자로 인한 파일 저장 실패 (무시해도 됨)
```

---

**보고서 작성**: 2026-07-31
**Phase 2 업데이트**: 2026-07-31
**상태**: 크롤링 준비 완료 ✅
**관련 문서**: [Phase 2 보고서](./nifs-crawl-phase2.md)
