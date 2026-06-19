# Blue Marina 시험장·교육장 데이터 수집 가이드

## 목적

`/centers` 검색센터에 실제 시험장·교육장 데이터를 넣기 전에, 수집 필드와 입력 기준을 통일하기 위한 문서입니다.

현재 단계에서는 실제 데이터를 입력하지 않습니다. 공식 자료에서 검증한 뒤 `src/data/marine-centers.ts` 또는 별도 데이터 파일로 반영합니다.

## 수집 필드

| 필드 | 필수 | 설명 | 입력 예시 |
| --- | --- | --- | --- |
| `id` | 필수 | 앱 내부 식별자. 영문 소문자, 숫자, 하이픈 사용 | `busan-written-test-01` |
| `name` | 필수 | 공식 자료에 표시된 시설명 | `공식 시설명` |
| `type` | 필수 | 시설 종류 | `written-test`, `practical-test`, `safety-education`, `exemption-education` |
| `region` | 필수 | 광역 지역명 | `부산`, `경기`, `전남` |
| `city` | 선택 | 시·군·구 | `해운대구` |
| `address` | 필수 | 공식 자료 기준 주소 | `공식 주소` |
| `phone` | 선택 | 공식 자료 기준 전화번호. 없으면 빈 값 | `051-000-0000` |
| `availableLicenses` | 필수 | 가능 면허. 여러 개면 `|`로 구분 | `general|yacht` |
| `sourceUrl` | 필수 | 확인한 공식 자료 URL | `https://...` |
| `sourceCheckedAt` | 필수 | 자료 확인일 | `2026-06-19` |
| `note` | 선택 | 운영 제한, 확인 필요 사항, 데이터 메모 | `방문 전 공식 확인 필요` |
| `status` | 필수 | 운영 상태 | `active`, `unknown`, `closed` |

## 시설 종류 기준

### 필기시험장

- `type`: `written-test`
- 수집 기준:
  - 조종면허 필기시험 접수 또는 응시 장소로 공식 안내된 곳만 입력합니다.
  - 단순 교육장이나 실기시험장은 필기시험장으로 입력하지 않습니다.
  - 일반조종면허와 요트조종면허 모두 가능한 경우 `availableLicenses`에 둘 다 기록합니다.

### 실기시험장

- `type`: `practical-test`
- 수집 기준:
  - 조종면허 실기시험 장소로 공식 안내된 곳만 입력합니다.
  - 시험장별 가능 면허가 다를 수 있으므로 `availableLicenses`를 반드시 확인합니다.
  - 세부 코스, 일정, 수수료 등 변동 가능 정보는 `note`에 단정 입력하지 않습니다.

### 수상안전교육장

- `type`: `safety-education`
- 수집 기준:
  - 수상안전교육 신청 또는 이수 장소로 공식 안내된 곳만 입력합니다.
  - 온라인 교육만 가능한 정보와 오프라인 교육장 정보는 혼합하지 않습니다.
  - 교육 일정은 변동성이 크므로 별도 일정 데이터로 분리하는 것을 권장합니다.

### 면제교육장

- `type`: `exemption-education`
- 수집 기준:
  - 면허시험 면제교육기관 또는 관련 교육장으로 공식 확인된 곳만 입력합니다.
  - 일반 교육기관처럼 보이더라도 공식 면제교육기관 여부가 불명확하면 입력하지 않습니다.
  - 확인이 불완전하면 `status: unknown`으로 두고 `note`에 검증 필요라고 기록합니다.

## 데이터 입력 규칙

1. 공식 자료에서 확인한 정보만 입력합니다.
2. 블로그, 카페, 커뮤니티, 지도 리뷰, 개인 게시글은 출처로 사용하지 않습니다.
3. 전화번호가 공식 자료에 없으면 빈 값으로 둡니다.
4. 좌표(`lat`, `lng`)는 이번 CSV 템플릿에 포함하지 않습니다. 지도 연동 단계에서 별도 수집합니다.
5. `sourceCheckedAt`은 필수입니다. 확인일이 없으면 데이터 최신성을 판단할 수 없습니다.
6. `sourceUrl`은 공식 기관 또는 공식 신청/안내 페이지 URL만 입력합니다.
7. 주소는 공식 표기 그대로 입력합니다. 임의로 줄이거나 행정동명을 추정하지 않습니다.
8. `availableLicenses`는 `general`, `yacht` 중 실제 가능한 면허만 입력합니다.
9. 운영 여부가 확실하면 `active`, 폐쇄가 공식 확인되면 `closed`, 불명확하면 `unknown`을 사용합니다.
10. 일정, 접수 가능 여부, 수수료, 준비물처럼 자주 바뀌는 정보는 시설 데이터에 고정하지 않습니다.

## CSV 템플릿

파일 위치:

`work/marine-centers-template.csv`

컬럼:

```csv
id,name,type,region,city,address,phone,availableLicenses,sourceUrl,sourceCheckedAt,note,status
```

CSV 작성 시 `type`은 앱 내부 값으로 변환해야 합니다.

| 화면 표시 | 내부 값 |
| --- | --- |
| 필기시험장 | `written-test` |
| 실기시험장 | `practical-test` |
| 수상안전교육장 | `safety-education` |
| 면제교육장 | `exemption-education` |

`availableLicenses` 작성 규칙:

| 화면 표시 | 내부 값 |
| --- | --- |
| 일반조종면허 | `general` |
| 요트조종면허 | `yacht` |

여러 개일 경우:

```csv
general|yacht
```

## 다음 데이터 수집 순서

1. 공식 출처 후보 목록 수집
2. 필기시험장 목록 검증
3. 실기시험장 목록 검증
4. 수상안전교육장 목록 검증
5. 면제교육장 목록 검증
6. CSV 템플릿에 1차 입력
7. 중복 시설명/주소 정리
8. `id` 규칙 정리
9. sourceUrl 및 sourceCheckedAt 누락 확인
10. 앱 데이터 파일로 변환
11. `/centers` 필터 QA
12. 지도 연동용 좌표 별도 수집

## 반영 전 검증 체크리스트

- [ ] 전체 행에 `id`가 있는가
- [ ] `id`가 중복되지 않는가
- [ ] `type` 값이 허용 목록 안에 있는가
- [ ] `region`과 `address`가 비어 있지 않은가
- [ ] `availableLicenses` 값이 `general`, `yacht`만 사용하는가
- [ ] `sourceUrl`이 공식 URL인가
- [ ] `sourceCheckedAt`이 입력되어 있는가
- [ ] 비공식 출처가 섞이지 않았는가
- [ ] 샘플/가짜 기관명이 실제 데이터에 남아 있지 않은가
