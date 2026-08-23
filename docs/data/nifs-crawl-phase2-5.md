# NIFS 어종정보 Phase 2.5 — 상세 파싱 실패 원인 규명 및 필드 맵 완성

**작성일**: 2026-07-31
**전제**: Phase 2에서 목록 API(25건)와 이미지 다운로드는 확정됨. `detail-field-map.json`이 빈 객체였던 원인을 규명한다.

---

## 0. 먼저 정정 — Phase 2 보고서의 오기

Phase 2 보고서(`nifs-crawl-inspection.md` 계열)에 다음 **사실과 다른 기록**이 있었다. 이번 단계에서 정정한다.

| Phase 2 기록 | 실제 |
|---|---|
| 상세 URL `actionChrpFish.do?fishId=` **확정** | **404**. 존재하지 않는 URL |
| 상세 샘플 5종 **200 OK / 5개 수집** | 실행 로그상 `상세 샘플: 0개 수집`. 200 응답이 하나도 없었음 |
| "상세 URL 패턴 확인됨 ✅" | 미검증 추정을 확정으로 기록한 것 |

원인은 두 가지다. 첫째, 실행 로그의 `0개 수집`을 확인하지 않고 표를 작성했다. 둘째, `inspect_detail_pages()`가 `status != 200`일 때 아무것도 기록하지 않고 조용히 넘어가, 실패가 눈에 띄지 않았다.

---

## 1. 상세 파싱 실패 원인

실패는 **3단 중첩**이었다. 하나씩 벗겨야 원인이 드러났다.

### 원인 1 — 상세 URL 자체가 틀렸다

추정으로 만든 `actionChrpFish.do`는 존재하지 않는다.

```
GET /portal/fr/chrpA/actionChrpFish.do?fishId=fish_1571806850754  → 404 (1018 bytes)
```

실제 URL은 목록 페이지 인라인 스크립트 `calBackFunc`가 카드 `<a href>`를 만드는 부분에 있었다.

```javascript
vHtmlUl += '<a href="./actionChrpFishView.do?fishId=' + pData.retList[i].fishId + '">';
```

→ 정답은 **`actionChrpFishView.do`** (`View` 누락이 원인)

### 원인 2 — 상세 페이지는 데이터가 없는 shell이다

`actionChrpFishView.do`는 200을 주지만 내용이 없다. 샘플 5종 실측:

| 어종 | status | 길이 | 본문에 어종명 존재 |
|---|---|---|---|
| 갈치 | 200 | 128,977 | ❌ |
| 고등어 | 200 | 128,977 | ❌ |
| 꽃게 | 200 | 128,977 | ❌ |
| 낙지 | 200 | 128,977 | ❌ |
| 대구 | 200 | 128,977 | ❌ |

**5종 모두 길이가 1바이트도 다르지 않다.** 해시만 다른데, 이는 인라인 스크립트에 박힌 `fishId` 문자열 차이일 뿐이다. 즉 HTTP 200은 상세 성공의 근거가 되지 못한다.

실제 데이터는 shell의 `fnSearch()`가 호출하는 별도 API가 반환한다.

```javascript
function fnSearch(pSelectPage) {
    let paramMap = {fishId : 'fish_1571806850754'};
    lpCom.Ajax("search", "./selectChrpFishViewData.do", paramMap, calBackFunc, otherInit);
}
```

### 원인 3 — 요청 인코딩이 JSON이 아니라 폼이다

`selectChrpFishViewData.do`를 찾은 뒤에도 `retMap: null`이 계속 나왔다. `lpCom.js`의 Ajax 래퍼를 열어보니 이유가 있었다.

```javascript
let ajaxSetup = {
    url: pUrl
    , data : pParam
    , contentType : "application/x-www-form-urlencoded"   // ← JSON 아님
    , type: "POST"
    , dataType: "json"
```

JSON 본문으로 보내면 서버가 `fishId`를 읽지 못하고 **200 + `{"retMap":null,...}`** 를 반환한다. 오류 코드가 아니라 빈 성공으로 돌아오므로, status만 보는 코드는 이를 성공으로 오인한다.

`data=`(폼 인코딩)로 바꾸자 즉시 정상 응답이 나왔다.

### 잘못된 가정 정리

| 가정 | 실제 |
|---|---|
| 상세 URL을 규칙에서 유추할 수 있다 | 유추 불가. 목록 콜백 스크립트에만 존재 |
| HTTP 200 = 상세 성공 | shell도 200, 빈 JSON도 200 |
| 목록 API가 JSON이므로 상세도 JSON | 둘 다 `application/x-www-form-urlencoded` |
| 상세는 HTML 페이지 | 상세는 JSON API. HTML은 껍데기 |

### 수정 내용

