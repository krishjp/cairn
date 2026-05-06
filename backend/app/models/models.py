from typing import Optional, List
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Relationship, Column
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Float, DateTime, Text, JSON


class UserRouteRating(SQLModel, table=True):
    __tablename__ = "user_route_ratings"
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    canonical_route_id: int = Field(foreign_key="canonical_routes.id", primary_key=True)
    rating_score: float = Field(default=5.0, sa_column=Column(Float, nullable=False))
    rating_mu: float = Field(default=5.0, sa_column=Column(Float, nullable=False))
    rating_sigma: float = Field(default=1.5, sa_column=Column(Float, nullable=False))
    last_ranked_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, default=datetime.utcnow, nullable=False),
    )

    user: "User" = Relationship(back_populates="route_ratings")
    canonical_route: "CanonicalRoute" = Relationship(back_populates="user_ratings")


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    display_name: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    is_private: bool = Field(default=False)

    # Relationships
    strava_account: Optional["StravaAccount"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"uselist": False}
    )
    activities: List["Activity"] = Relationship(back_populates="user")
    comparisons: List["Comparison"] = Relationship(back_populates="user")
    route_ratings: List["UserRouteRating"] = Relationship(back_populates="user")

    # Friends / Following
    following: List["User"] = Relationship(
        link_model=None,
        back_populates="followers",
        sa_relationship_kwargs={
            "secondary": "follows",
            "primaryjoin": "and_(User.id == Follow.follower_id, Follow.status == 'accepted')",
            "secondaryjoin": "User.id == Follow.followed_id",
        },
    )
    followers: List["User"] = Relationship(
        link_model=None,
        back_populates="following",
        sa_relationship_kwargs={
            "secondary": "follows",
            "primaryjoin": "and_(User.id == Follow.followed_id, Follow.status == 'accepted')",
            "secondaryjoin": "User.id == Follow.follower_id",
        },
    )


class StravaAccount(SQLModel, table=True):
    __tablename__ = "strava_accounts"
    strava_id: int = Field(unique=True, index=True, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)

    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None

    # Relationship
    user: User = Relationship(back_populates="strava_account")


class Follow(SQLModel, table=True):
    __tablename__ = "follows"
    follower_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    followed_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    status: str = Field(default="accepted")  # "pending" or "accepted"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CanonicalRoute(SQLModel, table=True):
    __tablename__ = "canonical_routes"
    id: Optional[int] = Field(default=None, primary_key=True)
    osm_id: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger, unique=True, nullable=True)
    )
    name: str = Field(sa_column=Column(Text, nullable=False))
    geometry: str = Field(
        sa_column=Column(Geometry("LINESTRING", srid=4326), nullable=False)
    )
    difficulty_rating: Optional[float] = Field(
        default=None, sa_column=Column(Float, nullable=True)
    )
    rating_score: float = Field(default=5.0, sa_column=Column(Float, nullable=False))
    rating_mu: float = Field(default=5.0, sa_column=Column(Float, nullable=False))
    rating_sigma: float = Field(default=1.5, sa_column=Column(Float, nullable=False))
    description: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    images: Optional[list] = Field(default=None, sa_column=Column(JSON, nullable=True))

    activities: List["Activity"] = Relationship(back_populates="canonical_route")
    user_ratings: List["UserRouteRating"] = Relationship(
        back_populates="canonical_route"
    )


class Activity(SQLModel, table=True):
    __tablename__ = "activities"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    strava_activity_id: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger, nullable=True)
    )
    raw_polyline: str = Field(
        sa_column=Column(Geometry("LINESTRING", srid=4326), nullable=False)
    )
    name: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    sport_type: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    distance: Optional[float] = Field(
        default=None, sa_column=Column(Float, nullable=True)
    )
    moving_time: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger, nullable=True)
    )
    start_date: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, nullable=True)
    )
    is_ignored: bool = Field(default=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    reactions_count: int = Field(default=0)
    comments_count: int = Field(default=0)
    canonical_route_id: Optional[int] = Field(
        default=None, foreign_key="canonical_routes.id"
    )
    match_confidence: Optional[float] = Field(
        default=None, sa_column=Column(Float, nullable=True)
    )

    user: User = Relationship(back_populates="activities")
    canonical_route: Optional[CanonicalRoute] = Relationship(
        back_populates="activities"
    )


class Comparison(SQLModel, table=True):
    __tablename__ = "comparisons"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    winner_route_id: int = Field(foreign_key="canonical_routes.id")
    loser_route_id: int = Field(foreign_key="canonical_routes.id")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, default=datetime.utcnow, nullable=False),
    )

    user: User = Relationship(back_populates="comparisons")


class Bookmark(SQLModel, table=True):
    __tablename__ = "bookmarks"
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    canonical_route_id: int = Field(foreign_key="canonical_routes.id", primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship()
    canonical_route: CanonicalRoute = Relationship()
