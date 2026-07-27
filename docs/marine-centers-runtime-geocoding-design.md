# Blue Marina 시험장·교육장 런타임 지오코딩 설계

## 목적

`src/data/marine-centers.ts`의 127개 시험장·교육장 데이터는 주소와 공식 출처를 원천 데이터로 유지한다. Kakao, Naver, VWorld 등 외부 지오코딩 결과는 공급자 정책상 영구 저장 가능 여부가 확정되지 않았으므로, 지도 표시 시점에 서버에서만 조회하고 클라이언트와 데이터 파일에 좌표를 저장하지 않는 구조를 사용한다.

## 설계 대상

- 시설 데이터: 127개
- 고유 주소 그룹: 79개
- 자체 보관 데이터: 시설명, 유형, 주소, 공식 출처 URL, 출처 URL, 검증 메모
- 영구 저장 금지 데이터: 외부 지오코딩으로 얻은 위도, 경도, 공급자 raw 응답

## 서버 Route Handler 설계

권장 라우트 후보:

- `POST /api/geocoding/marine-centers`

요청 스키마:

```json
{
  "items": [
    {
      "address": "공식 주소",
      "centerIds": ["center-id"],
      "officialUrls": ["공식 위치 확인 URL"],
      "sourceUrls": ["공식 출처 URL"],
      "provider": "vworld"
    }
  ]
}
```

응답 스키마:

```json
{
  "results": [
    {
      "ok": true,
      "centerIds": ["center-id-1", "center-id-2"],
      "result": {
        "provider": "vworld",
        "address": "원문 주소",
        "normalizedAddress": "정규화 주소",
        "coordinates": { "lat": 35.1, "lng": 129.1 },
        "coordinateSystem": "WGS84",
        "precision": "road",
        "storagePolicy": {
          "permanentStorageAllowed": false,
          "allowJsonWrite": false,
          "allowDatabaseWrite": false,
          "allowLocalStorage": false,
          "allowIndexedDb": false,
          "shortMemoryCachePolicy": "unclear"
        }
      }
    }
  ]
}
```

현재 작업에서는 실제 Route Handler를 등록하지 않는다. 외부 API 호출이 없는 상태에서 실수로 런타임 호출 경로가 노출되는 것을 막기 위해 타입, 정규화, 공급자 인터페이스만 먼저 만든다.

## API 키 보관 원칙

API 키는 서버 환경변수로만 보관한다.

- Kakao 후보: `KAKAO_REST_API_KEY`
- Naver 후보: `NAVER_GEOCODING_CLIENT_ID`, `NAVER_GEOCODING_CLIENT_SECRET`
- VWorld 후보: `VWORLD_API_KEY`

클라이언트에 `NEXT_PUBLIC_*` 형태로 지오코딩 키를 노출하지 않는다. 지도 표시용 public SDK 키와 주소 지오코딩용 server key는 분리한다.

## 주소 입력 검증

`src/lib/geocoding/normalize.ts`에서 주소를 다음 기준으로 검증한다.

- 빈 문자열 거부
- 너무 짧거나 지나치게 긴 값 거부
- 좌표 문자열처럼 보이는 값 거부
- 한국 주소 또는 시설명 문맥으로 보기 어려운 값 거부
- 요청 단위 중복 제거를 위해 공백을 정리한 `dedupeKey` 생성

## 응답 정규화

공급자별 응답은 `ProviderGeocodingCandidate`로 변환한 뒤 `normalizeProviderGeocodingCandidate()`를 통과한다.

정규화 결과:

- 좌표계는 WGS84만 허용
- 기존 `src/lib/geo/coordinates.ts`의 대한민국 좌표 검증 사용
- provider, address, normalizedAddress, precision, evidenceUrl을 표준 필드로 반환
- storagePolicy에 영구 저장 금지 정책을 항상 포함

## 영구 저장 방지 방식

좌표 결과는 다음 위치에 저장하지 않는다.

- `src/data/marine-centers.ts`
- JSON 리포트 또는 DB 테이블
- `localStorage`
- `IndexedDB`
- service worker cache

클라이언트는 응답을 화면 표시용 상태로만 사용한다. 새로고침하면 좌표는 다시 조회해야 한다.

메모리 단기 캐시는 공급자 약관별 해석이 필요하므로 현재 정책상 `unclear`로 표시한다. 실제 구현 전 각 공급자의 약관에서 캐시 허용 시간과 저장 범위를 확인해야 한다.

## 요청 단위 중복 제거

같은 주소를 가진 여러 `centerId`는 하나의 주소 그룹으로 묶는다.

예:

- 같은 주소의 필기시험장
- 같은 주소의 실기시험장
- 같은 주소의 수상안전교육장

동일 요청 안에서는 `groupRuntimeGeocodingRequests()`로 주소를 한 번만 조회하고, 반환 결과를 같은 주소의 여러 `centerId`가 공유한다.

## Fallback 흐름

1. 주소 없음 또는 주소 형식 오류
2. 공급자 환경변수 없음
3. 공급자 API 실패
4. 결과 없음 또는 모호한 결과
5. 좌표 검증 실패

위 상황에서는 좌표를 표시하지 않고 다음 fallback을 제공한다.

- 시설 카드의 공식 위치 링크
- 공식 출처 URL
- "방문 전 공식 홈페이지 또는 해당 기관 확인" 안내

## 생성된 설계 코드

- `src/lib/geocoding/types.ts`: 런타임 지오코딩 요청, 응답, 오류, 저장 정책 타입
- `src/lib/geocoding/normalize.ts`: 주소 검증, 공급자 좌표 정규화, 요청 단위 주소 dedupe
- `src/lib/geocoding/provider.ts`: 공급자 adapter interface와 환경변수 점검 유틸

## 실제 API 연결 전 결정사항

1. 1차 공급자 선택: Kakao, Naver, VWorld 중 하나
2. 공급자별 좌표 결과 저장·캐시 약관 확인
3. 서버 라우트 URL 확정
4. 요청당 최대 주소 수 제한
5. rate limit 및 abuse 방지 정책
6. 공식 위치 링크 없는 시설의 fallback UX
7. service worker가 지오코딩 응답을 캐시하지 않도록 제외 규칙 확정

