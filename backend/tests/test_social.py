from app.models.models import User, Follow, CanonicalRoute
from sqlmodel import Session
from app.services.ranking import record_comparison


def test_follow_user(session: Session):
    u1 = User(display_name="User 1")
    u2 = User(display_name="User 2")
    session.add(u1)
    session.add(u2)
    session.commit()

    follow = Follow(follower_id=u1.id, followed_id=u2.id)
    session.add(follow)
    session.commit()

    session.refresh(u1)
    assert len(u1.following) == 1
    assert u1.following[0].id == u2.id


def test_private_follow_approval(session: Session):
    u1 = User(display_name="Requester")
    u2 = User(display_name="Private User", is_private=True)
    session.add(u1)
    session.add(u2)
    session.commit()

    # request follow
    from app.api.v1.endpoints.users import follow_user, approve_follow

    res = follow_user(user_id=u1.id, target_id=u2.id, session=session)
    assert res["status"] == "pending"

    # verify u1 is NOT yet following u2
    session.refresh(u1)
    assert len(u1.following) == 0

    # approve follow
    approve_follow(user_id=u2.id, follower_id=u1.id, session=session)

    # verify u1 IS now following u2
    session.refresh(u1)
    assert len(u1.following) == 1
    assert u1.following[0].id == u2.id


def test_friends_leaderboard(session: Session):
    # Setup users and relationships
    me = User(display_name="Me")
    friend = User(display_name="Friend")
    session.add(me)
    session.add(friend)
    session.commit()

    follow = Follow(follower_id=me.id, followed_id=friend.id)
    session.add(follow)

    # Setup routes and friend's ratings
    r1 = CanonicalRoute(name="Trail 1", geometry="LINESTRING(0 0, 1 1)")
    r2 = CanonicalRoute(name="Trail 2", geometry="LINESTRING(2 2, 3 3)")
    session.add(r1)
    session.add(r2)
    session.commit()

    # friend likes r1 more than r2
    record_comparison(session, friend.id, r1.id, r2.id)

    # query friends leaderboard for 'me'
    from app.api.v1.endpoints.ranking import get_friends_leaderboard

    results = get_friends_leaderboard(user_id=me.id, session=session)

    assert len(results) == 2
    # r1 should be first because friend ranked it higher
    assert results[0]["name"] == "Trail 1"
    assert results[0]["friends_avg_score"] > 1000
    assert results[1]["friends_avg_score"] < 1000
