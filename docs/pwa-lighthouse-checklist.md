# PWA 및 Lighthouse 점검 체크리스트

## PWA 설치

- Manifest가 정상 로드되는지 확인한다.
- Service Worker가 등록되는지 확인한다.
- 스마트폰 브라우저에서 홈화면 설치가 가능한지 확인한다.
- 설치 후 standalone 모드로 실행되는지 확인한다.
- 오프라인 진입 시 기본 화면 또는 캐시된 학습 화면이 열리는지 확인한다.

## 모바일 화면

- 390px 모바일 폭에서 가로 스크롤이 없는지 확인한다.
- 하단 네비게이션이 주요 버튼을 가리지 않는지 확인한다.
- 문제 지문과 해설이 긴 경우 세로 스크롤로 자연스럽게 읽히는지 확인한다.
- 보기 버튼 터치 영역이 최소 48px 이상인지 확인한다.

## Lighthouse

- Lighthouse Performance 점수를 확인한다.
- Lighthouse Accessibility 점수를 확인한다.
- Lighthouse Best Practices 점수를 확인한다.
- Lighthouse SEO 점수를 확인한다.
- PWA 항목에서 installable 관련 경고가 없는지 확인한다.
