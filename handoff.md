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
The project has transitioned into a functional "Dictionary-Style" platform with a stable identity system, a refined ranking engine, and a robust manual-matching staging area.

### Completed Tasks:
- [x] **New Rating System**: Migrated to a human-readable **1.00 - 10.00 scale**.
- [x] **Calibration Phase**: Threshold refined to **5 ranked hikes** for personal list visibility.
- [x] **Ranking UI**: Implemented a side-by-side pairwise comparison screen with **Anchored Matching**.
- [x] **First-Hike Baseline**: Implemented a "Quick Rank" workflow for the first hike.
- [x] **Social Feed Integration**: Added reactions, comments, and notes with a unified card aesthetic.
- [x] **Dual Viewport Feed**: Toggle between "Mountain Circle" and "My Rankings".
- [x] **Auto-Refresh Dashboard**: Used `useFocusEffect` to sync rankings immediately.
- [x] **Unit Conversion**: Fixed consistency for Distance (mi) and Elevation (ft).
- [x] **Staging Area Workflow**: Implemented a "manual-staging" model where raw activities must be promoted to trails before ranking.
- [x] **Activity Management**: Added "Hide" and "Restore" functionality for ignoring commute/walk activities.
- [x] **Manual Matching UI**: Built a dictionary-style promotion modal with real-time trail search.

### Verified State:
- `docker-compose up` runs successfully.
- `npm run web` launches the frontend.
- Backend and DB correctly handle UUID-based user identities and 1-10 rating scores.

## 4. Key Configuration Files
- `backend/app/core/config.py`: Contains rating system constants (`INITIAL_ELO_RATING=5.0`).
- `backend/app/services/ranking.py`: Core ranking logic with updated logistic scale factors.
- `frontend/app/(app)/dashboard.tsx`: Main user interface with View Toggles and Filter Drawer.
- `frontend/app/index.tsx`: Splash screen with dictionary phonetics.

## 5. Next Steps
1. **Filter Integration**: Connect the frontend filter chips to backend query parameters in `routes/search`.
2. **Activity Detail View**: Implement a drill-down view for deep dives into specific hike metadata and maps.
3. **Ranking Algorithm Calibration**: Tune the Elo/Bradley-Terry parameters to handle diverse trail difficulty profiles and user preference swings.
4. **Global Leaderboard Visualization**: Add a "Mountain Circle" graph visualization to the landing page.

## 6. Troubleshooting
- **Ngrok Conflict**: If the `cairn-ngrok-1` container fails with `ERR_NGROK_334`, ensure all other ngrok sessions using the `comrade-devotion-divinity` domain are terminated (check other devices/Macs).

---
*Generated on 2026-05-06*
