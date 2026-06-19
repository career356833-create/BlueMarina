# Blue Marina marine centers 병합 정책

작성일: 2026-06-19

## 목적

4종 공식 CSV를 앱 데이터로 반영하기 전에 병합 기준을 확정합니다.

대상 CSV:

- `work/marine-centers-written-test.csv`
- `work/marine-centers-practical-test.csv`
- `work/marine-centers-safety-education.csv`
- `work/marine-centers-exemption.csv`

## 확정 정책

### 1. 같은 주소 + 다른 type

별도 행으로 유지합니다.

예:

- 같은 주소가 `practical-test`와 `safety-education`에 모두 있는 경우
- 같은 주소가 `written-test`, `practical-test`, `safety-education`, `exemption-education`에 모두 있는 경우

이유:

- `/centers`의 핵심 필터는 시설 종류입니다.
- 같은 장소라도 필기시험장, 실기시험장, 수상안전교육장, 면제교육기관은 사용 목적이 다릅니다.
- 자동 병합하면 시설 종류 필터와 사용자 기대가 흐려질 수 있습니다.

### 2. 같은 주소 + 같은 type + availableLicenses만 다른 경우

하나의 행으로 병합합니다.

병합 후:

- `availableLicenses`: `general|yacht`
- `name`: 두 명칭을 ` / `로 연결
- `note`: 병합된 원본 id 목록을 기록

예:

```csv
서울(마포) / 서울요트(마포),practical-test,...,general|yacht
```

이유:

- 같은 장소, 같은 시설 종류, 같은 공식 출처에서 일반/요트만 분리된 경우 사용자에게 하나의 시설로 보여주는 것이 자연스럽습니다.
- 면허 필터에서는 `general`, `yacht` 양쪽에 모두 노출할 수 있습니다.

### 3. 필기시험장 availableLicenses 빈 값

그대로 빈 값으로 유지합니다.

단, `note`에 아래 문구를 추가합니다.

```text
필기시험장 응시 가능 면허는 공식 접수 화면 확인 필요
```

이유:

- 필기시험장 목록만으로 일반조종면허/요트조종면허 가능 여부를 단정하지 않습니다.
- 공식 접수 화면 또는 시험장별 응시가능 시험 안내에서 추가 확인이 필요합니다.

### 4. sourceUrl/sourceCheckedAt 처리

같은 병합 그룹의 `sourceUrl`과 `sourceCheckedAt`이 같으면 대표 값을 유지합니다.

다른 경우:

```text
복수 공식 출처 확인 필요
```

를 `note`에 표시합니다.

현재 미리보기 병합에서는 병합 그룹의 공식 출처와 확인일이 모두 같은 출처 기준이므로 대표 값을 유지했습니다.

### 5. 주소 처리

원문 주소를 그대로 유지합니다.

아직 `normalizedAddress`는 추가하지 않습니다.

주소 정규화와 지도 좌표 수집은 별도 단계로 분리합니다.

## 병합 전/후 기준

| 항목 | 값 |
| --- | ---: |
| 병합 전 행 수 | 139 |
| 병합 후 행 수 | 127 |
| 줄어든 행 수 | 12 |
| 병합 그룹 수 | 12 |

## 앱 반영 전 체크리스트

- [x] 같은 주소 + 다른 type은 별도 행 유지
- [x] 같은 주소 + 같은 type + 다른 license는 병합
- [x] 필기시험장 availableLicenses 빈 값 유지
- [x] 필기시험장 note 보강
- [x] 원문 주소 유지
- [ ] 병합된 name 표기 방식 최종 확인
- [ ] 병합 id 네이밍 최종 확인
- [ ] 지도 좌표 수집 전 주소 정규화 정책 확정

## 결론

이번 병합 정책은 앱 반영 전 미리보기 기준으로 사용할 수 있습니다.

핵심 원칙은 `type` 중심 분리와 `license` 중심 병합입니다. 즉, 사용 목적이 다른 시설은 분리하고, 같은 시설 종류 안에서 일반/요트만 나뉜 경우는 병합합니다.
