import argparse
import random
import uuid
from datetime import datetime, timedelta

from geoalchemy2.shape import to_shape, from_shape
from shapely.geometry import LineString
from shapely.ops import substring
from sqlmodel import Session, select, delete

from app.core.db import engine
from app.models.models import User, Activity, CanonicalRoute

# Configuration for mock hikes
MOCK_HIKES = [
    {"name": "Mist Trail", "match_level": 1.0, "notes": "Beautiful day at the Falls!"},
    {
        "name": "John Muir Trail",
        "match_level": 0.85,
        "notes": "A bit crowded but worth it.",
    },
    {
        "name": "Upper Yosemite Fall Trail",
        "match_level": 0.95,
        "notes": "The view from the top is insane.",
    },
    {
        "name": "Lower Yosemite Fall Trail",
        "match_level": 1.0,
        "notes": "Quick morning stroll to the base.",
    },
    {
        "name": "Four Mile Trail",
        "match_level": 0.90,
        "notes": "Steep but the views at the top are unbeatable.",
    },
    {
        "name": "Panorama Trail",
        "match_level": 0.80,
        "notes": "Long day but worth every step.",
    },
    {
        "name": "Half Dome Trail",
        "match_level": 0.40,
        "notes": "Didn't have permits for the cables today.",
    },
]


def perturb_geometry(shape: LineString, match_level: float) -> LineString:
    """Trims the geometry to simulate varying match levels."""
    if match_level >= 1.0:
        return shape

    # Use substring to take a portion of the trail
    length = shape.length
    return substring(shape, 0, length * match_level)


def attach_mock_data(user_id: uuid.UUID):
    # First, clear any existing mock data for this user to avoid duplicates
    detach_mock_data(user_id)

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            print(f"Error: User {user_id} not found.")
            return

        print(f"Attaching mock data to {user.display_name}...")

        created_count = 0
        for hike in MOCK_HIKES:
            # Find the canonical route
            stmt = select(CanonicalRoute).where(
                CanonicalRoute.name.ilike(f"%{hike['name']}%")
            )
            route = session.exec(stmt).first()

            if not route:
                print(
                    f"Warning: Canonical route '{hike['name']}' not found in DB. Skipping."
                )
                continue

            # Get shapely geometry
            route_shape = to_shape(route.geometry)

            # Perturb it
            activity_shape = perturb_geometry(route_shape, hike["match_level"])

            # Create activity
            activity = Activity(
                user_id=user.id,
                name=f"[MOCK] {hike['name']}",
                sport_type="Hike",
                distance=activity_shape.length
                * 111320,  # Rough conversion to meters for mock
                moving_time=random.randint(3600, 14400),
                start_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                notes=hike["notes"],
                reactions_count=random.randint(0, 20),
                comments_count=random.randint(0, 5),
                raw_polyline=from_shape(activity_shape, srid=4326),
                canonical_route_id=None,  # Let the user 'rank' them manually
                match_confidence=hike["match_level"],
                is_ignored=False,
            )
            session.add(activity)
            created_count += 1

        session.commit()
        print(f"Successfully created {created_count} mock activities.")


def detach_mock_data(user_id: uuid.UUID):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            print(f"Error: User {user_id} not found.")
            return

        print(f"Detaching mock data from {user.display_name}...")

        # Delete activities that have "[MOCK]" in their name
        stmt = (
            delete(Activity)
            .where(Activity.user_id == user_id)
            .where(Activity.name.like("[MOCK]%"))
        )
        session.exec(stmt)
        session.commit()

        print("Removed mock activities.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage mock activity data.")
    parser.add_argument("--attach", type=str, help="User ID to attach mock data to")
    parser.add_argument("--detach", type=str, help="User ID to detach mock data from")

    args = parser.parse_args()

    if args.attach:
        attach_mock_data(uuid.UUID(args.attach))
    elif args.detach:
        detach_mock_data(uuid.UUID(args.detach))
    else:
        parser.print_help()
