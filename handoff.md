# Project Cairn - Handoff Summary

## 1. Project Overview
**Cairn** is a social platform for hikers to track Strava activities and rank trails using a pairwise comparison engine (Bradley-Terry model).

## 2. Technical Stack
- **Backend:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 18 + PostGIS 3.6 (Geospatial indexing)
- **ORM:** SQLModel (SQLAlchemy-based) + GeoAlchemy2
- **Tunnels:** Dockerized ngrok for local webhook/OAuth testing
- **Frontend:** React Native (Expo SDK 54+) with Expo Router
- **Integration:** Strava API (OAuth2 + Webhooks)

## 3. Current Status
The project has transitioned into a functional "Dictionary-Style" platform with a stable identity system and a refined ranking engine.

### Completed Tasks:
- [x] **New Rating System**: Migrated from 1000 Elo to a human-readable **1.00 - 10.00 scale**.
- [x] **Calibration Phase**: Users now have a "Calibrating" status until they rank **10 hikes**.
- [x] **Dual Viewport Feed**: Users can toggle between the global "Mountain Circle" and their personal "My Rankings" list.
- [x] **Deep Filtering**: Implemented a filter drawer for Distance, **Elevation Gain**, and Location.
- [x] **Dictionary Aesthetic**: Implemented a premium, minimalist architectural UI with a focus on typography.
- [x] **Static Tunnel Stabilization**: Configured ngrok with pooling and skip-headers to ensure reliable development connectivity.
- [x] **Phonetics (Splash Only)**: Automated phonetic generation was tested but moved exclusively to the Splash screen to keep the main UI clean.

### Verified State:
- `docker-compose up` runs successfully.
- `npm run web` launches the frontend.
- Backend and DB correctly handle UUID-based user identities and 1-10 rating scores.
- Ngrok tunnel is currently experiencing a conflict with a home session (Mac); see Troubleshooting.

## 4. Key Configuration Files
- `backend/app/core/config.py`: Contains rating system constants (`INITIAL_ELO_RATING=5.0`).
- `backend/app/services/ranking.py`: Core ranking logic with updated logistic scale factors.
- `frontend/app/(app)/dashboard.tsx`: Main user interface with View Toggles and Filter Drawer.
- `frontend/app/index.tsx`: Splash screen with dictionary phonetics.

## 5. Next Steps
1. **Filter Integration**: Connect the frontend filter chips to backend query parameters in `routes/search`.
2. **Ranking UI**: Build the pairwise "Trail Choice" screen where users actually perform the rankings that drive the calibration bar.
3. **Strava Webhook Logic**: Finalize the activity-to-canonical route matching logic now that User IDs are UUIDs.
4. **Unit Preferences**: Implement the Metric/Imperial toggle in the Settings page.

## 6. Troubleshooting
- **Ngrok Conflict**: If the `cairn-ngrok-1` container fails with `ERR_NGROK_334`, ensure all other ngrok sessions using the `comrade-devotion-divinity` domain are terminated (check other devices/Macs).

---
*Generated on 2026-05-05*
