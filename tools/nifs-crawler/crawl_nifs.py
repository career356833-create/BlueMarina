#!/usr/bin/env python3
"""NIFS 주요 수산자원 25종 수집기.

    python crawl_nifs.py list|detail|images|normalize|validate|all|resume|retry-failed
    python crawl_nifs.py all --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from src import paths, validator
from src.detail_client import (
    LIST_API_URL, LIST_API_BODY, DETAIL_API_URL, DEFAULT_HEADERS,
    build_detail_url,
)
from src.image_client import (
    download_image, mark_duplicates, detail_role, ROLE_LIST_THUMBNAIL,
)
from src.normalizer import normalize_fish, source_field_record
from src.state import (
    CrawlState, ItemState, now, archive_if_changed,
    COMPLETE, FAILED, PARTIAL, RUNNING,
)

REQUEST_INTERVAL = 2.0
TIMEOUT = 30.0
MAX_RETRIES = 3
BACKOFF = [10, 30, 90]


def log(msg: str) -> None:
    print(msg, flush=True)


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def write_json(path: Path, data, *, source_id: str | None = None) -> None:
    """JSON 저장. 내용이 바뀌면 기존 파일을 versions/로 보존한 뒤 쓴다."""
    path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    if source_id:
        moved = archive_if_changed(source_id, path, body)
        if moved:
            log(f"      원본 변경 감지 → 보존: {moved.name}")
    path.write_bytes(body)


async def request_with_retry(client: httpx.AsyncClient, **kw) -> httpx.Response:
    last: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            r = await client.request(**kw)
            r.raise_for_status()
            return r
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF[attempt]
                log(f"      재시도 {attempt + 1}/{MAX_RETRIES - 1} — {wait}초 대기 ({exc})")
                await asyncio.sleep(wait)
    raise last  # type: ignore[misc]


# ---------------------------------------------------------------- list
async def cmd_list(client: httpx.AsyncClient, st: CrawlState, dry: bool) -> list[dict]:
    log("[list] 목록 API 수집")
    if dry:
        log(f"  DRY-RUN: POST {LIST_API_URL} body={LIST_API_BODY}")
        return []

    body = {k: ("" if v is None else v) for k, v in LIST_API_BODY.items()}
    r = await request_with_retry(
        client, method="POST", url=LIST_API_URL,
        headers={**DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest"}, data=body)

    raw = r.content
    rows = r.json()["retList"]
    h = sha(raw)

    paths.RAW_LIST.mkdir(parents=True, exist_ok=True)
    (paths.RAW_LIST / "source-response.json").write_bytes(raw)
    write_json(paths.RAW_LIST / "fish-index.json", rows)
    validator.write_csv(
        paths.RAW_LIST / "fish-index.csv",
        ["sourceId", "koreanName", "colorLevel", "displayStatus", "thumbnailFileName"],
        [[x.get("fishId"), x.get("fishName"), x.get("colorLevel"),
          x.get("display"), x.get("fileName")] for x in rows])
    write_json(paths.RAW_LIST / "metadata.json", {
        "sourceProvider": "NIFS",
        "sourceUrl": LIST_API_URL,
        "requestMethod": "POST",
        "requestContentType": "application/x-www-form-urlencoded",
        "requestBody": body,
        "itemCount": len(rows),
        "collectedAt": now(),
        "contentHash": h,
        "parserVersion": paths.LIST_PARSER_VERSION,
    })

    st.listStatus = COMPLETE
    st.listCollectedAt = now()
    st.listContentHash = h
    for row in rows:
        st.item(row["fishId"], row["fishName"])
    st.save()
    log(f"  ✅ {len(rows)}종 저장")
    return rows


def load_list() -> list[dict]:
    p = paths.RAW_LIST / "fish-index.json"
    if not p.exists():
        raise SystemExit("목록이 없다. 먼저 `python crawl_nifs.py list`를 실행할 것.")
    raw = p.read_bytes()
    # 이전 단계 산출물이 Windows 기본 코드페이지로 쓰인 경우가 있어 UTF-8을 강제하지 않는다
    for enc in ("utf-8", "cp949"):
        try:
            return json.loads(raw.decode(enc))
        except UnicodeDecodeError:
            continue
    raise SystemExit(f"{p} 인코딩을 해석할 수 없다. `python crawl_nifs.py list`로 재생성할 것.")


# -------------------------------------------------------------- detail
async def cmd_detail(client: httpx.AsyncClient, st: CrawlState, rows: list[dict],
                     dry: bool, force: bool) -> None:
    log(f"[detail] 상세 API 수집 (간격 {REQUEST_INTERVAL}초, 동시성 1)")
    todo = [r for r in rows
            if force or st.item(r["fishId"], r["fishName"]).detailStatus != COMPLETE]
    log(f"  대상 {len(todo)}/{len(rows)}종  (완료 건너뜀 {len(rows) - len(todo)})")
    if dry:
        for r in todo[:3]:
            log(f"  DRY-RUN: POST {DETAIL_API_URL} fishId={r['fishId']} ({r['fishName']})")
        if len(todo) > 3:
            log(f"  DRY-RUN: ... 외 {len(todo) - 3}종")
        return

    for i, row in enumerate(todo, 1):
        fid, fname = row["fishId"], row["fishName"]
        item = st.item(fid, fname)
        item.detailStatus = RUNNING
        item.attemptCount += 1
        item.lastAttemptAt = now()

        if i > 1:
            await asyncio.sleep(REQUEST_INTERVAL)
        try:
            r = await request_with_retry(
                client, method="POST", url=DETAIL_API_URL,
                headers={**DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest",
                         "Referer": build_detail_url(fid)},
                data={"fishId": fid})
            raw = r.content
            payload = r.json()

            if not payload.get("retMap"):
                raise ValueError("retMap 없음 — 요청 인코딩 또는 fishId 확인 필요")

            d = paths.fish_raw_dir(fid)
            d.mkdir(parents=True, exist_ok=True)
            moved = archive_if_changed(fid, d / "detail-response.json", raw)
            if moved:
                log(f"      원본 변경 → 보존: {moved.parent.name}")
            (d / "detail-response.json").write_bytes(raw)
            write_json(d / "parsed-source.json", source_field_record(fid, payload))
            write_json(d / "source-metadata.json", {
                "sourceProvider": "NIFS",
                "sourceId": fid,
                "koreanName": fname,
                "sourceUrl": build_detail_url(fid),
                "apiUrl": DETAIL_API_URL,
                "requestMethod": "POST",
                "requestContentType": "application/x-www-form-urlencoded",
                "requestBody": {"fishId": fid},
                "httpStatus": r.status_code,
                "contentType": r.headers.get("content-type"),
                "contentLength": len(raw),
                "contentHash": sha(raw),
                "collectedAt": now(),
                "parserVersion": paths.DETAIL_PARSER_VERSION,
                "crawlMethod": "http",
                "crawlStatus": "complete",
            })

            item.detailStatus = COMPLETE
            item.contentHash = sha(raw)
            item.lastSuccessAt = now()
            item.lastError = None
            log(f"  [{i:2d}/{len(todo)}] ✅ {fname}")
        except Exception as exc:  # noqa: BLE001
            item.detailStatus = FAILED
            item.lastError = f"{type(exc).__name__}: {exc}"
            log(f"  [{i:2d}/{len(todo)}] ❌ {fname} — {item.lastError}")
        st.save()


# -------------------------------------------------------------- images
async def cmd_images(client: httpx.AsyncClient, st: CrawlState, rows: list[dict],
                     dry: bool, force: bool) -> None:
    log("[images] 이미지 수집")
    by_id = {r["fishId"]: r for r in rows}
    todo = [r for r in rows
            if force or st.item(r["fishId"]).imageStatus != COMPLETE]
    log(f"  대상 {len(todo)}/{len(rows)}종")
    if dry:
        log("  DRY-RUN: 목록 썸네일 1장 + imgList 전체를 어종별로 내려받는다")
        return

    for i, row in enumerate(todo, 1):
        fid, fname = row["fishId"], row["fishName"]
        item = st.item(fid, fname)
        d = paths.fish_raw_dir(fid)
        detail_file = d / "detail-response.json"
        if not detail_file.exists():
            item.imageStatus = FAILED
            item.lastError = "상세 응답 없음 — 이미지 목록을 알 수 없다"
            log(f"  [{i:2d}/{len(todo)}] ❌ {fname} — 상세 응답 없음")
            st.save()
            continue

        payload = json.loads(detail_file.read_text(encoding="utf-8"))

        # 목록 썸네일 + 상세 이미지. 같은 파일이어도 역할을 각각 기록한다.
        targets: list[tuple[str, str]] = []
        if by_id[fid].get("fileName"):
            targets.append((by_id[fid]["fileName"], ROLE_LIST_THUMBNAIL))
        for idx, img in enumerate(payload.get("imgList") or []):
            if img.get("fileName"):
                targets.append((img["fileName"], detail_role(idx)))

        metas = []
        for n, (file_name, role) in enumerate(targets, 1):
            await asyncio.sleep(REQUEST_INTERVAL)
            metas.append(await download_image(
                client, fid, file_name, role, paths.fish_images_dir(fid), n))
        mark_duplicates(metas)

        write_json(d / "images" / "image-metadata.json", metas)
        ok = sum(1 for m in metas if m["isValid"])
        if ok == len(metas) and metas:
            item.imageStatus = COMPLETE
        elif ok:
            item.imageStatus = PARTIAL
        else:
            item.imageStatus = FAILED
        item.lastError = None if ok == len(metas) else f"이미지 {len(metas) - ok}건 실패"
        dup = sum(1 for m in metas if m["isDuplicate"])
        log(f"  [{i:2d}/{len(todo)}] {'✅' if ok == len(metas) else '⚠️'} {fname} "
            f"— {ok}/{len(metas)}장 (중복 {dup})")
        st.save()


# ----------------------------------------------------------- normalize
def cmd_normalize(st: CrawlState, rows: list[dict], dry: bool) -> list[dict]:
    log("[normalize] 정규화")
    if dry:
        log(f"  DRY-RUN: {len(rows)}종 → data/nifs/normalized/")
        return []

    by_id = {r["fishId"]: r for r in rows}
    out: list[dict] = []
    for row in rows:
        fid = row["fishId"]
        item = st.item(fid, row["fishName"])
        d = paths.fish_raw_dir(fid)
        detail_file = d / "detail-response.json"
        if not detail_file.exists():
            item.normalizationStatus = FAILED
            item.lastError = "상세 응답 없음"
            continue

        raw = detail_file.read_bytes()
        payload = json.loads(raw.decode("utf-8"))
        img_file = d / "images" / "image-metadata.json"
        images = json.loads(img_file.read_text(encoding="utf-8")) if img_file.exists() else []

        rec = normalize_fish(
            source_id=fid, list_row=by_id[fid], payload=payload, images=images,
            collected_at=now(), content_hash=sha(raw),
            parser_version=paths.DETAIL_PARSER_VERSION)
        write_json(paths.NORMALIZED_FISH / f"{fid}.json", rec)
        out.append(rec)
        item.normalizationStatus = COMPLETE

    write_json(paths.NORMALIZED / "nifs-fish-25.json", out)
    validator.write_csv(
        paths.NORMALIZED / "nifs-fish-25.csv",
        ["sourceId", "koreanName", "englishName", "scientificName",
         "prohibitSize", "recommendSize", "periodMonths", "historyYears", "imageCount"],
        [[r["sourceId"], r["koreanName"], r["englishName"], r["scientificName"],
          r["prohibitSize"], r["recommendSize"], len(r["recommendPeriod"]),
          len(r["catchHistory"]), len(r["sourceImages"])] for r in out])
    write_json(paths.NORMALIZED / "normalization-summary.json", {
        "generatedAt": now(),
        "parserVersion": paths.DETAIL_PARSER_VERSION,
        "recordCount": len(out),
        "naHandled": [r["sourceId"] for r in out if r.get("eatingNoteMissing")],
    })
    st.save()
    log(f"  ✅ {len(out)}종 정규화")
    return out


# ------------------------------------------------------------ validate
def cmd_validate(st: CrawlState, rows: list[dict]) -> dict:
    log("[validate] 검증")
    by_id = {r["fishId"]: r for r in rows}
    list_v = validator.validate_list(rows)

    details, normalized = [], []
    for row in rows:
        fid = row["fishId"]
        d = paths.fish_raw_dir(fid)
        nf = paths.NORMALIZED_FISH / f"{fid}.json"
        if not (d / "detail-response.json").exists() or not nf.exists():
            details.append({"sourceId": fid, "koreanName": row["fishName"],
                            "issues": ["수집 산출물 없음"], "passed": False})
            continue
        payload = json.loads((d / "detail-response.json").read_text(encoding="utf-8"))
        rec = json.loads(nf.read_text(encoding="utf-8"))
        normalized.append(rec)
        v = validator.validate_detail(fid, by_id[fid], payload, rec)
        details.append(v)
        st.item(fid).validationStatus = COMPLETE if v["passed"] else PARTIAL

    agg = validator.aggregate(details, normalized)
    summary = {"generatedAt": now(), "list": list_v, "aggregate": agg, "details": details}
    write_json(paths.REPORTS / "validation-summary.json", summary)

    R = paths.REPORTS
    validator.write_csv(R / "missing-fields.csv", ["sourceId", "koreanName", "field"],
                        [[n["sourceId"], n["koreanName"], f]
                         for n in normalized
                         for f in agg["fieldPresence"]
                         if n.get(f) in (None, "", [], {})])
    validator.write_csv(
        R / "duplicate-images.csv",
        ["sourceId", "koreanName", "fileName", "role", "sha256", "duplicateOf"],
        [[n["sourceId"], n["koreanName"], i["sourceFileName"], i["sourceRole"],
          i["sha256"], i["duplicateOf"]]
         for n in normalized for i in n.get("sourceImages", []) if i.get("isDuplicate")])
    validator.write_csv(
        R / "failed-items.csv",
        ["sourceId", "koreanName", "detailStatus", "imageStatus", "lastError"],
        [[s.sourceId, s.koreanName, s.detailStatus, s.imageStatus, s.lastError]
         for s in st.items.values()
         if FAILED in (s.detailStatus, s.imageStatus, s.normalizationStatus)])
    validator.write_csv(
        R / "period-validation.csv",
        ["sourceId", "koreanName", "monthCount", "months"],
        [[d["sourceId"], d["koreanName"], d.get("monthCount"),
          " ".join(map(str, d.get("monthsCovered") or []))] for d in details])
    validator.write_csv(
        R / "history-validation.csv",
        ["sourceId", "koreanName", "yearCount", "yearFrom", "yearTo", "sorted"],
        [[d["sourceId"], d["koreanName"], d.get("yearCount"),
          (d.get("yearRange") or [None, None])[0], (d.get("yearRange") or [None, None])[1],
          d.get("yearsSorted")] for d in details])

    review = []
    for n in normalized:
        if n.get("eatingNoteMissing"):
            review.append([n["sourceId"], n["koreanName"], "출처가 NA를 반환",
                           "eatingNote", "NA", "설명 없음으로 처리 — 서비스 노출 제외"])
        if n.get("prohibitSize") is None:
            review.append([n["sourceId"], n["koreanName"], "지양 크기 없음",
                           "prohibitSize", "", "규정 원문 대조 필요"])
        for img in n.get("sourceImages", []):
            if img.get("isDuplicate"):
                review.append([n["sourceId"], n["koreanName"], "목록·상세 이미지 동일",
                               "sourceImages", img["sourceFileName"], "대표 이미지 1장만 사용"])
    validator.write_csv(
        R / "manual-review.csv",
        ["sourceId", "koreanName", "reviewReason", "fieldName", "sourceValue",
         "recommendedAction"], review)

    st.save()
    log(f"  목록: {list_v['totalCount']}종, 중복ID {len(list_v['duplicateIds'])}건")
    log(f"  상세: {agg['detailPassed']}/{agg['detailTotal']} 통과")
    log(f"  이미지: {agg['images']['valid']}/{agg['images']['total']}장 유효, "
        f"중복 해시 {len(agg['images']['duplicateHashGroups'])}그룹")
    if agg["detailFailed"]:
        log(f"  ❌ 실패: {agg['detailFailed']}")
    return summary


def write_crawl_summary(st: CrawlState, elapsed: float) -> None:
    total_bytes = sum(f.stat().st_size for f in paths.NIFS.rglob("*") if f.is_file())
    write_json(paths.REPORTS / "crawl-summary.json", {
        "generatedAt": now(),
        "elapsedSeconds": round(elapsed, 1),
        "totalBytes": total_bytes,
        "totalMB": round(total_bytes / 1_048_576, 1),
        "listStatus": st.listStatus,
        "detailStatus": st.counts("detailStatus"),
        "imageStatus": st.counts("imageStatus"),
        "normalizationStatus": st.counts("normalizationStatus"),
        "requestPolicy": {"concurrency": 1, "intervalSeconds": REQUEST_INTERVAL,
                          "timeoutSeconds": TIMEOUT, "maxRetries": MAX_RETRIES,
                          "backoffSeconds": BACKOFF},
    })


# ----------------------------------------------------------------- CLI
async def main() -> None:
    ap = argparse.ArgumentParser(description="NIFS 주요 수산자원 25종 수집기")
    ap.add_argument("command", choices=[
        "list", "detail", "images", "normalize", "validate",
        "all", "resume", "retry-failed"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    paths.ensure_dirs()
    st = CrawlState.load()
    dry = args.dry_run
    cmd = args.command
    started = time.monotonic()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        if cmd == "list":
            await cmd_list(client, st, dry)
            return

        if cmd in ("all", "resume", "retry-failed"):
            rows = (await cmd_list(client, st, dry)
                    if cmd == "all" or not (paths.RAW_LIST / "fish-index.json").exists()
                    else load_list())
            if dry and not rows:
                rows = load_list() if (paths.RAW_LIST / "fish-index.json").exists() else []
            force = cmd == "retry-failed"
            if force:
                targets = {s.sourceId for s in st.failed_items()}
                rows_run = [r for r in rows if r["fishId"] in targets]
                log(f"[retry-failed] 실패 {len(rows_run)}종 재시도")
            else:
                rows_run = rows
            await cmd_detail(client, st, rows_run, dry, force=False)
            await cmd_images(client, st, rows_run, dry, force=False)
            if not dry:
                cmd_normalize(st, rows, dry)
                cmd_validate(st, rows)
                write_crawl_summary(st, time.monotonic() - started)
            return

        rows = load_list()
        if cmd == "detail":
            await cmd_detail(client, st, rows, dry, force=False)
        elif cmd == "images":
            await cmd_images(client, st, rows, dry, force=False)
        elif cmd == "normalize":
            cmd_normalize(st, rows, dry)
        elif cmd == "validate":
            cmd_validate(st, rows)

    log(f"\n소요 {time.monotonic() - started:.1f}초")


if __name__ == "__main__":
    asyncio.run(main())
