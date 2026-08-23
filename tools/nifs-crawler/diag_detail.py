#!/usr/bin/env python3
"""Phase 2.5 진단: 상세 URL 실제 응답 확인"""
import asyncio, json, hashlib
from pathlib import Path
import httpx

BASE = "https://nifs.go.kr"
LIST_PAGE = f"{BASE}/portal/fr/chrpA/actionChrpFishList.do"
DATA = Path(__file__).parent.parent.parent / "data" / "nifs"
OUT = DATA / "phase2_5"
OUT.mkdir(parents=True, exist_ok=True)

SAMPLES = [
    ("fish_1571806850754", "갈치"),
    ("fish_1571803943319", "고등어"),
    ("fish_1576045793538", "꽃게"),
    ("fish_1575596889118", "낙지"),
    ("fish_1575613737728", "대구"),
]

# 시도할 URL 후보
CANDIDATES = [
    ("actionChrpFish.do?fishId=", "GET", f"{BASE}/portal/fr/chrpA/actionChrpFish.do"),
    ("actionChrpFishList.do?fishId=", "GET", f"{BASE}/portal/fr/chrpA/actionChrpFishList.do"),
    ("selectChrpFish.do POST", "POST", f"{BASE}/portal/fr/chrpA/selectChrpFish.do"),
    ("selectChrpFishInfo.do POST", "POST", f"{BASE}/portal/fr/chrpA/selectChrpFishInfo.do"),
    ("selectChrpFishDetail.do POST", "POST", f"{BASE}/portal/fr/chrpA/selectChrpFishDetail.do"),
]

HDRS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Referer": LIST_PAGE,
    "Origin": BASE,
    "X-Requested-With": "XMLHttpRequest",
}


async def main():
    results = {}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as c:
        fid, fname = SAMPLES[0]
        print(f"=== URL 후보 탐색 (샘플: {fname} / {fid}) ===\n")
        for label, method, url in CANDIDATES:
            try:
                if method == "GET":
                    r = await c.get(url, params={"fishId": fid}, headers=HDRS)
                else:
                    r = await c.post(url, data={"fishId": fid}, headers=HDRS)
                body = r.content
                info = {
                    "label": label, "method": method, "url": str(r.url),
                    "status": r.status_code,
                    "contentType": r.headers.get("content-type", ""),
                    "length": len(body),
                    "location": r.headers.get("location"),
                    "sha256": hashlib.sha256(body).hexdigest()[:16],
                    "hasFishId": fid.encode() in body,
                    "hasFishNameUtf8": fname.encode("utf-8") in body,
                    "hasFishNameEuc": fname.encode("euc-kr", errors="ignore") in body,
                }
                results[label] = info
                print(f"[{label}]")
                print(f"  status={r.status_code} len={len(body)} ct={info['contentType'][:40]}")
                print(f"  location={info['location']}")
                print(f"  fishId in body={info['hasFishId']}  name(utf8)={info['hasFishNameUtf8']} name(euckr)={info['hasFishNameEuc']}")
                print()
            except Exception as e:
                results[label] = {"label": label, "error": str(e)}
                print(f"[{label}] ERROR: {e}\n")

    (OUT / "url-candidates.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장: {OUT / 'url-candidates.json'}")


asyncio.run(main())
