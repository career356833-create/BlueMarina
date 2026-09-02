#!/usr/bin/env python3
"""Convert the official KHOA harbor-zone SHP archive to WGS84 GeoJSON."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

import shapefile
from pyproj import CRS, Transformer
from shapely import make_valid
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import transform, unary_union

DATASET_PAGE = "https://www.data.go.kr/data/15130180/fileData.do"
DATASET_NAME = "해양수산부 국립해양조사원_항만구역_20250811"
PROVIDER = "국립해양조사원(KHOA)"
SOURCE_UPDATED_AT = "2025-08-11"
DEFAULT_SIMPLIFY_METERS = 25.0
COORDINATE_PRECISION = 6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="Official ZIP downloaded from data.go.kr")
    parser.add_argument("--output", type=Path, required=True, help="Canonical derived GeoJSON")
    parser.add_argument("--public-output", type=Path, help="Optional runtime copy under public/")
    parser.add_argument("--report", type=Path, required=True, help="Conversion/validation report JSON")
    parser.add_argument("--simplify-meters", type=float, default=DEFAULT_SIMPLIFY_METERS)
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


def finite_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and number not in (float("inf"), float("-inf")) else None


def canonical_properties(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"khoa-hrbare-{record.get('objnum') or record.get('gid')}",
        "name": clean_text(record.get("nobjnm")) or clean_text(record.get("objnam")) or clean_text(record.get("inform")),
        "englishName": clean_text(record.get("objnam")),
        "harborTypeCode": clean_text(record.get("gubun")),
        "relatedInstitutionCode": clean_text(record.get("pbinst")),
        "statusCode": clean_text(record.get("status")),
        "minimumScale": finite_number(record.get("scamin")),
        "source": PROVIDER,
        "sourceUpdatedAt": SOURCE_UPDATED_AT,
        "sourceRaw": json.dumps(record, ensure_ascii=False, separators=(",", ":"), default=str),
    }


def polygonal(geometry: Any) -> Polygon | MultiPolygon:
    if isinstance(geometry, (Polygon, MultiPolygon)):
        return geometry
    if isinstance(geometry, GeometryCollection):
        polygons = [part for part in geometry.geoms if isinstance(part, (Polygon, MultiPolygon))]
        merged = unary_union(polygons)
        if isinstance(merged, (Polygon, MultiPolygon)):
            return merged
    raise ValueError(f"Expected polygonal geometry, got {geometry.geom_type}")


def orient_polygonal(geometry: Polygon | MultiPolygon) -> Polygon | MultiPolygon:
    if isinstance(geometry, Polygon):
        return orient(geometry, sign=1.0)
    return MultiPolygon([orient(part, sign=1.0) for part in geometry.geoms])


def point_count(geometry: Polygon | MultiPolygon) -> int:
    if isinstance(geometry, Polygon):
        return len(geometry.exterior.coords) + sum(len(ring.coords) for ring in geometry.interiors)
    return sum(point_count(part) for part in geometry.geoms)


def round_coordinates(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, COORDINATE_PRECISION)
    if isinstance(value, (list, tuple)):
        return [round_coordinates(item) for item in value]
    if isinstance(value, dict):
        return {key: round_coordinates(item) for key, item in value.items()}
    return value


def main() -> None:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Input ZIP not found: {args.input}")
    if args.simplify_meters < 0:
        raise SystemExit("--simplify-meters must be non-negative")

    with tempfile.TemporaryDirectory(prefix="blue-marina-khoa-harbor-") as temporary:
        extraction_root = Path(temporary)
        with zipfile.ZipFile(args.input) as archive:
            archive.extractall(extraction_root)
        shape_files = list(extraction_root.rglob("*.shp"))
        if len(shape_files) != 1:
            raise SystemExit(f"Expected one SHP file, found {len(shape_files)}")

        shp_path = shape_files[0]
        source_crs = CRS.from_wkt(shp_path.with_suffix(".prj").read_text(encoding="utf-8"))
        transformer = Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
        reader = shapefile.Reader(str(shp_path), encoding="euc-kr")

        features: list[dict[str, Any]] = []
        raw_hashes: list[str] = []
        derived_hashes: list[str] = []
        invalid_before = 0
        repaired_before = 0
        repaired_after_simplification = 0
        repaired_after_projection = 0
        null_geometry_count = 0
        source_vertices = 0
        derived_vertices = 0

        try:
            for shape_record in reader.iterShapeRecords():
                if shape_record.shape.shapeType == shapefile.NULL:
                    null_geometry_count += 1
                    continue
                source_geometry = polygonal(shape(shape_record.shape.__geo_interface__))
                source_vertices += point_count(source_geometry)
                raw_hashes.append(hashlib.sha256(source_geometry.wkb).hexdigest())
                if not source_geometry.is_valid:
                    invalid_before += 1
                    source_geometry = polygonal(make_valid(source_geometry))
                    repaired_before += 1

                derived_geometry = source_geometry.simplify(args.simplify_meters, preserve_topology=True)
                if not derived_geometry.is_valid:
                    derived_geometry = polygonal(make_valid(derived_geometry))
                    repaired_after_simplification += 1
                derived_geometry = orient_polygonal(polygonal(derived_geometry))
                wgs84_geometry = polygonal(transform(transformer.transform, derived_geometry))
                if not wgs84_geometry.is_valid:
                    wgs84_geometry = polygonal(make_valid(wgs84_geometry))
                    repaired_after_projection += 1
                wgs84_geometry = orient_polygonal(wgs84_geometry)
                if not wgs84_geometry.is_valid:
                    raise SystemExit("Geometry remained invalid after conversion")
                derived_vertices += point_count(wgs84_geometry)
                derived_hashes.append(hashlib.sha256(wgs84_geometry.wkb).hexdigest())

                record = shape_record.record.as_dict()
                properties = canonical_properties(record)
                features.append({
                    "type": "Feature",
                    "id": properties["id"],
                    "geometry": round_coordinates(mapping(wgs84_geometry)),
                    "properties": properties,
                })
            shape_type_name = reader.shapeTypeName
        finally:
            reader.close()

    collection = {"type": "FeatureCollection", "name": "khoa-harbor-zone", "features": features}
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
    duplicate_source = sum(count - 1 for count in Counter(raw_hashes).values() if count > 1)
    duplicate_derived = sum(count - 1 for count in Counter(derived_hashes).values() if count > 1)
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
        "nullGeometryCount": null_geometry_count,
        "duplicateSourceGeometryCount": duplicate_source,
        "duplicateDerivedGeometryCount": duplicate_derived,
        "invalidGeometryCountBeforeConversion": invalid_before,
        "repairedGeometryCountBeforeSimplification": repaired_before,
        "repairedGeometryCountAfterSimplification": repaired_after_simplification,
        "repairedGeometryCountAfterProjection": repaired_after_projection,
        "invalidGeometryCountAfterConversion": 0,
        "sourceVertexCount": source_vertices,
        "derivedVertexCount": derived_vertices,
        "simplificationMeters": args.simplify_meters,
        "coordinatePrecision": COORDINATE_PRECISION,
        "boundsWgs84": bounds,
        "derivedBytes": len(encoded),
        "derivedSha256": hashlib.sha256(encoded).hexdigest(),
        "sourceTextPolicy": "EUC-KR fields are decoded as declared; no missing name or classification is inferred.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
