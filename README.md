# Blue Marina - 조종면허 학습앱

Blue Marina(블루마리나)는 수상동력기구 조종면허 필기시험 대비 학습앱입니다.

- 슬로건: 바다로 가는 가장 쉬운 길
- 운영/제작 브랜드: 암행漁사
- short name: BluePass

## 주요 기능

- 요트조종면허 700문항 내장 문제은행
- Blue Marina v3 8대 학습체계 기반 카테고리/태그 학습
- 랜덤 문제풀이
- 50문항 모의고사
- 오답노트
- 진도율
- 약점분석 리포트
- 합격예측
- PWA 설치 구조
- 애드센스 광고 슬롯 placeholder

## 다중 면허 구조

현재 앱은 다중 면허 문제은행 구조를 지원합니다.

- `licenseType: "yacht"`: 요트조종면허, 현재 700문항 탑재
- `licenseType: "general"`: 일반조종면허, 추후 700문항 탑재 예정

데이터 구조:

- `src/data/yacht-questions.ts`: 요트조종면허 문제은행
- `src/data/general-questions.ts`: 일반조종면허 문제은행, 현재 빈 배열
- `src/data/questions.ts`: 두 문제은행을 합치는 통합 entry

URL 파라미터:

- `/study?license=yacht`
- `/random?license=yacht`
- `/exam?license=yacht`
- `/wrong?license=yacht`
- `/progress?license=yacht`
- `/analysis?license=yacht`

`license` 파라미터가 없으면 기본값은 `yacht`입니다.

localStorage는 면허별로 분리됩니다.

- `blue-marina:yacht:progress`
- `blue-marina:yacht:wrong`
- `blue-marina:yacht:exam-history`
- `blue-marina:yacht:answer-history`
- `blue-marina:general:progress`
- `blue-marina:general:wrong`
- `blue-marina:general:exam-history`
- `blue-marina:general:answer-history`

개발 단계에서는 기존 localStorage 기록을 마이그레이션하지 않습니다. 화면 확인 중 데이터가 꼬이면 브라우저 개발자 도구에서 사이트 데이터를 초기화하세요.

## 문항 분류 데이터

- `src/data/question-category-map.csv`: v1, NotebookLM 초기 분류. 폐기.
- `src/data/question-category-map-v2.csv`: v2, 5대 분류 개선안. 보관.
- `src/data/question-category-map-v3.csv`: v3, Blue Marina 최종 8대 학습체계. 현재 기준.

현재 `src/data/yacht-questions.ts`의 분류 필드는 v3 기준으로 반영되어 있습니다.

## 실행

```bash
npm install
npm run dev
```

Windows PowerShell에서 스크립트 실행 정책 때문에 `npm`이 막히면 다음 명령을 사용하세요.

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검증

```bash
npm run lint
npm run build
```

Windows PowerShell에서는:

```bash
npm.cmd run lint
npm.cmd run build
```

## 환경변수

`.env.example`을 참고하세요. 광고와 PWA 관련 값은 실제 배포 전에 확정합니다.
