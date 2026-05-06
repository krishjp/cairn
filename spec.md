# Project "Cairn" (Beli for Hikes) - Technical Specification

## 1. Project Vision
A social platform for hikers to connect, track activity via Strava or custom hardware, and rank trails using a Bayesian ranking engine (TrueSkill model). The system bridges the gap between variable GPS tracks and static "Canonical Routes" using a **Staging Area** workflow where users manually verify and promote activities to definitive trail matches.

## 2. Technical Stack
- **Frontend:** React Native (Expo) for cross-platform mobile access and Bluetooth/Map integration.
- **Backend:** FastAPI (Python) - chosen for superior geospatial libraries (`Shapely`, `GeoPandas`, `MovingPandas`).
- **Database:** PostgreSQL with **PostGIS** extension for spatial indexing and geometry comparisons.
- **Data Ingestion:** Strava API (OAuth2 + Webhooks).
- **Map Data:** OpenStreetMap (OSM) via Overpass API.

## 3. Core Modules & Logic

### A. The Staging Area (Activity Lifecycle)
Raw activities from Strava or hardware enter a "Staging Area" before appearing in the social circle.
- **Unmatched Activity**: Raw GPS track without a canonical association.
- **Promotion Modal**: Dictionary-style search interface where users select the correct trail from the database.
- **Manual Matching**: User confirms the link between GPS track and `Canonical Route`.
- **Ranking Prompt**: Once matched, the user is prompted to rank the trail against their previous hikes.

### B. The Canonical Route Engine (Source of Truth)
Unlike restaurants, hikes are lines, not points.
- **Database Schema:** `canonical_routes` table with `geometry` column (GEOMETRY type).
- **Seeding:** Use Overpass API to pull `route=hiking` relations from OSM.
- **Auto-Matching (Heuristic):** The system attempts to suggest a match based on geospatial overlap (>80%), but the **User Match** is the final authority.

### C. The Ranking Engine (The "Beli" Logic)
- **Algorithm:** **TrueSkill Bayesian Inference**.
- **Metrics:** Tracks Quality ($\mu$) and Uncertainty ($\sigma$) for every trail.
- **Dynamic Bucketing**: Automatically partitions trails into **Peak (Top 25%)**, **Another Hike (Middle 50%)**, and **A Hill (Bottom 25%)** based on percentile rank.
- **Active Selection**: Calibration is driven by match quality, prioritizing comparisons between trails with similar scores and high uncertainty to maximize information gain.
- **Metric:** Human-readable **1.00 - 10.00 scale**.
- **Calibration Phase**: Users must rank **5 trails** before their scores are visible to the public feed.
- **Workflow:**
    - User promotes an activity to a Canonical Route.
    - UI presents: "Which was better: [New Hike] or [Previous Hike]?"
    - Database updates $\mu$ and $\sigma$ values.

### E. Immersive Trail Discovery
- **Route Detail Page**: Rich dictionary-inspired view for every trail.
- **Dynamic Imagery**: Automated photo galleries sourced from Wikimedia Commons (Public API).
- **Consensus Rankings**: Displays Personal, Mountain Circle Average, and Global Consensus scores.
- **Social Proof**: Toggleable reviews between friends and the global community.

## 4. Database Schema (Current)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    display_name TEXT
);

CREATE TABLE canonical_routes (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    name TEXT,
    geometry GEOMETRY(LineString, 4326),
    description TEXT,
    images JSONB, -- Array of public photo URLs
    rating_score FLOAT, -- Unified 1.0-10.0 score
    rating_mu FLOAT, -- Bayesian Mean
    rating_sigma FLOAT -- Bayesian Uncertainty
);

CREATE TABLE activities (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    strava_activity_id BIGINT,
    raw_polyline GEOMETRY(LineString, 4326),
    canonical_route_id INT REFERENCES canonical_routes(id),
    is_ignored BOOLEAN DEFAULT FALSE,
    match_confidence FLOAT
);

CREATE TABLE user_route_ratings (
    user_id UUID,
    canonical_route_id INT,
    rating_score FLOAT,
    last_ranked_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (user_id, canonical_route_id)
);
```

## 5. Development Roadmap

### Phase 1: Ingestion Infrastructure (Complete)
- [x] Set up FastAPI project structure with PostgreSQL/PostGIS connection.
- [x] Implement Strava OAuth2 flow and Webhook validation.
- [x] Create utility to convert Strava Polylines to PostGIS LineStrings.

### Phase 2: Geometry Matching & Seeding (Complete)
- [x] Build script to seed `canonical_routes` from OSM Overpass API.
- [x] Implement Map Matching logic using overlap calculation.

### Phase 3: The Staging Area & Matching UI (Complete)
- [x] Build "My Rankings" staging area logic.
- [x] Implement "Promote to Trail" search and manual matching endpoint.
*   [x] Add "Hide/Ignore" functionality for clean activity feeds.

### Phase 4: Ranking & Social Discovery (Active)
- [x] Implement TrueSkill Bayesian engine with $\mu$ and $\sigma$ updates.
- [x] Implement Dynamic Percentile Bucketing (25/50/25).
- [x] Build "Recently Ranked" Social Feed with outer-join ordering.
- [x] Implement Immersive Trail Detail page with Banner Overlap design.
- [x] Integrate Wikimedia Commons API for automated photo galleries.
- [ ] Build global leaderboard visualization with Mountain Circle graph.
- [ ] Add Activity Detail view with PostGIS-rendered maps.
