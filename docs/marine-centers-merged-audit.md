# Blue Marina marine centers 4종 CSV 병합 감사

작성일: 2026-06-19

## 목적

앱 데이터 반영 전에 4종 CSV를 병합 관점에서 감사했습니다.

이번 작업은 분석/문서 생성만 수행했으며 앱 코드, `src/data/marine-centers.ts`, 앱 데이터는 수정하지 않았습니다.

## 대상 CSV

- `work/marine-centers-written-test.csv`
- `work/marine-centers-practical-test.csv`
- `work/marine-centers-safety-education.csv`
- `work/marine-centers-exemption.csv`

## 생성 파일

- `work/marine-centers-merged-audit.json`
- `docs/marine-centers-merged-audit.md`

## 전체 요약

| 항목 | 결과 |
| --- | ---: |
| 총 행 수 | 139 |
| id 중복 | 0 |
| 전화번호 누락 | 0 |
| sourceCheckedAt 누락 | 0 |
| availableLicenses 빈 값 | 31 |
| address 기준 중복 그룹 | 29 |
| 같은 주소에 여러 type이 있는 그룹 | 27 |
| 같은 주소 + 같은 type + license만 다른 병합 후보 | 10 |

## type별 개수

| type | 개수 |
| --- | ---: |
| `written-test` | 31 |
| `practical-test` | 32 |
| `safety-education` | 33 |
| `exemption-education` | 43 |
| 합계 | 139 |

## region별 개수

| 지역 | 개수 |
| --- | ---: |
| 경남 | 27 |
| 전남 | 17 |
| 경기 | 17 |
| 경북 | 17 |
| 서울 | 12 |
| 부산 | 11 |
| 충남 | 8 |
| 제주 | 8 |
| 강원 | 7 |
| 전북 | 5 |
| 충북 | 5 |
| 울산 | 4 |
| 인천 | 1 |
| 합계 | 139 |

## availableLicenses 빈 값

- 빈 값: 31개
- 전부 `written-test`입니다.

필기시험장 목록만으로 일반조종면허/요트조종면허 가능 여부를 단정하지 않았기 때문에 빈 값으로 유지했습니다.

앱 반영 전 선택지:

1. 필기시험장은 `availableLicenses`를 빈 값으로 유지하고, 면허 필터와 별도로 노출
2. 시험장별 응시가능 시험 공식 안내를 추가 확인한 뒤 `general`, `yacht`, `general|yacht` 입력
3. 필기시험은 공통 시설로 보고 `general|yacht`를 일괄 입력하는 방식은 공식 확인 전에는 권장하지 않음

## address 기준 중복 그룹

중복 주소 그룹은 29개입니다.

중복은 크게 두 종류입니다.

1. 같은 주소에 여러 `type`이 있는 경우
   - 예: 필기시험장 + 실기시험장 + 수상안전교육장 + 면제교육기관
   - 기본 전략: `type`이 다르므로 별도 행 유지

2. 같은 주소 + 같은 `type`에서 `availableLicenses`만 다른 경우
   - 예: 일반 실기시험장과 요트 실기시험장이 같은 주소
   - 기본 전략: 병합 후보로 검토

## 같은 주소에 여러 type이 있는 대표 그룹

| 주소 | 개수 | 포함 type |
| --- | ---: | --- |
| 경상북도 안동시 석주로 514 | 5 | written-test, practical-test, safety-education, exemption-education |
| 경상북도 영덕군 강구면 강영로 33 | 5 | practical-test, safety-education, exemption-education |
| 서울특별시 마포구 마포나루길 256 | 5 | practical-test, safety-education, exemption-education |
| 경상남도 합천군 봉산면 서부로 4270-8 | 4 | written-test, practical-test, safety-education, exemption-education |
| 충청북도 충주시 동량면 미라실로 763 | 4 | written-test, practical-test, safety-education, exemption-education |

해석:

- 같은 장소가 여러 역할을 하는 경우가 많습니다.
- 앱 데이터에서는 `type`별 검색과 필터가 중요하므로 우선 별도 행 유지가 안전합니다.
- 추후 UX에서 같은 주소 시설을 묶어 보여주는 그룹 UI를 고려할 수 있습니다.

## 병합 후보

같은 주소 + 같은 `type` + `availableLicenses`만 다른 병합 후보는 10개 그룹입니다.

