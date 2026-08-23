#!/usr/bin/env python3
"""§11: NIFS 연결 25종을 MBRIS 상세 수집 결과와 대조한다.
NIFS 원본(nifs-mbris-link.json)도 MBRIS 원본도 이 스크립트로 수정하지 않는다 —
읽기만 해서 비교 CSV 한 장을 만든다."""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent
MAPPINGS = ROOT / "data" / "mbris" / "mappings"
NORMALIZED_DETAIL = ROOT / "data" / "mbris" / "normalized" / "detail"
REPORTS = ROOT / "data" / "mbris" / "reports"


def main() -> None:
    nifs_links = json.loads((MAPPINGS / "nifs-mbris-link.json").read_text(encoding="utf-8"))

    rows = []
    for link in nifs_links:
        iid = link.get("mbrisInternalId")
        detail_path = NORMALIZED_DETAIL / f"{iid}.json"
        if not detail_path.exists():
            rows.append({
                "internalId": iid, "nifsName": link["nifsName"],
                "nifsScientificName": link["nifsScientificName"],
                "mbrisKoreanName": "", "mbrisScientificNameShort": "",
                "matchType": link["matchType"], "sciNameConflict": "",
                "domesticDistribution": "", "internationalDistribution": "",
                "form": "", "ecologyNotes": "", "note": "MBRIS 상세 미수집",
            })
            continue

        detail = json.loads(detail_path.read_text(encoding="utf-8"))
        mbris_sci_short = detail["basic"]["scientificNameShort"]
        sci_conflict = "different" if mbris_sci_short != link["nifsScientificName"] else "same"

        def short(s: str | None, n: int = 60) -> str:
            if not s:
                return ""
            return s if len(s) <= n else s[:n] + "..."

        rows.append({
            "internalId": iid,
            "nifsName": link["nifsName"],
            "nifsScientificName": link["nifsScientificName"],
            "mbrisKoreanName": detail["basic"]["koreanName"] or "",
            "mbrisScientificNameShort": mbris_sci_short or "",
            "matchType": link["matchType"],
            "sciNameConflict": sci_conflict,
            "domesticDistribution": short(detail["ecology"]["domesticDistribution"]),
            "internationalDistribution": short(detail["ecology"]["internationalDistribution"]),
            "form": short(detail["ecology"]["form"]),
            "ecologyNotes": short(detail["ecology"]["ecologyNotes"]),
            "note": link.get("note") or "",
        })

    header = ["internalId", "nifsName", "nifsScientificName", "mbrisKoreanName",
              "mbrisScientificNameShort", "matchType", "sciNameConflict",
              "domesticDistribution", "internationalDistribution", "form", "ecologyNotes", "note"]
    REPORTS.mkdir(parents=True, exist_ok=True)
    with (REPORTS / "nifs-mbris-tier-a-detail-comparison.csv").open(
            "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)

    conflicts = [r for r in rows if r["sciNameConflict"] == "different"]
    ecology_available = sum(1 for r in rows if r["ecologyNotes"] or r["form"])

    print(f"[1] NIFS 연결 {len(rows)}종 비교")
    print(f"    학명 충돌(NIFS≠MBRIS): {len(conflicts)}건")
    for c in conflicts[:10]:
        print(f"      {c['nifsName']}: NIFS={c['nifsScientificName']!r} "
              f"MBRIS={c['mbrisScientificNameShort']!r}")
    print(f"    형태/생태 서술 확보: {ecology_available}/{len(rows)}건")
    print(f"\n✅ 저장: {REPORTS / 'nifs-mbris-tier-a-detail-comparison.csv'}")


if __name__ == "__main__":
    main()
