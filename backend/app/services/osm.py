import requests
import logging
from typing import List, Dict, Any, Optional
from app.models.models import CanonicalRoute
from sqlmodel import Session, select
from app.core.db import engine
from app.core.constants import DEFAULT_SEED_BBOX

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def fetch_hiking_routes(bbox: str) -> List[Dict[str, Any]]:
    """
    Fetch hiking routes from Overpass API within a given bounding box.
    bbox format: "lat_min,lon_min,lat_max,lon_max"
    """
    query = f"""
    [out:json][timeout:60];
    (
      relation["route"="hiking"]({bbox});
      way["hiking"="yes"]({bbox});
      way["route"="hiking"]({bbox});
    );
    out geom;
    """
    headers = {
        "User-Agent": "Cairn-Project/1.0 (github: krishjp)",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    try:
        response = requests.post(OVERPASS_URL, data={"data": query}, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data.get("elements", [])
    except Exception as e:
        logger.error(f"Error fetching from Overpass: {e}")
        return []


def osm_element_to_wkt(element: Dict[str, Any]) -> Optional[str]:
    """
    Convert an OSM element (way or relation) with geometry to a WKT LineString.
    Note: For relations, this simplifies by concatenating all way members.
    """
    if element["type"] == "way" and "geometry" in element:
        coords = [f"{pt['lon']} {pt['lat']}" for pt in element["geometry"]]
        return f"LINESTRING({', '.join(coords)})"

    elif element["type"] == "relation" and "members" in element:
        # A bit more complex: relations have members. We try to combine all way members into one linestring
        all_coords = []
        for member in element["members"]:
            if member["type"] == "way" and "geometry" in member:
                all_coords.extend(
                    [f"{pt['lon']} {pt['lat']}" for pt in member["geometry"]]
                )

        if all_coords:
            return f"LINESTRING({', '.join(all_coords)})"

    return None


def seed_canonical_routes(bbox: str = DEFAULT_SEED_BBOX):
    """
    Seeds the canonical_routes table with data from OSM.
    Default bbox is roughly the San Francisco area.
    """
    elements = fetch_hiking_routes(bbox)
    count = 0

    with Session(engine) as session:
        for el in elements:
            osm_id = el["id"]
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("ref") or f"Unnamed Trail {osm_id}"

            wkt = osm_element_to_wkt(el)
            if not wkt:
                continue

            # Use upsert logic
            statement = select(CanonicalRoute).where(CanonicalRoute.osm_id == osm_id)
            existing = session.exec(statement).first()

            if existing:
                existing.name = name
                existing.geometry = wkt
            else:
                route = CanonicalRoute(osm_id=osm_id, name=name, geometry=wkt)
                session.add(route)

            count += 1
            if count % 50 == 0:
                session.commit()

        session.commit()

    logger.info(f"Successfully seeded/updated {count} routes from OSM.")
    return count
