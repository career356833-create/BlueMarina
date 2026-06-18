# Blue Marina Portal Structure Snapshot

작성일: 2026-06-17

이 문서는 커밋 전 복구 지점 확보를 위한 현재 포털 구조 요약입니다. 배포 문서가 아니라, 현재 구현 범위와 준비중 범위를 빠르게 확인하기 위한 기준 문서입니다.

## 현재 완성된 핵심 기능

- 일반조종면허 700문항, 요트조종면허 700문항 내장 데이터 기반 학습 구조
- `licenseType` 기반 일반/요트 문제은행 분리
- 면허별 문제풀이, 랜덤문제, 50문항 모의고사, 오답노트, 진도율, 학습분석
- 면허별 localStorage 분리 저장
- Blue Marina 8대 학습체계 기반 카테고리/태그 분석
- 이론학습 목차 30개 및 관련 문제 자동 연결 구조
- 일부 이론 콘텐츠 ready 상태
  - 수상레저안전법과 운항 제한
  - 조종면허·면허시험·면허증
  - 등화 식별
  - 조석·조류
  - 구명설비
- PWA manifest, 광고 placeholder, 정책 페이지 기본 구조
- Blue Marina 포털 홈 및 Coming Soon placeholder 페이지

## 포털 홈 8개 섹션

### 1. 학습센터

현재 기능과 연결된 섹션입니다.

- 문제풀이
- 랜덤문제
- 모의고사
- 오답노트
- 학습분석
- 이론학습

### 2. 면허센터

포털 골격 중심의 준비 구조입니다.

- 면허취득 가이드
- 필기시험 안내
- 실기시험 안내: 준비중
- 수상안전교육
- 면허증 발급
- 레저활동 신고

### 3. 시설안내

- 시험장 안내
- 교육장 안내: 준비중
- 공식 신청센터
- 지도 서비스: 준비중

### 4. 해양정보

현재 전부 준비중입니다.

- 조석표
- 물때 정보
- 해상날씨
- 항로표지 가이드

### 5. 실기학습

현재 전부 준비중입니다.

- 실기 코스
- 실격사유
- 실기 체크리스트
- 실기 영상

### 6. 해양용품

현재 전부 준비중이며, 추후 광고/어필리에이트 영역으로 확장할 수 있습니다.

- 구명조끼
- 안전장비
- 선박용품
- 추천도구

### 7. 프리미엄

현재 전부 준비중이며 Premium 배지를 사용합니다.

- AI 학습코치
- AI 오답분석
- AI 면허도우미

### 8. 커뮤니티

현재 전부 준비중입니다.

- 공지사항
- 합격후기
- 질문답변

## 광고 슬롯 위치

- Hero 아래
- 면허센터 아래
- 해양정보 아래
- 해양용품 영역

현재는 실제 광고 코드 없이 placeholder만 표시합니다.

## QA 스크린샷

- 홈 모바일: `work/screenshots/portal-home-mobile-stitched.png`
- 홈 데스크톱: `work/screenshots/portal-home-desktop-stitched.png`
- 준비중 페이지 모바일: `work/screenshots/coming-soon-mobile-stitched.png`
- 준비중 페이지 데스크톱: `work/screenshots/coming-soon-desktop-stitched.png`

## 준비중 기능

- 일반/요트 외 추가 면허 또는 세부 과정
- 나머지 이론 콘텐츠 본문 작성
- 검증된 시험 절차, 수수료, 응시자격, 교육 일정 콘텐츠
- 시험장/교육장 실제 지역, 주소, 전화번호, 지도 데이터
- 공식 신청 링크의 실사용 URL 확정
- 조석표, 물때, 해상날씨, 항로표지 정보
- 실기 코스, 실격사유, 실기 영상
- 해양용품 추천 및 어필리에이트
- AI 학습코치, AI 오답분석, AI 면허도우미
- 커뮤니티 기능
- 실제 AdSense 코드 연동
- PWA 오프라인 캐시 고도화

## 배포 전 확인 기준

- `npm run lint`
- `npm run build`
- `/` 홈 포털 모바일/데스크톱 시각 확인
- `/coming-soon?section=해양정보&feature=조석표` 준비중 페이지 확인
- `/study?license=general`
- `/study?license=yacht`
- `/random?license=general`
- `/random?license=yacht`
- `/exam?license=general`
- `/exam?license=yacht`
- `/analysis?license=general`
- `/analysis?license=yacht`
- `/theory`

## 커밋 전 메모

- 현재 목적은 배포가 아니라 복구 지점 확보입니다.
- 아직 커밋하지 않은 상태에서 lint/build 결과를 확인한 뒤 커밋 여부를 결정합니다.
