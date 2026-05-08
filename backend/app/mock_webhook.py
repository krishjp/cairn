import argparse
import uuid
import random
from datetime import datetime
from sqlmodel import Session, select
from app.core.db import engine
from app.models.models import User, StravaAccount, Activity, CanonicalRoute
from app.services.matching import match_activity_to_route
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import LineString
from shapely.ops import substring

def mock_strava_webhook(username: str, route_name: Optional[str] = None):
    """
    Simulates the Strava Webhook flow:
    1. Finds the user and their (real or mock) Strava ID.
    2. Creates a new activity (optionally based on a real CanonicalRoute).
    3. Triggers the matching service.
    """
    with Session(engine) as session:
        # 1. Find User
        stmt = select(User).where(User.username == username)
        user = session.exec(stmt).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            return

        # 2. Get Geometry
        wkt = None
        dist = 5000.0
        name = "Afternoon Hike"
        
        if route_name:
            route_stmt = select(CanonicalRoute).where(CanonicalRoute.name.ilike(f"%{route_name}%"))
            route = session.exec(route_stmt).first()
            if route:
                print(f"Using geometry from route: {route.name}")
                route_shape = to_shape(route.geometry)
                # Perturb it slightly (0.9 to 1.0 match)
                match_level = random.uniform(0.9, 1.0)
                activity_shape = substring(route_shape, 0, route_shape.length * match_level)
                wkt = activity_shape.wkt
                dist = activity_shape.length * 111320
                name = f"Hike on {route.name}"
            else:
                print(f"Warning: Route '{route_name}' not found. Using dummy geometry.")

        if not wkt:
            # Dummy geometry if no route found
            wkt = "LINESTRING(-122.401 37.791, -122.402 37.792, -122.403 37.793)"

        # 3. Create Activity (Simulating Webhook Ingestion)
        # Use a random large number for Strava Activity ID
        strava_id = random.randint(1000000000, 9999999999)
        
        new_activity = Activity(
            user_id=user.id,
            strava_activity_id=strava_id,
            raw_polyline=wkt,
            name=name,
            sport_type="Hike",
            distance=dist,
            moving_time=random.randint(1800, 7200),
            start_date=datetime.utcnow(),
            reactions_count=random.randint(0, 10),
            comments_count=random.randint(0, 3),
        )
        session.add(new_activity)
        session.flush()
        
        print(f"Created activity {new_activity.id} for {username}. Triggering matching...")
        
        # 4. Trigger Matching (The core of the webhook flow)
        match_activity_to_route(new_activity.id, session=session)
        
        session.commit()
        session.refresh(new_activity)
        
        if new_activity.canonical_route_id:
            print(f"Success! Activity matched to: {new_activity.canonical_route.name}")
        else:
            print("Activity created but no match found.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate Strava Webhook activity ingestion.")
    parser.add_argument("--username", type=str, required=True, help="Username to receive the activity")
    parser.add_argument("--route", type=str, help="Optional trail name to use as geometry template")
    
    import sys
    from typing import Optional
    
    args = parser.parse_args()
    mock_strava_webhook(args.username, args.route)