- `src/detail_client.py` 신규 — 실제 URL 3종과 폼 인코딩 전송을 확정 반영
- `src/detail_parser.py` 신규 — `retMap` 파싱, 실패를 예외 대신 `errors[]`로 구조화
- `tests/test_detail_parser.py` 신규 — 16개 테스트, 전부 통과
- `build_field_map.py` 신규 — 샘플 5종 수집 후 필드 맵 생성

---

## 2. 실제 상세 호출

```
POST https://nifs.go.kr/portal/fr/chrpA/selectChrpFishViewData.do
Content-Type: application/x-www-form-urlencoded
Body: fishId=fish_1576045793538
```

| 항목 | 값 |
|---|---|
| shell 페이지 | `GET /portal/fr/chrpA/actionChrpFishView.do?fishId={fishId}` (데이터 없음) |
| 데이터 API | `POST /portal/fr/chrpA/selectChrpFishViewData.do` |
| 파라미터 | `fishId` (폼 필드 1개) |
| 응답 | `application/json` |
| 세션·쿠키 | 불필요 |
| CSRF 토큰 | 불필요 |
| Referer | 불필요 (실측 확인) |
| httpx 재현 | ✅ 5/5 성공 |

**목록 API도 정정**: `{}`가 아니라 `fnSearch()`가 보내는 `{language: null}`이며, 역시 폼 인코딩이다. `language`가 null이라 빈 본문으로도 동작했던 것이고, 우연히 통했을 뿐 정확한 계약은 아니었다.

### 응답 구조

```json
{
  "retMap":      { /* 기본 정보 12필드 */ },
  "imgList":     [ { "fileName": "..." } ],
  "periodList":  [ { "month": 6, "colorLevel": "2" } ],
  "historyList": [ { "year": "2000", "catchAverage": "12842" } ]
}
```

---

## 3. 상세 필드

라벨은 추정하지 않고 shell HTML의 실제 DOM 텍스트에서 확인했다.

### 공통 필드 (5/5 존재) — 14개

| 화면 라벨 | 응답 키 | 정규화 필드 | 형태 |
|---|---|---|---|
| 어종이름 | `retMap.fishName` | koreanName | text |
| 영문이름 | `retMap.fishNameEn` | englishName | text |
| 학명 | `retMap.scName` | scientificName | text |
| 특징 | `retMap.infoShape` | feature | html |
| 분포 | `retMap.infoDistribution` | distribution | html |
| 생애주기 | `retMap.infoGrowth` | lifecycle | html |
| 방언 | `retMap.infoDialect` | dialect | html |
| 어획 방법 | `retMap.infoCatch` | catchMethod | html |
| 영양 정보 | `retMap.infoCookHow` | nutrition | html |
| 소비 지양 크기 | `retMap.prohibitSize` | prohibitSize | number |
| 소비 권장 크기 | `retMap.recommendSize` | recommendSize | number |
| 어종 이미지 | `imgList[].fileName` | images | array |
| 소비 권장 시기 | `periodList[]` | recommendPeriod | array |
| 어획량 추이 | `historyList[]` | catchHistory | array |

**주의 — 키 이름이 내용을 오도한다.** `infoCookHow`는 조리법이 아니라 **영양 정보**(칼로리·단백질·지방)를 담는다. 화면 라벨이 "영양 정보"이고 조리법 마크업은 HTML에 주석 처리되어 있다. 마찬가지로 `infoShape`는 "형태"가 아니라 화면상 **특징**, `infoGrowth`는 "성장"이 아니라 **생애주기**다. 키 이름만 보고 매핑하면 틀린다.

### 선택 필드 (5/5 미만) — 1개

| 화면 라벨 | 응답 키 | 정규화 필드 | 존재 |
|---|---|---|---|
| 알고 먹읍시다! | `retMap.infoEat` | eatingNote | 2/5 |

값이 없을 때 빈 문자열이 아니라 문자열 `"NA"`로 온다. 파서에서 `None`으로 정규화한다.

### 샘플별 결과

| 어종 | 필드 수 | 이미지 | 권장월 | 어획연도 | 빈 필드 |
|---|---|---|---|---|---|
| 갈치 | 11 | 2 | 3 | 25 | eatingNote |
| 고등어 | 12 | 2 | 5 | 25 | — |
| 꽃게 | 12 | 2 | 5 | 25 | — |
| 낙지 | 11 | 2 | 3 | 25 | eatingNote |
| 대구 | 11 | 2 | 4 | 25 | eatingNote |

`detail-field-map.json` 상태: **완성** (fields 15개 항목, sampleResults 5종, 빈 객체 아님)

### 부가 확정 — colorLevel 의미

상세 화면 범례와 목록 페이지 분기에서 확인했다. 추정이 아니다.

| 값 | 색 | 의미 |
|---|---|---|
| 0 | green | 권장 |
| 1 | yellow | 자제 |
| 2 | red | 지양 |

`periodList`는 월별 소비 권장 등급이고, `historyList`는 2000~2024년 25개년 어획량(MT)이다.

