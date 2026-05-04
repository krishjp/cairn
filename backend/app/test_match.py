import argparse
import logging
from app.models.models import User, Activity
from app.services.matching import match_activity_to_route
from app.services.strava import decode_polyline_to_wkt
from sqlmodel import Session, select
from app.core.db import engine

logging.basicConfig(level=logging.INFO)


def main():
    parser = argparse.ArgumentParser(
        description="Test map matching logic with a provided polyline."
    )
    parser.add_argument(
        "--polyline", type=str, required=True, help="Google encoded polyline string"
    )

    args = parser.parse_args()

    with Session(engine) as session:
        user = session.exec(
            select(User).where(User.display_name == "Test User")
        ).first()
        if not user:
            user = User(display_name="Test User", strava_id=12345)
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"Created test user: {user.id}")

        # decode and create activity
        try:
            wkt = decode_polyline_to_wkt(args.polyline)
            activity = Activity(
                user_id=user.id, strava_activity_id=999999, raw_polyline=wkt
            )
            session.add(activity)
            session.commit()
            session.refresh(activity)
            print(f"Created test activity: {activity.id}")

            # run matching
            print("Running matching engine...")
            result = match_activity_to_route(activity.id, session=session)

            if result:
                route_id, confidence = result
                print(
                    f"SUCCESS: Matched to Route ID {route_id} with {confidence*100:.1f}% confidence."
                )
            else:
                print(
                    "NO MATCH: The activity did not overlap sufficiently with any canonical route (>80%)."
                )

        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
