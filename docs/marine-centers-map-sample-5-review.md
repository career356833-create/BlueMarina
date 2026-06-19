# Blue Marina 지도 테스트용 좌표 샘플 5개 검토

작성일: 2026-06-19

## 목적

`/centers/map-test`에서 향후 지도 마커 테스트에 사용할 대표 시설 5개를 선정한다. 이번 작업에서는 좌표를 추정하지 않으며, 공식 또는 신뢰 가능한 지도에서 확인되지 않은 `lat/lng`는 빈 값으로 유지한다.

## 기준 파일

- 입력 기준: `src/data/marine-centers.ts` 및 `work/marine-centers-geocoding-template.csv`
- 출력: `work/marine-centers-map-sample-5.csv`

## 선정 기준

- 서울 1개
- 부산 1개
- 강원 1개
- 경기 1개
- 제주 1개
- 지도 마커 테스트 시 지역 분산을 확인할 수 있도록 구성
- 현재 앱 데이터나 `src/data/marine-centers.ts`에는 반영하지 않음

## 선정 시설 5개

### 1. 서울(마포) / 서울요트(마포)

- id: `practical-test-48`
- 지역: 서울 / 마포구
- 유형: 실기시험장 (`practical-test`)
- 주소: 서울특별시 마포구 마포나루길 256
- 전화번호: 02-304-5900
- sourceUrl: https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView4.do
- sourceCheckedAt: 2026-06-19
- lat/lng 입력 여부: 미입력
- 좌표 확인 필요 여부: 필요
- 검토 메모: 공식 또는 신뢰 가능한 지도에서 좌표를 확인한 뒤 입력한다. 추정 좌표는 사용하지 않는다.

### 2. 부산(수영)

- id: `busan-suyeong-practical-test`
- 지역: 부산 / 수영구
- 유형: 실기시험장 (`practical-test`)
- 주소: 부산광역시 수영구 민락수변로 239번길 18
- 전화번호: 051-742-0367
- sourceUrl: https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView4.do
- sourceCheckedAt: 2026-06-19
- lat/lng 입력 여부: 미입력
- 좌표 확인 필요 여부: 필요
- 검토 메모: 공식 또는 신뢰 가능한 지도에서 좌표를 확인한 뒤 입력한다. 추정 좌표는 사용하지 않는다.

### 3. 강원(동해)PC

- id: `gangwon-donghae-pc-written-test`
- 지역: 강원 / 동해시
- 유형: 필기시험장 (`written-test`)
- 주소: 강원도 동해시 임항로 29 동해해양경찰서
- 전화번호: 033-741-2351
- sourceUrl: https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView4.do
- sourceCheckedAt: 2026-06-19
- lat/lng 입력 여부: 미입력
- 좌표 확인 필요 여부: 필요
- 검토 메모: 공식 또는 신뢰 가능한 지도에서 좌표를 확인한 뒤 입력한다. 추정 좌표는 사용하지 않는다.

### 4. 경기(가평)

- id: `gyeonggi-gapyeong-special-written-test`
- 지역: 경기 / 가평군
- 유형: 필기시험장 (`written-test`)
- 주소: 경기도 가평군 호반로 162
- 전화번호: 031-584-5700
- sourceUrl: https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView4.do
- sourceCheckedAt: 2026-06-19
- lat/lng 입력 여부: 미입력
- 좌표 확인 필요 여부: 필요
- 검토 메모: 공식 또는 신뢰 가능한 지도에서 좌표를 확인한 뒤 입력한다. 추정 좌표는 사용하지 않는다.

### 5. 제주(제주)PC

- id: `jeju-jeju-pc-written-test`
- 지역: 제주 / 제주시
- 유형: 필기시험장 (`written-test`)
- 주소: 제주특별자치도 제주시 임항로 154번지 제주해양경찰서
- 전화번호: 064-766-2251
- sourceUrl: https://boat.kcg.go.kr/home/custCnter/ntcInfo/infoView4.do
- sourceCheckedAt: 2026-06-19
- lat/lng 입력 여부: 미입력
- 좌표 확인 필요 여부: 필요
- 검토 메모: 공식 또는 신뢰 가능한 지도에서 좌표를 확인한 뒤 입력한다. 추정 좌표는 사용하지 않는다.

## lat/lng 입력 정책

- 공식 좌표가 있으면 공식 좌표를 우선한다.
- 공식 좌표가 없으면 네이버 지도, 카카오맵 등 신뢰 가능한 지도에서 주소 검색 결과를 사람이 확인한 뒤 입력한다.
- 해양 시설은 주소 중심점과 실제 집결 위치가 다를 수 있으므로, 마커 위치는 반드시 눈으로 확인한다.
- 확인하지 못한 좌표는 빈 값으로 둔다.
- 좌표를 입력한 경우 `geocodingStatus`는 `manual` 또는 `success`로 바꾸고, `geocodingSource`, `geocodingCheckedAt`, `geocodingNote`를 함께 기록한다.

## /centers/map-test에서 사용하는 방법

1. `work/marine-centers-map-sample-5.csv`에 `lat/lng`를 채운다.
2. 좌표 5개가 모두 확인되면 별도 테스트 데이터로 변환한다.
3. `/centers/map-test`에서 실제 네이버 지도 API 키를 환경변수로 연결한 뒤 마커 표시만 테스트한다.
4. 샘플 테스트가 통과하면 전체 127개 좌표 수집으로 확장한다.

## 현재 상태

- 샘플 5개 선정 완료
- `lat/lng`는 모두 빈 값 유지
- 좌표 확인 필요
- 앱 반영 없음
- 지도 API 호출 없음
