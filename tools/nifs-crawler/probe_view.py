#!/usr/bin/env python3
"""actionChrpFishView.do 검증 + 본문 구조 덤프"""
import asyncio, json, sys, io
from pathlib import Path
import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")
from src.detail_client import fetch_detail, fetch_list, DEFAULT_HEADERS

OUT = Path(__file__).parent.parent.parent / "data" / "nifs" / "phase2_5"
OUT.mkdir(parents=True, exist_ok=True)

TARGETS = ["갈치", "고등어", "꽃게", "낙지", "대구"]


async def main():
    async with httpx.AsyncClient(timeout=30.0) as c:
        data = await fetch_list(c)
        rows = data["retList"]
        print(f"목록 API: {len(rows)}건\n")

        picked = [r for r in rows if r["fishName"] in TARGETS]
        print("샘플:", [r["fishName"] for r in picked], "\n")

        summary = {}
        for r in picked:
            await asyncio.sleep(2)
            d = await fetch_detail(c, r["fishId"])
            soup = BeautifulSoup(d.html, "html.parser")

            # 컨텐츠 영역 후보 탐색
            title = soup.title.get_text(strip=True) if soup.title else ""
            h3s = [h.get_text(strip=True) for h in soup.find_all(["h3", "h4"])]
            tables = soup.find_all("table")
            dl = soup.find_all("dl")

            name_in = r["fishName"] in d.html
            print(f"--- {r['fishName']} ({r['fishId']}) ---")
            print(f"  status={d.http_status} len={d.content_length} hash={d.content_hash[:12]}")
            print(f"  final={d.final_url}")
            print(f"  title={title}")
            print(f"  fishName in html = {name_in}")
            print(f"  h3/h4({len(h3s)}): {h3s[:20]}")
            print(f"  table={len(tables)} dl={len(dl)}")

            summary[r["fishId"]] = {
                "fishName": r["fishName"], "status": d.http_status,
                "length": d.content_length, "hash": d.content_hash,
                "finalUrl": d.final_url, "title": title,
                "nameInHtml": name_in, "headings": h3s,
                "tableCount": len(tables), "dlCount": len(dl),
            }
            (OUT / f"view-{r['fishName']}.html").write_text(d.html, encoding="utf-8")
            print()

        hashes = {v["hash"] for v in summary.values()}
        print(f"고유 HTML 해시: {len(hashes)}/{len(summary)}  -> {'OK 서로 다름' if len(hashes)==len(summary) else '동일 응답 의심'}")

        (OUT / "view-probe.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


asyncio.run(main())
