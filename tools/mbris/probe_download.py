#!/usr/bin/env python3
"""MBRIS 국가 해양수산생물종 목록집 다운로드 요청 구조 조사."""
import re, sys, json
from pathlib import Path
import httpx
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding="utf-8")

PAGE = "https://www.mbris.kr/pub/marine/natilist/nationalist.do"
BASE = "https://www.mbris.kr"
HDRS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

r = httpx.get(PAGE, headers=HDRS, timeout=60.0, follow_redirects=True, verify=False)
print(f"페이지: {r.status_code} {len(r.content)} bytes  final={r.url}")
html = r.text

soup = BeautifulSoup(html, "html.parser")

print("\n--- 다운로드 관련 앵커/버튼 ---")
for a in soup.find_all(["a", "button"]):
    txt = a.get_text(strip=True)
    attrs = {k: v for k, v in a.attrs.items() if k in ("href", "onclick", "id", "class", "data-url")}
    blob = f"{txt} {attrs}"
    if any(k in blob.lower() for k in ("download", "다운", "xlsx", "excel", "엑셀", "파일", "file")):
        print(f"  {txt!r:30} {attrs}")

print("\n--- inline script 중 download/file 관련 ---")
for m in re.finditer(r"<script[^>]*>(.*?)</script>", html, re.S):
    s = m.group(1)
    if re.search(r"(download|fileDown|atchFile|xlsx|엑셀)", s, re.I):
        print(f"  ----- len={len(s)} -----")
        print("  " + s.strip()[:2500].replace("\n", "\n  "))

print("\n--- .do / .xlsx URL 후보 ---")
for u in sorted(set(re.findall(r'["\'](/[^"\']*?(?:[Dd]own|[Ff]ile|xlsx)[^"\']*?)["\']', html))):
    print("  ", u)

Path("mbris-page.html").write_text(html, encoding="utf-8")
print("\n페이지 저장: mbris-page.html")
