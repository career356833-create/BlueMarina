# Blue Marina 해설 보완 1차 반영 보고서

생성일: 2026-06-19T02:58:17.149Z

## 반영 원칙

- QC 결과 `ready`인 161개만 반영했습니다.
- `needs-review` 7개와 `reject` 1개는 반영하지 않았습니다.
- `question`, `choices`, `answer`, `category`, `subCategory`, `detailCategory`, `tags`는 값 기준으로 변경되지 않았음을 검증했습니다.
- 원본 데이터 파일에서 `explanation` 필드만 갱신했습니다.

## 반영 통계

- 전체 문항 수: 1400
- 일반조종면허 문항 수: 700
- 요트조종면허 문항 수: 700
- ready 대상 수: 161
- 실제 반영 수: 161
- 일반조종면허 반영 수: 13
- 요트조종면허 반영 수: 148
- 미반영 대상 수: 8
- 남은 해설 누락 수: 8

## 무결성 검증

- 전체 1,400문항 유지: PASS
- 일반 700문항 유지: PASS
- 요트 700문항 유지: PASS
- ready 161개 explanation 반영: PASS
- needs-review/reject 미반영: PASS
- explanation 외 필드 변경 없음: PASS

## 미반영 needs-review/reject 목록

| 상태 | 면허 | ID | 카테고리 | 사유 |
| --- | --- | --- | --- | --- |
| needs-review | general | 293 | 기관 및 정비 | TOP50 엄격 검수: 수치·조문 표현 수동 확인 필요 / 수치·조문 표현 수동 확인 필요 |
| needs-review | yacht | 108 | 선박 조종술 및 운용 | 문장 수 기준 이탈(6문장) |
| reject | yacht | 330 | 항해·해도·항로표지 | 문장 수 기준 이탈(9문장) / 수치·조문 표현 수동 확인 필요 |
| needs-review | yacht | 350 | 법규·행정 | TOP50 엄격 검수: 수치·조문 표현 수동 확인 필요 / 수치·조문 표현 수동 확인 필요 |
| needs-review | yacht | 539 | 법규·행정 | TOP50 엄격 검수: 수치·조문 표현 수동 확인 필요 / 수치·조문 표현 수동 확인 필요 |
| needs-review | yacht | 576 | 법규·행정 | 문장 수 기준 이탈(6문장) |
| needs-review | yacht | 610 | 법규·행정 | TOP50 엄격 검수: 수치·조문 표현 수동 확인 필요 / 수치·조문 표현 수동 확인 필요 / 카테고리 핵심어와 해설 연결 약함 |
| needs-review | yacht | 624 | 항해·해도·항로표지 | TOP50 엄격 검수: 수치·조문 표현 수동 확인 필요 / 수치·조문 표현 수동 확인 필요 |

## 남은 해설 누락 목록

| 면허 | ID | 카테고리 | 누락상태 |
| --- | --- | --- | --- |
| general | 293 | 기관 및 정비 | empty_string |
| yacht | 108 | 선박 조종술 및 운용 | empty_string |
| yacht | 330 | 항해·해도·항로표지 | empty_string |
| yacht | 350 | 법규·행정 | empty_string |
| yacht | 539 | 법규·행정 | empty_string |
| yacht | 576 | 법규·행정 | empty_string |
| yacht | 610 | 법규·행정 | empty_string |
| yacht | 624 | 항해·해도·항로표지 | empty_string |

## 상세 검증 이슈

- ready 미반영: 없음
- blocked 변경: 없음
- 무결성 이슈: 없음
