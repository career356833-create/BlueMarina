#!/usr/bin/env python3
"""Tier A(86종) MBRIS 상세 정보 수집.

    python collect_mbris_detail.py --dry-run
    python collect_mbris_detail.py --sample 5
    python collect_mbris_detail.py --names 갈치,고등어,참돔,주꾸미,꽃게
    python collect_mbris_detail.py --tier-a
    python collect_mbris_detail.py --tier-a --force   # 완료건도 재수집
    python collect_mbris_detail.py --retry-failed     # status=failed 항목만 다시 시도

--sample N은 service-tier-a.json에 저장된 순서 그대로 앞에서 N종을 뽑는다(점수순
정렬 결과라 특정 어종을 지정하지 못한다). 특정 어종을 지정해야 하면 --names를
쓴다 — 국명이 정확히 일치하는 항목만 고르고, 하나라도 못 찾으면 즉시 에러를
내 임의로 다른 종을 대신 넣지 않는다."""
from __future__ import annotations

import argparse
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8")

from src.config import load_config, REQUEST_INTERVAL_SECONDS
from src.detail_collector import DetailCollector, load_tier_a_candidates
from src.detail_state import DetailCollectionState, COMPLETE, FAILED, PENDING

ROOT = Path(__file__).resolve().parent.parent.parent
MBRIS = ROOT / "data" / "mbris"
TIER_A_FILE = MBRIS / "priority" / "service-tier-a.json"
RAW_DETAIL = MBRIS / "raw" / "detail"
NORMALIZED_DETAIL = MBRIS / "normalized" / "detail"
API_DIR = MBRIS / "raw" / "api"
STATE_PATH = MBRIS / "state" / "detail-collection-state.json"


def main() -> None:
    ap = argparse.ArgumentParser(description="MBRIS Tier A 상세 수집기")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sample", type=int, default=None, help="앞에서 N종만 수집")
    ap.add_argument("--names", type=str, default=None,
                    help="쉼표로 구분한 국명 목록만 수집(예: 갈치,고등어,참돔,주꾸미,꽃게). "
                         "service-tier-a.json에 실제 존재하는 이름만 허용 — 하나라도 없으면 중단")
    ap.add_argument("--tier-a", action="store_true", help="Tier A 전체 수집")
    ap.add_argument("--force", action="store_true", help="완료 항목도 재수집")
    ap.add_argument("--retry-failed", action="store_true",
                    help="현재 status=failed인 항목만 골라 재시도(완료건은 건드리지 않음)")
    args = ap.parse_args()

    if not TIER_A_FILE.exists():
        raise SystemExit(f"{TIER_A_FILE} 가 없다. build_species_profile.py를 먼저 실행할 것.")

    candidates, issues = load_tier_a_candidates(TIER_A_FILE)
    print(f"[입력 검증] 유효 {len(candidates)}건")
    for msg in issues:
        print(f"  ⚠️  {msg}")

    if args.names:
        wanted = [n.strip() for n in args.names.split(",") if n.strip()]
        by_name = {c["koreanName"]: c for c in candidates}
        missing = [n for n in wanted if n not in by_name]
        if missing:
            raise SystemExit(f"service-tier-a.json에 없는 국명(임의 생성 금지): {missing}")
        candidates = [by_name[n] for n in wanted]
        print(f"[이름 지정 모드] {len(candidates)}종: "
              f"{[(c['koreanName'], c['internalId']) for c in candidates]}")
    elif args.retry_failed:
        state = DetailCollectionState.load(STATE_PATH)
        failed_ids = {iid for iid, st in state.items.items() if st.status == FAILED}
        candidates = [c for c in candidates if c["internalId"] in failed_ids]
        print(f"[재시도 모드] status=failed {len(candidates)}건: "
              f"{[(c['koreanName'], c['internalId']) for c in candidates]}")
        if not candidates:
            print("재시도할 failed 항목이 없다.")
            return
    elif args.sample:
        candidates = candidates[: args.sample]
        print(f"[샘플 모드] {len(candidates)}종만 처리")

    config = load_config()
    print(f"[설정] base_url={config.base_url}  키 설정됨={config.is_configured}")

    if args.dry_run:
        # 중복 여부: load_tier_a_candidates가 이미 internalId 기준으로 제거했다.
        seen_ids = [c["internalId"] for c in candidates]
        dup_count = len(seen_ids) - len(set(seen_ids))

        state = DetailCollectionState.load(STATE_PATH)
        skip_list, retry_list, new_list = [], [], []
        for c in candidates:
            st = state.items.get(c["internalId"])
            if st is None or st.status == PENDING:
                new_list.append(c)
            elif st.status == COMPLETE and not args.force:
                skip_list.append(c)
            elif st.status == FAILED:
                retry_list.append(c)
            else:  # force 지정 시 COMPLETE도 재수집 대상
                new_list.append(c)

        print("\n[DRY-RUN] 실제 API를 호출하지 않는다.")
        print(f"  전체 대상: {len(candidates)}건, 중복 internalId: {dup_count}건")
        print(f"  이미 완료(skip): {len(skip_list)}건" +
              (f" — {[c['internalId'] for c in skip_list]}" if skip_list else ""))
        print(f"  이전 실패(재시도 대상): {len(retry_list)}건" +
              (f" — {[c['internalId'] for c in retry_list]}" if retry_list else ""))
        print(f"  신규(pending): {len(new_list)}건")

        to_call = retry_list + new_list if not args.force else candidates
        print(f"\n  실제 실행 시 호출될 건수: {len(to_call)}건")
        for c in to_call[:10]:
            print(f"  GET {config.taxonlist_url}?SpcScitfNm={c['scientificName']}"
                  f"  (internalId={c['internalId']}, koreanName={c.get('koreanName')})")
        if len(to_call) > 10:
            print(f"  ... 외 {len(to_call) - 10}종")
        print(f"\n요청 간격 {REQUEST_INTERVAL_SECONDS}초, 실패 상태는 재실행 전까지 유지됨")
        return

    if not (args.sample or args.names or args.tier_a or args.retry_failed):
        raise SystemExit("--dry-run, --sample N, --names ..., --tier-a, --retry-failed 중 하나를 지정할 것.")

    if not config.is_configured:
        print("\n❌ MBRIS_API_KEY가 설정되지 않았다.")
        print("   tools/mbris/.env.example을 tools/mbris/.env로 복사하고 키를 채운 뒤 재실행할 것.")
        print("   (키 없이 구조만 확인하려면 --dry-run 사용)")
        raise SystemExit(1)

    collector = DetailCollector(config=config, raw_detail_dir=RAW_DETAIL,
                                normalized_detail_dir=NORMALIZED_DETAIL,
                                api_dir=API_DIR, state_path=STATE_PATH)

    results = Counter()
    started = time.monotonic()
    for i, c in enumerate(candidates, 1):
        if i > 1:
            time.sleep(REQUEST_INTERVAL_SECONDS)
        status = collector.collect_one(c, force=args.force)
        results[status] += 1
        mark = "✅" if status == COMPLETE else "❌"
        print(f"  [{i:3d}/{len(candidates)}] {mark} {c.get('koreanName', ''):8s} "
              f"{c['internalId']} — {status}")

    elapsed = time.monotonic() - started
    print(f"\n[완료] 성공 {results[COMPLETE]} / 실패 {results[FAILED]} / 소요 {elapsed:.1f}초")


if __name__ == "__main__":
    main()
