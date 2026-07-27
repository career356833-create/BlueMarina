# Blue Marina 출조거점 1차 핵심데이터 구축 보고서

작성일: 2026-07-11

## 목적

Blue Marina를 바다낚시·선상낚시·해양레저 포털로 확장하기 위한 출조거점 핵심 데이터를 공식 출처 기반으로 1차 구축했다.

이번 단계에서는 앱 화면에 직접 반영하지 않고, 원본 CSV 확보와 Blue Marina 표준 필드 정규화까지 수행했다.

## 공식 출처

1. 해양수산부_공동활용체계_선상낚시포인트
   - 출처: 공공데이터포털
   - URL: https://www.data.go.kr/data/15148435/fileData.do
   - 원본 행 수: 329
   - 형식: CSV
   - 제공기관: 해양수산부

2. 해양수산부_공동활용체계_갯바위낚시포인트
   - 출처: 공공데이터포털
   - URL: https://www.data.go.kr/data/15148580/fileData.do
   - 원본 행 수: 1076
   - 형식: CSV
   - 제공기관: 해양수산부

## 생성 파일

- `work/fishing-spots-boat-raw.csv`
- `work/fishing-spots-rock-raw.csv`
- `work/fishing-spots-core-v1.csv`
- `work/fishing-spots-core-v1.json`
- `work/fishing-spots-core-v1-audit.json`
- `docs/fishing-spots-core-v1-review.md`

## 표준 필드

`work/fishing-spots-core-v1.csv`는 아래 필드로 정규화했다.

- `id`
- `name`
- `type`
- `region`
- `city`
- `address`
- `lat`
- `lng`
- `targetFish`
- `tideNote`
- `depthNote`
- `bottomNote`
- `methodNote`
- `safetyStatus`
- `sourceType`
- `sourceUrl`
- `sourceCheckedAt`
- `originalId`
- `originalPoint`
- `note`

## 데이터 수량

총 1405개 출조거점 데이터를 구축했다.

| type | count |
| --- | ---: |
| boat-fishing-point | 329 |
| rock-fishing-point | 1076 |

## 지역별 개수

| region | count |
| --- | ---: |
| 전라남도 | 629 |
| 경상남도 | 223 |
| 인천광역시 | 136 |
| 제주특별자치도 | 118 |
| 전라북도 | 94 |
| 경상북도 | 74 |
| 충청남도 | 61 |
| 경기도 | 27 |
| 강원도 | 21 |
| 부산광역시 | 13 |
| 울산광역시 | 9 |

## 검증 결과

| 항목 | 결과 |
| --- | ---: |
| 총 행 수 | 1405 |
| 선상낚시포인트 | 329 |
| 갯바위낚시포인트 | 1076 |
| 중복 id | 0 |
| name 누락 | 0 |
| region 누락 | 0 |
| targetFish 누락 | 0 |
| lat 누락 | 2 |
| lng 누락 | 977 |

## 좌표 품질

선상낚시포인트는 대부분 도분초 위도/경도 값을 제공하며, 327번 1건만 위도/경도 변환이 불가했다.

갯바위낚시포인트는 위도는 대부분 제공되지만 경도 컬럼이 원본에서 대량 누락되어 있다. 따라서 `work/fishing-spots-core-v1.csv`는 목록·검색·지역 필터용 1차 데이터로는 사용 가능하지만, 지도 마커 데이터로 바로 쓰기에는 부족하다.

좌표 누락 주요 항목:

- `boat-327`: 제주도 북동부·우도 - 김녕리앞해상
- `rock-625`: 제주도 동부 - 여마진개 갯바위
- `rock-fishing-point`: 경도 누락 975개

## 앱 반영 가능성

조건부 가능.

1차 앱 반영은 지도 없이 목록·검색·지역 필터 중심으로 진행하는 것이 적절하다. 지도 기능은 좌표 보강 후 별도 단계로 분리해야 한다.

## 다음 절차

1. 출조거점 데이터 타입 설계
   - `FishingSpot` 타입 확정
   - `boat-fishing-point`, `rock-fishing-point` 구분
   - `safetyStatus`, `sourceCheckedAt`, `sourceUrl` 유지

2. 앱 반영 정책 확정
   - 지도 없이 `/fishing-spots` 또는 `/fishing-rooms` 목록 페이지부터 구축
   - 좌표가 없는 포인트는 지도에서 제외하거나 “좌표 검증 필요” 배지 표시

3. 좌표 보강
   - 원본 `originalPoint` 좌표계 확인
   - KHOA 또는 공식 지도 자료로 경도 보강 가능성 검토
   - 좌표 변환 정책 확정 전 임의 변환 금지

4. 안전 정보 보강
   - 갯바위 출입 통제 가능성
   - 선상 출조 가능 여부
   - 기상·물때·현장 통제 확인 안내

5. 2차 데이터 후보
   - 낚시어선업 등록 현황
   - 국가어항·지방어항
   - 마리나/선착장
   - 낚시누리 또는 지자체 공식 출조 정보
