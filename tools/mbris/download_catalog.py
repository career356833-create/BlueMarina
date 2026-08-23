#!/usr/bin/env python3
"""MBRIS 국가 해양수산생물종 목록집 XLSX 다운로드. 원본을 덮어쓰지 않는다."""
import hashlib, json, sys, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

import httpx

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "data" / "mbris" / "raw" / "catalog"
ORIG = OUT / "original"

PAGE = "https://www.mbris.kr/pub/marine/natilist/nationalist.do"
EXCEL = "https://www.mbris.kr/pub/marine/natilist/selectNationalBoardExcel.ajax"
HDRS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
    "Accept-Language": "ko-KR,ko;q=0.9",
}
# 화면 form#frm의 실제 필드
PARAMS = {"pageIndex": "1", "pageUnit": "10", "searchWrd": ""}


def filename_from_disposition(cd: str | None) -> str | None:
    if not cd:
        return None
    m = re.search(r"filename\*=UTF-8''([^;]+)", cd)
    if m:
        return unquote(m.group(1))
    m = re.search(r'filename="?([^";]+)"?', cd)
    return unquote(m.group(1)) if m else None


def main() -> None:
    ORIG.mkdir(parents=True, exist_ok=True)
    started = datetime.now(timezone.utc).isoformat()

    with httpx.Client(headers=HDRS, timeout=300.0, follow_redirects=True, verify=False) as c:
        page = c.get(PAGE)
        print(f"[1] 페이지 {page.status_code}  쿠키 {list(c.cookies.keys())}")

        # form#frmDown에 method 속성이 없다 → HTML 기본값 GET
        r = c.get(EXCEL, params=PARAMS, headers={"Referer": PAGE})
        print(f"[2] 다운로드 {r.status_code}  {len(r.content):,} bytes")
        print(f"    Content-Type: {r.headers.get('content-type')}")
        print(f"    Content-Disposition: {r.headers.get('content-disposition')}")
        print(f"    리다이렉트: {[str(h.url) for h in r.history]}")

        if r.status_code != 200 or len(r.content) < 10_000:
            print("    ❌ 응답이 파일로 보이지 않는다. 본문 앞부분:")
            print("   ", r.text[:500])
            raise SystemExit(1)

        body = r.content
        if body[:2] != b"PK":
            print("    ❌ XLSX(zip) 시그니처가 아니다.")
            raise SystemExit(1)

        server_name = filename_from_disposition(r.headers.get("content-disposition"))
        dest = ORIG / "mbris-national-species-catalog.xlsx"
        if dest.exists():
            if hashlib.sha256(dest.read_bytes()).hexdigest() == hashlib.sha256(body).hexdigest():
                print(f"    이미 동일 파일이 있다 — 덮어쓰지 않는다: {dest.name}")
            else:
                stamp = started.replace(":", "").replace("+", "Z")
                keep = ORIG / f"mbris-national-species-catalog.{stamp}.xlsx"
                dest.rename(keep)
                print(f"    기존 파일 보존: {keep.name}")
                dest.write_bytes(body)
        else:
            dest.write_bytes(body)

        meta = {
            "sourceProvider": "MBRIS",
            "downloadPageUrl": PAGE,
            "fileRequestUrl": EXCEL,
            "requestMethod": "GET",
            "requestContentType": None,
            "requestParams": PARAMS,
            "loginRequired": False,
            "sessionCookieUsed": list(c.cookies.keys()),
            "redirects": [str(h.url) for h in r.history],
            "httpStatus": r.status_code,
            "responseContentType": r.headers.get("content-type"),
            "contentDisposition": r.headers.get("content-disposition"),
            "serverFileName": server_name,
            "localFileName": dest.name,
            "fileSizeBytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "downloadedAt": started,
            "publicDataPortal": "https://www.data.go.kr/data/15063771/fileData.do",
        }
        (OUT / "metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 저장: {dest}")
    print(f"   서버 파일명: {server_name}")
    print(f"   크기: {len(body):,} bytes")
    print(f"   SHA-256: {meta['sha256']}")


if __name__ == "__main__":
    main()