| 주소 | 병합 후보 type |
| --- | --- |
| 경상북도 영덕군 강구면 강영로 33 | practical-test, safety-education |
| 서울특별시 마포구 마포나루길 256 | practical-test, safety-education |
| 경상남도 거제시 남부면 남부해안로 1035 | exemption-education |
| 부산광역시 수영구 민락수변로 239번길 18 | exemption-education |
| 부산광역시 영도구 태종로 727 | exemption-education |
| 서울특별시 서초구 올림픽대로 2085-18 | exemption-education |
| 충청남도 태안군 남면 곰섬로 314 | exemption-education |
| 경기도 시흥시 거북섬5길 16 | exemption-education |
| 경기도 안산시 단원구 선감동 대부황금로 7 | exemption-education |
| 전라남도 여수시 웅천로 189, 웅천부영1차상가 202호 | exemption-education |

병합 예:

- 일반 행: `availableLicenses = general`
- 요트 행: `availableLicenses = yacht`
- 병합 후 후보: `availableLicenses = general|yacht`

단, 공식 자료에서 실제로 같은 운영 단위인지 확인 전에는 자동 병합하지 않는 것이 안전합니다.

## id 중복

- id 중복: 0개

현재 4종 CSV를 단순 병합해도 `id` 충돌은 없습니다.

## sourceCheckedAt 누락

- 누락: 0개

모든 행에 `2026-06-19`가 입력되어 있습니다.

## 전화번호 누락

- 누락: 0개

모든 행에 공식 페이지 기준 전화번호가 입력되어 있습니다.

## 앱 반영 전략 제안

### 1단계: 단순 병합 반영 후보 생성

4종 CSV를 그대로 합쳐 앱 데이터 후보를 만듭니다.

- 장점: 공식 원문 구조 보존
- 단점: 같은 주소 시설이 여러 행으로 보임

### 2단계: type별 별도 행 유지

`type`이 다르면 같은 주소라도 별도 행을 유지합니다.

예:

- `written-test`
- `practical-test`
- `safety-education`
- `exemption-education`

이 방식이 `/centers`의 시설 종류 필터와 가장 잘 맞습니다.

### 3단계: 같은 주소 + 같은 type + license만 다른 행은 병합 후보로 수동 검토

자동 병합하지 말고, 병합 후보 10개를 사람이 확인합니다.

확인 후 병합하는 경우:

- id는 대표 id로 새로 정리
- name은 일반/요트 둘 다 의미가 보이게 정리
- `availableLicenses`는 `general|yacht`
- `note`에 병합 근거 기록

### 4단계: 주소 정규화는 별도 단계로 분리

현재 CSV에는 공식 원문 주소를 유지했습니다.

앱 반영 전 다음 필드 도입을 검토할 수 있습니다.

- `address`: 공식 원문 주소
- `normalizedAddress`: 검색/지도용 정규화 주소

### 5단계: 필기시험장 availableLicenses 보완

필기시험장 31개는 `availableLicenses`가 비어 있습니다.

앱 반영 전 정책 선택이 필요합니다.

- 미확인으로 유지
- 시험장별 응시가능 시험 공식 안내를 추가 확인
- 필기시험장은 면허 공통 시설로 별도 처리

## 앱 반영 가능 여부

조건부 가능입니다.

현재 4종 CSV는 행 수, 헤더, id, 전화번호, sourceCheckedAt 기준으로 앱 반영 후보 품질을 갖췄습니다.

다만 아래 정책 확정 전에는 바로 `src/data/marine-centers.ts`에 넣지 않는 것이 안전합니다.

## 반영 전 결정해야 할 정책

1. 같은 주소 + 다른 `type`은 별도 행 유지할지
2. 같은 주소 + 같은 `type` + 다른 `availableLicenses`는 병합할지
3. 필기시험장 `availableLicenses` 빈 값을 어떻게 처리할지
4. 공식 원문 주소와 지도용 정규화 주소를 분리할지
5. 병합 후 id 네이밍 규칙
6. 같은 주소 시설을 UI에서 그룹으로 묶어 보여줄지
7. 지도 좌표 수집 전 주소 정규화 절차

## 결론

4종 CSV의 총 139개 행은 공식 출처 기반으로 병합 가능한 상태입니다.

다만 중복 주소 그룹이 29개로 많고, 그중 10개는 같은 주소와 같은 type에서 일반/요트만 나뉘는 병합 후보입니다. 따라서 앱 반영 전에는 자동 병합보다 수동 정책 확정 후 단계적 반영을 권장합니다.
