import logging
from shapely.geometry import LineString
from shapely.ops import substring, transform
import pyproj

logger = logging.getLogger(__name__)

# Transformers for projecting to/from Web Mercator (Metric-ish)
# Web Mercator (3857) is fast and global, suitable for small trims.
project_to_metric = pyproj.Transformer.from_crs(
    "EPSG:4326", "EPSG:3857", always_xy=True
).transform
project_to_wgs84 = pyproj.Transformer.from_crs(
    "EPSG:3857", "EPSG:4326", always_xy=True
).transform


def trim_linestring_by_meters(
    line: LineString, start_m: float, end_m: float
) -> LineString:
    """
    Trims a specified distance (in meters) from the start and end of a LineString.
    Uses projection to Web Mercator (3857) to calculate distances in meters.
    """
    # 1. Project to metric CRS
    metric_line = transform(project_to_metric, line)

    total_length_m = metric_line.length

    if start_m + end_m >= total_length_m:
        logger.warning(
            f"Trim distance ({start_m + end_m}m) exceeds line length ({total_length_m:.1f}m). Returning original."
        )
        return line

    # 2. Use shapely substring with distances in meters
    trimmed_metric_line = substring(metric_line, start_m, total_length_m - end_m)

    # 3. Project back to WGS84
    return transform(project_to_wgs84, trimmed_metric_line)


def simplify_geometry(line: LineString, tolerance_deg: float = 0.00001) -> LineString:
    """
    Simplifies geometry using Douglas-Peucker algorithm.
    Tolerance 0.00001 is roughly 1 meter at the equator.
    """
    return line.simplify(tolerance_deg, preserve_topology=True)
