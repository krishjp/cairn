from sqlmodel import Session, select
from app.models.models import Activity, CanonicalRoute
from app.core.db import engine

with Session(engine) as session:
    acts = session.exec(select(Activity).where(Activity.canonical_route_id.is_not(None))).all()
    for a in acts:
        route = session.get(CanonicalRoute, a.canonical_route_id)
        if not route:
            print(f"Activity {a.name} points to missing route {a.canonical_route_id}")
            # Try to fix it by matching name
            clean_name = a.name.replace("[MOCK] ", "")
            stmt = select(CanonicalRoute).where(CanonicalRoute.name.ilike(f"%{clean_name}%"))
            new_route = session.exec(stmt).first()
            if new_route:
                print(f"  Fixed! Linked to {new_route.name} (ID: {new_route.id})")
                a.canonical_route_id = new_route.id
                session.add(a)
    session.commit()
