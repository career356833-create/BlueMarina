#!/usr/bin/env python3
"""language 파라미터 보조 조사. 지정된 5개 값만 시험하고 끝낸다."""
import asyncio, json, sys
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")
from src.detail_client import LIST_API_URL, DEFAULT_HEADERS
from src import paths

VALUES = ["", "ko", "kor", "en", "eng"]


async def main():
    paths.ensure_dirs()
    out, baseline = {}, None
    async with httpx.AsyncClient(timeout=30.0) as c:
        for v in VALUES:
            await asyncio.sleep(2)
            r = await c.post(LIST_API_URL,
                             headers={**DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest"},
                             data={"language": v})
            rows = r.json().get("retList", [])
            ids = sorted(x["fishId"] for x in rows)
            names = [x["fishName"] for x in rows]
            rec = {
                "language": v, "httpStatus": r.status_code, "count": len(rows),
                "idSetHash": hash(tuple(ids)), "firstNames": names[:5],
                "fieldKeys": sorted(rows[0].keys()) if rows else [],
            }
            if baseline is None:
                baseline = ids
                rec["sameAsBaseline"] = True
            else:
                rec["sameAsBaseline"] = ids == baseline
            out[v or "(빈값)"] = rec
            print(f"language={v!r:6} status={r.status_code} count={len(rows)} "
                  f"동일={rec['sameAsBaseline']} 첫이름={names[:3]}")

    diff = [k for k, v in out.items() if not v["sameAsBaseline"]]
    result = {
        "testedValues": VALUES,
        "results": out,
        "differingValues": diff,
        "conclusion": ("의미 있는 차이 없음 — 기본값 공백으로 전체 수집한다."
                       if not diff else f"차이 발견: {diff}"),
    }
    p = paths.REPORTS / "language-parameter-test.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{result['conclusion']}\n저장: {p}")


asyncio.run(main())
