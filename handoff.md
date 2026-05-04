# Project Cairn - Handoff Summary

## 1. Project Overview
**Cairn** is a social platform for hikers to track Strava activities and rank trails using a pairwise comparison engine (Bradley-Terry model).

## 2. Technical Stack
- **Backend:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 15 + PostGIS (Geospatial indexing)
- **ORM:** SQLModel (SQLAlchemy-based) + GeoAlchemy2
- **Tunnels:** Dockerized ngrok for local webhook/OAuth testing
- **Integration:** Strava API (OAuth2 + Webhooks)

## 3. Current Status (End of Phase 3)
Phase 3 (Ranking Engine) is **Complete and Verified**.

### Completed Tasks:
- [x] **Docker Stack**: `db`, `backend`, and `ngrok` services are configured and talking to each other.
- [x] **Geospatial Database**: Schema implemented with `LineString` support for trails and raw GPS tracks.
- [x] **Strava OAuth2**: Handshake is working. Users can authorize, and the app receives tokens/athlete data.
- [x] **Webhook Infrastructure**: Listener is ready with verification logic and `hub.challenge` support.
- [x] **Utility Layers**: Polyline decoding to WKT/PostGIS LineStrings is implemented.
- [x] **OSM Seeding**: CLI tool to seed routes for SF and National Parks.
- [x] **Map Matching**: 80% overlap threshold logic using Shapely.
- [x] **Ranking Engine**: User-specific and Global Elo ratings (Bradley-Terry).

### Verified State:
- `docker-compose up` runs successfully.
- `python -m app.db_init` creates all tables.
- `GET /api/v1/strava/authorize` successfully initiates the Strava flow via the ngrok tunnel.

## 4. Key Configuration Files
- `docker-compose.yml`: Services and port mappings (8000 for API, 4040 for ngrok dashboard).
- `.env`: Contains Strava credentials and ngrok tokens (User-managed).
- `backend/app/models/models.py`: Defines the PostGIS-enabled SQLModel schema.

## 5. Next Steps (Phase 4: Frontend)
1. **React Native UI**: Implement the "Pairwise Vote" swipe interface and Leaderboard screens.
2. **Media Ingestion**: Implement pulling activity photos from Strava API.
3. **Friend Rankings**: Implement social layer to filter rankings by friends.

---
*Generated on 2026-05-03*
