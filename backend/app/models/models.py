from typing import Optional, List
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Relationship, Column
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, Float, DateTime, Text, Integer

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    strava_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(BigInteger, unique=True, nullable=True)
    )
    display_name: Optional[str] = Field(
        default=None, 
        sa_column=Column(Text, nullable=True)
    )
    
    # OAuth tokens
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[int] = None

    activities: List["Activity"] = Relationship(back_populates="user")
    comparisons: List["Comparison"] = Relationship(back_populates="user")

class CanonicalRoute(SQLModel, table=True):
    __tablename__ = "canonical_routes"
    id: Optional[int] = Field(default=None, primary_key=True)
    osm_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(BigInteger, unique=True, nullable=True)
    )
    name: str = Field(sa_column=Column(Text, nullable=False))
    geometry: str = Field(sa_column=Column(Geometry("LINESTRING", srid=4326), nullable=False))
    difficulty_rating: Optional[float] = Field(
        default=None, 
        sa_column=Column(Float, nullable=True)
    )

    activities: List["Activity"] = Relationship(back_populates="canonical_route")

class Activity(SQLModel, table=True):
    __tablename__ = "activities"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    strava_activity_id: Optional[int] = Field(
        default=None, 
        sa_column=Column(BigInteger, nullable=True)
    )
    raw_polyline: str = Field(sa_column=Column(Geometry("LINESTRING", srid=4326), nullable=False))
    canonical_route_id: Optional[int] = Field(default=None, foreign_key="canonical_routes.id")
    match_confidence: Optional[float] = Field(
        default=None, 
        sa_column=Column(Float, nullable=True)
    )

    user: User = Relationship(back_populates="activities")
    canonical_route: Optional[CanonicalRoute] = Relationship(back_populates="activities")

class Comparison(SQLModel, table=True):
    __tablename__ = "comparisons"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    winner_route_id: int = Field(foreign_key="canonical_routes.id")
    loser_route_id: int = Field(foreign_key="canonical_routes.id")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, 
        sa_column=Column(DateTime, default=datetime.utcnow, nullable=False)
    )

    user: User = Relationship(back_populates="comparisons")
