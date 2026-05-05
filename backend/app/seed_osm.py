import argparse
import logging
from app.core.constants import PARKS, DEFAULT_SEED_BBOX
from app.services.osm import seed_canonical_routes

logging.basicConfig(level=logging.INFO)


logging.basicConfig(level=logging.INFO)


def main():
    parser = argparse.ArgumentParser(
        description="Seed canonical routes from OSM Overpass API."
    )
    parser.add_argument(
        "--bbox", type=str, help="Bounding box: lat_min,lon_min,lat_max,lon_max"
    )
    parser.add_argument(
        "--park",
        type=str,
        choices=list(PARKS.keys()),
        help="Name of a national/state park to seed",
    )

    args = parser.parse_args()

    bbox = args.bbox
    if args.park:
        bbox = PARKS[args.park]
        print(f"Using predefined bounding box for {args.park}: {bbox}")

    if not bbox:
        # Default to San Francisco
        bbox = DEFAULT_SEED_BBOX
        print(f"No bbox or park specified, defaulting to San Francisco: {bbox}")

    print(f"Starting OSM seeding for bbox: {bbox}...")
    count = seed_canonical_routes(bbox)
    print(f"Done! Seeded {count} routes.")


if __name__ == "__main__":
    main()