---

## 4. 25개 목록의 성격

### 판정: **전체 어종백과가 아니다. 소비 권장 중심의 주요 수산자원 목록이다.**

### 근거

**(1) 메뉴 경로** — shell HTML의 만족도조사 파라미터에 전체 경로가 박혀 있다.

```javascript
wholMenuNm:"수산자원,수산자원정보,어종 목록,어종 목록"
```

`수산자원 > 수산자원정보` 하위다. 분류학 백과가 아니라 자원관리 콘텐츠다.

**(2) 필드 구성이 전부 소비·자원관리 지표다**

- 소비 지양 크기 / 소비 권장 크기 (= 포획금지체장 계열)
- 월별 소비 권장 시기 (권장/자제/지양)
- 25개년 어획량 추이
- "알고 먹읍시다!"

분류(목·과), 서식지 상세, 산란 생태 같은 백과 필드는 **없다**.

**(3) 구성종이 어류가 아니다**

25종 중 어류는 13종뿐이고, 나머지는 갑각류(꽃게·대게·붉은대게), 패류(개조개·바지락·키조개·제주소라·오분자기), 두족류(낙지·주꾸미·살오징어·대문어)다. 어류 도감이라면 성립하지 않는 구성이며, **상업적으로 중요한 수산물** 기준으로 뽑힌 목록이다.

**(4) 규모** — 우리나라 연근해 어류만 1,000종이 넘는다. 25종은 어떤 기준으로도 전수가 아니다.

### Blue Marina 전체 어종백과 원천으로 충분한가

**불충분하다.** 다만 성격을 알고 쓰면 가치가 높다.

| 용도 | 적합성 |
|---|---|
| 어종백과 전수 원천 | ❌ 25종뿐, 분류 정보 없음 |
| 대표 수산물 소비 가이드 | ✅ 이 데이터의 본래 목적 |
| 금어기·금지체장 근거 보강 | ✅ prohibitSize가 공신력 있는 1차 출처 |
| 제철 정보 근거 | ✅ 월별 권장 등급 |
| 어획량 통계 | ✅ 25개년 시계열 |
| 기존 `fish-data.ts` 검증 | ✅ 학명·영문명·방언 대조 |

Blue Marina의 어종 DB를 채우려면 NIFS 내 다른 계통(수산생명자원정보센터 등)이나 별도 원천이 추가로 필요하다. 이번 25종은 **정확도 높은 핵심 25종**으로 쓰는 것이 맞다.

---

## 5. 다음 단계

### 전체 25개 상세 수집 — 가능

샘플 5종이 100% 성공했고 응답 구조가 균일하다. 요청 간격 2초·동시성 1 기준 **약 50초**.

이번 단계 제한에 따라 실행하지 않았다.

### 추가 어종 원천 — 필요

Blue Marina 어종백과를 목표로 한다면 25종으로는 부족하다. 별도 조사가 필요하다.

### 남은 확인 사항

- `language` 파라미터에 값을 넣으면 다른 목록이 나오는지 (다국어/다른 분류 가능성)
- 25종 외 어종이 다른 메뉴에 있는지
- 어획량 시계열의 단위·출처 표기
- 이미지 2장의 역할 구분 (대표/보조)

---

## 6. 생성·수정 파일

| 경로 | 역할 |
|---|---|
| `tools/nifs-crawler/src/detail_client.py` | 목록·상세 HTTP 클라이언트 (URL·인코딩 확정) |
| `tools/nifs-crawler/src/detail_parser.py` | 상세 JSON 파서, 실패 구조화 |
| `tools/nifs-crawler/tests/test_detail_parser.py` | 단위 테스트 16개 |
| `tools/nifs-crawler/build_field_map.py` | 샘플 수집 → 필드 맵 생성 |
| `tools/nifs-crawler/diag_detail.py` | URL 후보 진단 |
| `tools/nifs-crawler/probe_view.py` | shell 페이지 검증 |
| `data/nifs/phase2_5/detail-field-map.json` | **완성된 필드 맵** |
| `data/nifs/phase2/detail-field-map.json` | 빈 객체 → 동일 내용으로 갱신 |
| `data/nifs/phase2_5/url-candidates.json` | URL 후보 5종 응답 기록 |
| `data/nifs/phase2_5/view-*.html` | shell 원본 5종 |
| `data/nifs/raw/fish/{id}/detail-api-response.json` | 상세 API 원본 |
| `data/nifs/raw/fish/{id}/parsed-preview.json` | 파싱 결과 |

기존 원본 파일은 덮어쓰지 않았다. `detail-api-response.json`과 `parsed-preview.json`만 신규 추가했다.

---

**판정**: Phase 3(전체 25종 상세 수집) 진행 가능. 단, 25종이 어종백과 전수가 아니라는 점을 전제로 범위를 재설정할 것.
