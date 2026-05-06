# Project "Cairn" (Beli for Hikes) - Technical Specification

## 1. Project Vision
A social platform for hikers to connect, track activity via Strava or custom hardware, and rank trails using a pairwise comparison engine (Bradley-Terry model). The system bridges the gap between variable GPS tracks and static "Canonical Routes" using a **Staging Area** workflow where users manually verify and promote activities to definitive trail matches.

## 2. Technical Stack
- **Frontend:** React Native (Expo) for cross-platform mobile access and Bluetooth/Map integration.
- **Backend:** FastAPI (Python) - chosen for superior geospatial libraries (`Shapely`, `GeoPandas`, `MovingPandas`).
- **Database:** PostgreSQL with **PostGIS** extension for spatial indexing and geometry comparisons.
- **Data Ingestion:** Strava API (OAuth2 + Webhooks).
- **Map Data:** OpenStreetMap (OSM) via Overpass API.

## 3. Core Modules & Logic

### A. The Staging Area (Activity Lifecycle)
Raw activities from Strava or hardware enter a "Staging Area" before appearing in the social circle.
1. **Unmatched Activity**: Raw GPS track without a canonical association.
2. **Promotion Modal**: Dictionary-style search interface where users select the correct trail from the database.
3. **Manual Matching**: User confirms the link between GPS track and `Canonical Route`.
4. **Ranking Prompt**: Once matched, the user is prompted to rank the trail against their previous hikes.

### B. The Canonical Route Engine (Source of Truth)
Unlike restaurants, hikes are lines, not points.
- **Database Schema:** `canonical_routes` table with `geometry` column (GEOMETRY type).
- **Seeding:** Use Overpass API to pull `route=hiking` relations from OSM.
- **Auto-Matching (Heuristic):** The system attempts to suggest a match based on geospatial overlap (>80%), but the **User Match** is the final authority.

### C. The Ranking Engine (The "Beli" Logic)
- **Algorithm:** pairwise comparison logic (Bradley-Terry implementation).
- **Status:** **[UNDER REVISION]** Current score distributions are unsatisfactory. The algorithm will be revisited to improve normalization and handle edge cases in trail difficulty.
- **Metric:** Human-readable **1.00 - 10.00 scale**.
- **Calibration Phase**: Users must rank **5 trails** before their scores are visible to the public feed.
- **Workflow:**
    1. User promotes an activity to a Canonical Route.
    2. UI presents: "Which was better: [New Hike] or [Previous Hike]?"
    3. Database updates rankings.

### D. Activity Management
- **Ignore**: Users can hide non-hike activities (commutes, walks).
- **Restore**: Ignored activities can be un-hidden via the Settings menu.

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
    rating_score FLOAT DEFAULT 500 -- Internal Elo
);

CREATE TABLE activities (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    strava_activity_id BIGINT,
    raw_polyline GEOMETRY(LineString, 4326),
    canonical_route_id INT REFERENCES canonical_routes(id),
    is_ranked BOOLEAN DEFAULT FALSE,
    is_ignored BOOLEAN DEFAULT FALSE,
    personal_score FLOAT
);
```

## 5. Development Roadmap

### Phase 1: Ingestion Infrastructure
- [x] Set up FastAPI project structure with PostgreSQL/PostGIS connection.
- [x] Implement Strava OAuth2 flow and Webhook validation.
- [x] Create utility to convert Strava Polylines to PostGIS LineStrings.

### Phase 2: Geometry Matching & Seeding
- [x] Build script to seed `canonical_routes` from OSM Overpass API.
- [x] Implement Map Matching logic using `ST_Transform` (3857) for precise overlap calculation.
- [x] Centralize Park constants and bounding boxes.

### Phase 3: The Staging Area & Matching UI
- [x] Build "My Rankings" staging area logic.
- [x] Implement "Promote to Trail" search and manual matching endpoint.
- [x] Add "Hide/Ignore" functionality for clean activity feeds.
- [x] Resolve TypeScript focus/styling conflicts for premium web UI.

### Phase 4: Ranking Refinement
- [ ] Implement advanced Bradley-Terry weighting (distance/elevation influence).
- [ ] Build global leaderboard visualization with Mountain Circle graph.
- [ ] Add Activity Detail view with PostGIS-rendered maps.
