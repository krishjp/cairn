# Project Cairn - Handoff Summary

## 1. Project Overview
**Cairn** is a social platform for hikers to track Strava activities and rank trails using a pairwise comparison engine (Bradley-Terry model).

## 2. Technical Stack
- **Backend:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 18 + PostGIS 3.6 (Geospatial indexing)
- **ORM:** SQLModel (SQLAlchemy-based) + GeoAlchemy2
- **Tunnels:** Dockerized ngrok for local webhook/OAuth testing
- **Integration:** Strava API (OAuth2 + Webhooks)

## 3. Current Status (End of Phase 4 Backend)
Phase 4 (Manual Promotion Logic) is **Complete and Verified**.

### Completed Tasks:
- [x] **Docker Stack**: `db`, `backend`, and `ngrok` services are configured and talking to each other.
- [x] **Geospatial Database**: Schema implemented with `LineString` support for trails and raw GPS tracks.
- [x] **Strava OAuth2**: Handshake is working. Users can authorize, and the app receives tokens/athlete data.
- [x] **Webhook Infrastructure**: Listener is ready with verification logic and `hub.challenge` support.
- [x] **Utility Layers**: Polyline decoding to WKT/PostGIS LineStrings is implemented.
- [x] **OSM Seeding**: CLI tool to seed routes for SF and National Parks.
- [x] **Map Matching**: 80% overlap threshold logic using Shapely.
- [x] **Ranking Engine**: User-specific and Global Elo ratings (Bradley-Terry).
- [x] **Trail Promotion**: Logic to clean (high-precision trimming + simplification) and promote activities to Canonical Routes.
- [x] **Architecture Refactor**: Decoupled Users from Strava Accounts to support future "Hikebox" (manual/ESP32) uploads.
- [x] **Frontend Foundation**: Expo (React Native) initialized with Expo Router, custom hand-drawn branding, and "Dark Forest" theme.

### Verified State:
- `docker-compose up` runs successfully.
- `python -m app.db_init` creates all tables.
- `GET /api/v1/strava/authorize` successfully initiates the Strava flow via the ngrok tunnel.

## 4. Key Configuration Files
- `docker-compose.yml`: Services and port mappings (8000 for API, 4040 for ngrok dashboard).
- `.env`: Contains Strava credentials and ngrok tokens (User-managed).
- `backend/app/models/models.py`: Defines the PostGIS-enabled SQLModel schema.

## 5. Next Steps (Phase 3 & 5: Frontend & Ranking)
1. **Swipe Interface**: Implement the React Native "Pairwise Vote" component using the Bradley-Terry logic.
2. **Strava Webhook Processing**: Fully link the background task to fetch streams on activity creation.
3. **Leaderboards**: Build the mobile UI for Global vs. Friend rankings.
4. **Hikebox Integration**: Implement the file upload handler for manual polyline ingestion.

---
*Generated on 2026-05-03*
