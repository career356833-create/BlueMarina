#!/usr/bin/env python3
"""Convert the official KHOA training/firing-zone SHP archive to WGS84 GeoJSON."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import transform

DATASET_PAGE = "https://www.data.go.kr/data/15116506/fileData.do"
DATASET_NAME = "해양수산부 국립해양조사원_해상훈련및사격구역_20260415"
PROVIDER = "국립해양조사원(KHOA)"
SOURCE_UPDATED_AT = "2026-04-15"
EXPECTED_RAW_SHA256 = "f0e10d29c1ac67746d2fcdde16b359200e215f0e118befb0d1fbe5d54d544d8a"
MAX_CLOSURE_GAP_METERS = 0.01
COORDINATE_PRECISION = 6


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


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def display_text(value: Any) -> str | None:
    text = clean_text(value)
    return None if text is None or "\ufffd" in text else text


def stable_id(record: dict[str, Any]) -> str:
    identity = f"{clean_text(record.get('OBJECTID'))}|{clean_text(record.get('ZONE_NM'))}"
    return f"khoa-seatn-{hashlib.sha256(identity.encode('utf-8')).hexdigest()[:12]}"


def canonical_properties(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": stable_id(record),
        "name": display_text(record.get("ZONE_NM")),
        "locationName": display_text(record.get("ZONE_DTL")),
        "referenceChartNumber": display_text(record.get("RFRNC_INFO")),
        "referenceChartScale": display_text(record.get("RFRNC_I_01")),
        "referenceChartName": display_text(record.get("RFRNC_I_02")),
        "organization": display_text(record.get("REL_DEPT")),
        "revisionYear": display_text(record.get("RVSN_YR")),
        "effectiveDateText": display_text(record.get("TKEF_YMD_C")),
        "source": PROVIDER,
        "sourceUpdatedAt": SOURCE_UPDATED_AT,
        "sourceRaw": json.dumps(record, ensure_ascii=False, separators=(",", ":"), default=str),
    }


def source_polygon(shape_record: Any) -> tuple[Polygon, float, bool]:
    source_shape = shape_record.shape
    if source_shape.shapeType == shapefile.NULL:
        raise ValueError("Null geometry is not allowed")
    if source_shape.shapeType != shapefile.POLYLINE:
        raise ValueError(f"Expected POLYLINE source geometry, got {source_shape.shapeTypeName}")
    if len(source_shape.parts) != 1:
        raise ValueError("Expected one boundary part per source feature")
    points = list(source_shape.points)
    if len(points) < 4:
        raise ValueError("Boundary has fewer than four coordinates")
    closure_gap = math.dist(points[0], points[-1])
    snapped = points[0] != points[-1]
    if closure_gap > MAX_CLOSURE_GAP_METERS:
        raise ValueError(f"Boundary closure gap exceeds {MAX_CLOSURE_GAP_METERS} m")
    points[-1] = points[0]
    polygon = Polygon(points)
    if polygon.is_empty or not polygon.is_valid:
        raise ValueError("Source boundary does not form a valid polygon")
    return orient(polygon, sign=1.0), closure_gap, snapped


def round_coordinates(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, COORDINATE_PRECISION)
    if isinstance(value, (list, tuple)):
        return [round_coordinates(item) for item in value]
    if isinstance(value, dict):
        return {key: round_coordinates(item) for key, item in value.items()}
    return value


def point_count(polygon: Polygon) -> int:
    return len(polygon.exterior.coords) + sum(len(ring.coords) for ring in polygon.interiors)


def main() -> None:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Input ZIP not found: {args.input}")
    raw_hash = sha256(args.input)
    if raw_hash != EXPECTED_RAW_SHA256:
        raise SystemExit("Input ZIP checksum does not match the audited 2026-04-15 source")

    with tempfile.TemporaryDirectory(prefix="blue-marina-khoa-training-zone-") as temporary:
        extraction_root = Path(temporary)
        with zipfile.ZipFile(args.input) as archive:
            archive.extractall(extraction_root)
        shape_files = list(extraction_root.rglob("*.shp"))
        if len(shape_files) != 1:
            raise SystemExit(f"Expected one SHP file, found {len(shape_files)}")

        shp_path = shape_files[0]
        source_crs_wkt = shp_path.with_suffix(".prj").read_text(encoding="utf-8")
        if not re.search(r'AUTHORITY\["EPSG","5179"\]', source_crs_wkt):
            raise SystemExit("Expected EPSG:5179 authority in source PRJ")
        source_crs = CRS.from_wkt(source_crs_wkt)
        transformer = Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
        reader = shapefile.Reader(str(shp_path), encoding="utf-8")

        features: list[dict[str, Any]] = []
        source_geometry_hashes: list[str] = []
        feature_hashes: list[str] = []
        null_geometry_count = 0
        invalid_geometry_count = 0
        snapped_closure_count = 0
        maximum_closure_gap = 0.0
        source_vertices = 0
        derived_vertices = 0

        try:
            for shape_record in reader.iterShapeRecords():
                if shape_record.shape.shapeType == shapefile.NULL:
                    null_geometry_count += 1
                    continue
                try:
                    polygon, closure_gap, snapped = source_polygon(shape_record)
                except ValueError as error:
                    invalid_geometry_count += 1
                    raise SystemExit(str(error)) from error
                source_vertices += point_count(polygon)
                maximum_closure_gap = max(maximum_closure_gap, closure_gap)
                snapped_closure_count += int(snapped)
                source_geometry_hashes.append(hashlib.sha256(polygon.wkb).hexdigest())

                wgs84_polygon = orient(transform(transformer.transform, polygon), sign=1.0)
                if wgs84_polygon.is_empty or not wgs84_polygon.is_valid:
                    raise SystemExit("Geometry became invalid after projection")
                derived_vertices += point_count(wgs84_polygon)
                record = shape_record.record.as_dict()
                properties = canonical_properties(record)
                feature_hashes.append(hashlib.sha256((source_geometry_hashes[-1] + properties["id"]).encode()).hexdigest())
                features.append({
                    "type": "Feature",
                    "id": properties["id"],
                    "geometry": round_coordinates(mapping(wgs84_polygon)),
                    "properties": properties,
                })
            shape_type_name = reader.shapeTypeName
            source_fields = [field[0] for field in reader.fields[1:]]
        finally:
            reader.close()

    collection = {"type": "FeatureCollection", "name": "khoa-maritime-training-firing-zone", "features": features}
    encoded = (json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    if args.public_output:
        args.public_output.parent.mkdir(parents=True, exist_ok=True)
        args.public_output.write_bytes(encoded)

    bounds = [float("inf"), float("inf"), float("-inf"), float("-inf")]
    for feature in features:
        min_x, min_y, max_x, max_y = shape(feature["geometry"]).bounds
        bounds = [min(bounds[0], min_x), min(bounds[1], min_y), max(bounds[2], max_x), max(bounds[3], max_y)]
    duplicate_geometry = sum(count - 1 for count in Counter(source_geometry_hashes).values() if count > 1)
    duplicate_features = sum(count - 1 for count in Counter(feature_hashes).values() if count > 1)
    report = {
        "dataset": DATASET_NAME,
        "officialUrl": DATASET_PAGE,
        "provider": PROVIDER,
        "license": "공공저작물 출처표시 제1유형",
        "rawSha256": raw_hash,
        "rawBytes": args.input.stat().st_size,
        "sourceCrs": "EPSG:5179 authority declared in embedded WKT",
        "sourceEpsg": 5179,
        "targetCrs": "EPSG:4326",
        "sourceEncoding": "UTF-8 (.cpg)",
        "sourceTextPolicy": "UTF-8 fields are preserved verbatim; missing values remain null and no source meaning is inferred.",
        "sourceGeometryType": shape_type_name,
        "derivedGeometryType": "Polygon",
        "featureCount": len(features),
        "nullGeometryCount": null_geometry_count,
        "invalidGeometryCountBeforeConversion": invalid_geometry_count,
        "invalidGeometryCountAfterConversion": 0,
        "duplicateSourceGeometryCount": duplicate_geometry,
        "duplicateFeatureCount": duplicate_features,
        "sourceVertexCount": source_vertices,
        "derivedVertexCount": derived_vertices,
        "snappedClosureCount": snapped_closure_count,
        "maximumClosureGapMeters": maximum_closure_gap,
        "closureToleranceMeters": MAX_CLOSURE_GAP_METERS,
        "simplificationMeters": 0,
        "coordinatePrecision": COORDINATE_PRECISION,
        "boundsWgs84": bounds,
        "derivedBytes": len(encoded),
        "derivedSha256": hashlib.sha256(encoded).hexdigest(),
        "sourceFields": source_fields,
        "sourceFieldMap": {
            "name": "ZONE_NM",
            "locationName": "ZONE_DTL",
            "referenceChartNumber": "RFRNC_INFO",
            "referenceChartScale": "RFRNC_I_01",
            "referenceChartName": "RFRNC_I_02",
            "organization": "REL_DEPT",
            "revisionYear": "RVSN_YR",
            "effectiveDateText": "TKEF_YMD_C",
        },
        "sourceGeometryPolicy": "Each single-part POLYLINE boundary must already be closed within 0.01 m; only its final coordinate is snapped to the first. No topology simplification or inferred boundary is allowed.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
