# Project "Cairn" (Beli for Hikes) - Technical Specification

## 1. Project Vision
A social platform for hikers to connect, track activity via Strava or custom hardware, and rank trails using a pairwise comparison engine (Bradley-Terry model). The system must bridge the gap between variable GPS tracks and static "Canonical Routes" to create a definitive leaderboard of trails within a social circle.

## 2. Technical Stack
- **Frontend:** React Native (Expo) for cross-platform mobile access and Bluetooth/Map integration.
- **Backend:** FastAPI (Python) - chosen for superior geospatial libraries (`Shapely`, `GeoPandas`, `MovingPandas`).
- **Database:** PostgreSQL with **PostGIS** extension for spatial indexing and geometry comparisons.
- **Data Ingestion:** Strava API (OAuth2 + Webhooks).
- **Map Data:** OpenStreetMap (OSM) via Overpass API.

## 3. Core Modules & Logic

### A. The Canonical Route Engine (Source of Truth)
Unlike restaurants, hikes are lines, not points.
- **Database Schema:** `canonical_routes` table with `geometry` column (GEOMETRY type).
- **Seeding:** Use Overpass API to pull `route=hiking` relations from OSM.
- **Matching Logic:** Implement a "Map Matching" service.
    - **Input:** Raw Strava Polyline.
    - **Process:** Snap GPS points to the nearest OSM nodes.
    - **Metric:** If overlap > 80% with a Canonical Route, tag activity as that route.
    - **Edge Case:** If overlap < 80%, flag as "Potential New Route" for user verification.

### B. The Ranking Engine (The "Beli" Logic)
- **Algorithm:** Bradley-Terry Model (implemented via `statsmodels` or custom Elo-based logic).
- **Workflow:**
    1. User completes Hike A.
    2. System identifies Hike A via Map Matching.
    3. UI presents: "Which was better: [Hike A] or [Previous Hike B]?"
    4. Database updates the `global_rank` and `user_specific_rank` based on the win/loss.

### C. Strava Ingestion Pipeline
- **Webhook Listener:** Receive `activity_id` from Strava.
- **Fetcher:** Request full `stream` data (lat/lng, time, altitude, heart_rate).
- **Processor:** Decode Google Polylines into PostGIS LineStrings.
- **Media Ingestion (Future):** Pull activity photos via the Strava API and associate them with the `Activity` record.
- **Hikebox Integration (Future):** Support for manual polyline uploads from custom ESP32 "hikebox" hardware. Data will be normalized to the internal "Activity" format to bypass Strava dependency for non-Strava users.

## 4. Database Schema (Draft)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    strava_id INT UNIQUE,
    display_name TEXT
);

CREATE TABLE canonical_routes (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    name TEXT,
    geometry GEOMETRY(LineString, 4326),
    difficulty_rating FLOAT
);

CREATE TABLE activities (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    strava_activity_id BIGINT,
    raw_polyline GEOMETRY(LineString, 4326),
    canonical_route_id INT REFERENCES canonical_routes(id),
    match_confidence FLOAT
);

CREATE TABLE comparisons (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    winner_route_id INT REFERENCES canonical_routes(id),
    loser_route_id INT REFERENCES canonical_routes(id),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## 5. Development Roadmap

### Phase 1: Ingestion Infrastructure
- [x] Set up FastAPI project structure with PostgreSQL/PostGIS connection.
- [x] Implement Strava OAuth2 flow and Webhook validation.
- [x] Create utility to convert Strava Polylines to PostGIS LineStrings.

### Phase 2: Geometry Matching & Seeding
- [x] Build script to seed `canonical_routes` from OSM Overpass API.
- [x] Implement the Map Matching logic using `ST_Transform` (3857) to determine activity-to-trail overlap with metric precision.
- [x] Centralize Park constants and bounding boxes.

### Phase 3: The Ranking UI & Logic
- [x] Initialized Expo (React Native) project with modern "Dark Forest" theme.
- [x] Implemented editorial Splash screen and Home Dashboard.
- [ ] Create the Bradley-Terry/Elo update function in the backend.
- [ ] Design React Native "Pairwise Vote" swipe component.
- [ ] Build "Leaderboard" view showing Global vs. Friend rankings.

### Phase 4: "Add a Hike" Feature
- [x] Build backend logic for users to "Promote" an unidentified GPS track to a Canonical Route.
- [x] Implement geometry cleaning (high-precision trimming/simplification).
- [x] Refactor User architecture to decouple from Strava for future "Hikebox" support.
- [ ] Build UI for users to name and trigger promotion from the mobile app.
