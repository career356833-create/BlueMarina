#!/usr/bin/env python3
"""Convert the official KHOA deep-water-route SHP archive to WGS84 GeoJSON."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import shapefile
from pyproj import CRS, Transformer
from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import transform

DATASET_PAGE = "https://www.data.go.kr/data/15130169/fileData.do"
DATASET_NAME = "해양수산부 국립해양조사원_깊은수심항로부_20250811"
PROVIDER = "국립해양조사원(KHOA)"
SOURCE_UPDATED_AT = "2025-08-11"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="Official ZIP downloaded from data.go.kr")
    parser.add_argument("--output", type=Path, required=True, help="Canonical derived GeoJSON")
    parser.add_argument("--public-output", type=Path, help="Optional runtime copy under public/")
    parser.add_argument("--report", type=Path, required=True, help="Conversion/validation report JSON")
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finite_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and number not in (float("inf"), float("-inf")) else None


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def canonical_properties(record: dict[str, Any]) -> dict[str, Any]:
    name = clean_text(record.get("nobjnm")) or clean_text(record.get("objnam")) or clean_text(record.get("inform"))
    return {
        "id": f"khoa-dwrtpt-{record.get('objnum') or record.get('gid')}",
        "name": name,
        "minDepth": finite_number(record.get("drval1")),
        "maxDepth": finite_number(record.get("drval2")),
        "bearing": finite_number(record.get("orient")),
        "surveyCharacteristic": clean_text(record.get("quasou")),
        "trafficFlow": clean_text(record.get("trafic")),
        "source": PROVIDER,
        "sourceUpdatedAt": SOURCE_UPDATED_AT,
        "sourceRaw": json.dumps(record, ensure_ascii=False, separators=(",", ":"), default=str),
    }


def main() -> None:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Input ZIP not found: {args.input}")

    with tempfile.TemporaryDirectory(prefix="blue-marina-khoa-") as temporary:
        extraction_root = Path(temporary)
        with zipfile.ZipFile(args.input) as archive:
            archive.extractall(extraction_root)
        shape_files = list(extraction_root.rglob("*.shp"))
        if len(shape_files) != 1:
            raise SystemExit(f"Expected one SHP file, found {len(shape_files)}")

        shp_path = shape_files[0]
        prj_path = shp_path.with_suffix(".prj")
        source_crs = CRS.from_wkt(prj_path.read_text(encoding="utf-8"))
        transformer = Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
        reader = shapefile.Reader(str(shp_path), encoding="euc-kr")

        features: list[dict[str, Any]] = []
        invalid_before = 0
        repaired = 0
        for shape_record in reader.iterShapeRecords():
            source_geometry = shape(shape_record.shape.__geo_interface__)
            if not source_geometry.is_valid:
                invalid_before += 1
                source_geometry = make_valid(source_geometry)
                repaired += 1
            wgs84_geometry = transform(transformer.transform, source_geometry)
            if not wgs84_geometry.is_valid:
                raise SystemExit("Geometry remained invalid after conversion")
            if wgs84_geometry.geom_type == "Polygon":
                wgs84_geometry = orient(wgs84_geometry, sign=1.0)
            record = shape_record.record.as_dict()
            properties = canonical_properties(record)
            features.append({
                "type": "Feature",
                "id": properties["id"],
                "geometry": mapping(wgs84_geometry),
                "properties": properties,
            })
        shape_type_name = reader.shapeTypeName
        reader.close()

    collection = {
        "type": "FeatureCollection",
        "name": "khoa-deep-water-route",
        "features": features,
    }
    encoded = (json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    if args.public_output:
        args.public_output.parent.mkdir(parents=True, exist_ok=True)
        args.public_output.write_bytes(encoded)

    bounds = [float("inf"), float("inf"), float("-inf"), float("-inf")]
    for feature in features:
        geometry = shape(feature["geometry"])
        min_x, min_y, max_x, max_y = geometry.bounds
        bounds = [min(bounds[0], min_x), min(bounds[1], min_y), max(bounds[2], max_x), max(bounds[3], max_y)]
    report = {
        "dataset": DATASET_NAME,
        "officialUrl": DATASET_PAGE,
        "provider": PROVIDER,
        "license": "이용허락범위 제한 없음",
        "rawSha256": sha256(args.input),
        "rawBytes": args.input.stat().st_size,
        "sourceCrs": source_crs.to_string(),
        "sourceEpsg": source_crs.to_epsg(),
        "targetCrs": "EPSG:4326",
        "sourceEncoding": "EUC-KR (.cpg)",
        "geometryType": shape_type_name,
        "featureCount": len(features),
        "invalidGeometryCountBeforeConversion": invalid_before,
        "repairedGeometryCount": repaired,
        "invalidGeometryCountAfterConversion": 0,
        "boundsWgs84": bounds,
        "derivedBytes": len(encoded),
        "derivedSha256": hashlib.sha256(encoded).hexdigest(),
        "sourceTextWarning": "Some Korean source values already contain replacement characters in the official DBF and were not guessed or repaired.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
