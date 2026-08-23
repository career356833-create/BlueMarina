# NIFS Crawler Inspection Tool

이 도구는 국립수산과학원 어종정보 사이트의 구조를 분석하여 크롤링 가능성을 검토합니다.

**목표**: 실제 대량 크롤링 전에 사이트 구조, API, 페이지네이션 방식을 파악

## 설치

```bash
cd tools/nifs-crawler
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
playwright install chromium
```

## 사용법

```bash
# 전체 검사 실행
python inspect_nifs.py

# 결과는 data/nifs/inspection/ 에 저장됨
```

## 결과 위치

- `data/nifs/inspection/list/` - 목록 페이지 HTML, 스크린샷
- `data/nifs/inspection/detail/` - 상세 페이지 (샘플)
- `data/nifs/inspection/network/` - 네트워크 로그, API 응답
- `data/nifs/inspection/screenshots/` - 스크린샷
- `data/nifs/logs/` - 실행 로그

## 검사 내용

1. ✅ 목록 페이지 렌더링 방식 (HTTP vs Playwright)
2. ✅ 네트워크 API 분석
3. ✅ 페이지네이션 구조
4. ✅ 상세 페이지 필드
5. ✅ 이미지 메타데이터
6. ✅ 검사 보고서 생성

## 설계 원칙

- 과도한 요청 금지 (목록 3페이지, 상세 3개만 검사)
- 원본 보존 (HTTP 응답, 렌더링 HTML 분리 저장)
- 메타데이터 기록 (모든 요청 로그, 응답 저장)
- Windows 호환성 (경로 관리)
- 에러 처리 (모든 오류 기록)
