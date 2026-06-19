# Blue Marina 네이버 지도 API 키 발급 및 환경변수 설정 가이드

작성일: 2026-06-19

## 목적

Blue Marina의 시험장·교육장 지도 기능을 연결하기 전에 네이버 지도 API 키 발급 절차와 환경변수 관리 기준을 정리한다. 이 문서는 절차 안내용이며, 실제 API 키를 포함하지 않는다.

## 참고 공식 자료

- NAVER Cloud Platform Maps 상품 안내: https://www.ncloud.com/product/applicationservice/maps
- NAVER Cloud Platform Maps API 가이드: https://api.ncloud-docs.com/docs/application-maps-overview
- NAVER Cloud Platform Maps FAQ: https://www.ncloud.com/support/faq/all/1047?searchKeyword=map

## 1. 네이버 클라우드 플랫폼 접속

1. 네이버 클라우드 플랫폼에 접속한다.
2. 콘솔에 로그인한다.
3. 결제 수단, 이용 약관, 프로젝트 권한 등 계정 설정이 필요한 경우 먼저 완료한다.

## 2. Maps 서비스 확인

네이버 클라우드 플랫폼의 Application Services 영역에서 Maps 서비스를 확인한다.

Maps 상품군에는 지도 표시, 경로, 지오코딩 등 위치 기반 기능이 포함된다. Blue Marina에서는 우선 시험장·교육장 지도 표시를 위해 Web Dynamic Map을 검토한다.

## 3. Web Dynamic Map 사용 설정

Application 등록 또는 설정 화면에서 Maps 관련 서비스 중 Web Dynamic Map 사용 여부를 확인한다.

Blue Marina 1차 지도 연동 목적은 다음과 같다.

- `/centers`의 시험장·교육장 위치를 지도에 표시
- `/centers/map-test`에서 지도 마커 렌더링 테스트
- 지역/시설 종류 필터와 지도 마커 동기화

실제 연동 전까지는 지도 스크립트를 앱에 삽입하지 않는다.

## 4. Client ID 발급 위치

네이버 클라우드 플랫폼 콘솔에서 Maps Application을 등록하면 인증 정보에서 Client ID를 확인할 수 있다.

Blue Marina의 프론트엔드 지도 렌더링에는 공개 가능한 Client ID만 사용한다.

사용 예정 환경변수:

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=
```

주의:

- `NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 노출될 수 있다.
- 따라서 이 값에는 공개 가능한 지도 렌더링용 Client ID만 넣는다.
- Client Secret은 절대 `NEXT_PUBLIC_` 환경변수로 만들지 않는다.

## 5. localhost:3000 도메인 등록 필요 여부

로컬 개발에서 Web Dynamic Map을 테스트하려면 네이버 클라우드 콘솔의 서비스 URL 또는 Web 서비스 URL 등록 항목에 로컬 주소 등록이 필요할 수 있다.

네이버 클라우드 FAQ와 인증 오류 안내에서는 서비스 URL이 실제 호출 도메인과 맞아야 한다고 안내한다. 포트와 경로 처리 방식은 콘솔 정책에 따라 달라질 수 있으므로, 등록 전 공식 FAQ와 콘솔 안내를 확인한다.

Blue Marina 로컬 테스트 후보:

```text
http://localhost:3000
http://localhost
http://127.0.0.1:3000
http://127.0.0.1
```

권장 절차:

1. 콘솔의 Web 서비스 URL 입력 안내를 먼저 확인한다.
2. 로컬 테스트에서 인증 오류가 나면 `localhost`와 `127.0.0.1` 등록 방식을 다시 확인한다.
3. 팀 내에서 실제 테스트에 사용할 로컬 URL을 하나로 통일한다.

## 6. 배포 도메인 등록 필요 여부

Vercel 또는 실제 운영 도메인에서 지도를 표시하려면 배포 도메인을 네이버 클라우드 콘솔에 등록해야 한다.

예시:

```text
https://blue-marina.example.com
https://blue-marina.vercel.app
```

주의:

- 실제 배포 도메인이 확정된 뒤 등록한다.
- Preview 배포 URL까지 등록할지 여부는 별도 정책으로 정한다.
- 도메인을 등록하지 않으면 지도 인증 오류가 발생할 수 있다.

## 7. 프론트엔드 지도 렌더링 환경변수

프론트엔드 지도 표시용:

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_public_client_id_here
```

사용 위치:

- 향후 `/centers/map-test`
- 이후 `/centers` 지도 보기

금지:

- 실제 키를 코드에 직접 작성 금지
- 실제 키를 문서에 작성 금지
- 실제 키를 Git에 커밋 금지

## 8. Geocoding API 환경변수

주소를 좌표로 변환하는 Geocoding API는 서버 또는 로컬 작업용으로 별도 관리한다.

사용 예정 환경변수:

```env
NAVER_GEOCODING_CLIENT_ID=your_geocoding_client_id_here
NAVER_GEOCODING_CLIENT_SECRET=your_geocoding_client_secret_here
```

관리 원칙:

- Geocoding Client Secret은 브라우저에 노출하면 안 된다.
- 앱 런타임에서 직접 호출하지 않고, 로컬 수집 스크립트 또는 서버 API를 통해 사용한다.
- 좌표 수집 결과는 검수 후 `lat/lng` 데이터로 반영한다.
- 실패한 주소는 `failed` 또는 `review` 상태로 따로 관리한다.

## 9. .env.local 예시

실제 파일은 이번 단계에서 생성하지 않는다. 아래는 예시 형식이다.

```env
# 지도 렌더링용 공개 Client ID
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_public_client_id_here

# 주소 → 좌표 변환 작업용
# 서버 또는 로컬 스크립트에서만 사용
NAVER_GEOCODING_CLIENT_ID=your_geocoding_client_id_here
NAVER_GEOCODING_CLIENT_SECRET=your_geocoding_client_secret_here
```

## 10. 주의사항

### API 키를 Git에 올리지 말 것

- `.env.local`은 Git에 커밋하지 않는다.
- 문서, 코드, CSV, 이슈, 커밋 메시지에 실제 키를 남기지 않는다.
- 키가 노출되면 즉시 폐기하고 재발급한다.

### Public Client ID와 Secret 구분

- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`: 브라우저에 노출될 수 있는 지도 렌더링용 값
- `NAVER_GEOCODING_CLIENT_SECRET`: 서버/로컬 작업에서만 사용할 비밀 값

### build 후 dev 서버 stale cache 주의

현재 프로젝트에서는 `next dev`가 실행 중인 상태에서 `npm run build`를 실행하면 `.next` 산출물이 바뀌면서 dev 서버가 오래된 chunk를 참조하는 문제가 발생할 수 있다.

증상 예시:

```text
Cannot find module './479.js'
Runtime Error
500 response on local route
```

대응 절차:

1. dev 서버 종료
2. `.next` 삭제
3. `npm run dev -- -p 3000` 재실행
4. 문제가 있던 라우트 새로고침

## 다음 실제 작업 단계

1. 네이버 클라우드 플랫폼에서 Maps Application 생성
2. Web Dynamic Map 사용 설정
3. 로컬 테스트용 서비스 URL 등록
4. 배포 도메인 확정 후 운영 도메인 등록
5. `.env.local`에 placeholder가 아닌 실제 키를 로컬에서만 입력
6. `/centers/map-test`에 지도 스크립트 로딩 구조를 최소 구현
7. 샘플 좌표 5개로 마커 표시 테스트
8. 전체 127개 좌표 수집 및 검수 후 `/centers` 지도 보기 활성화
