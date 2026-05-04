import argparse
import logging
from app.services.osm import seed_canonical_routes

logging.basicConfig(level=logging.INFO)

PARKS = {
    "yosemite": "37.45,-119.95,38.25,-119.15",
    "rainier": "46.7,-121.9,47.0,-121.4",
    "zion": "37.15,-113.15,37.55,-112.85",
    "olympic": "47.5,-124.8,48.2,-123.0",
    "rocky-mountain": "40.15,-105.9,40.55,-105.5",
    "grand-canyon": "35.8,-113.3,36.4,-111.7",
}


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
        bbox = "37.70,-122.55,37.85,-122.35"
        print(f"No bbox or park specified, defaulting to San Francisco: {bbox}")

    print(f"Starting OSM seeding for bbox: {bbox}...")
    count = seed_canonical_routes(bbox)
    print(f"Done! Seeded {count} routes.")


if __name__ == "__main__":
    main()
