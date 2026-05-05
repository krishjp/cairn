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
The project has successfully bridged the gap between the FastAPI backend and the Expo mobile app, establishing a functional authentication and user lifecycle flow.

### Completed Tasks:
- [x] **Strava OAuth2 Integration**: End-to-end flow working with `WebBrowser` and `AuthSession`.
- [x] **Cross-Platform Redirects**: Backend now supports dynamic `state` parameters to redirect back to either the mobile app (`cairn-app://`) or web browser (`localhost:8081`).
- [x] **CORS Configuration**: Backend is configured to allow requests from the local Expo development origin.
- [x] **Auth State Management**: Implemented `AuthContext` on the frontend to manage global user sessions and profile persistence.
- [x] **Premium Dashboard**: Replaced the landing page with a "Beli-style" dashboard featuring an activity feed and Strava syncing interface.
- [x] **Branding & Assets**: Tightened logo assets and configured browser tab titles ("Cairn") for web builds.

### Verified State:
- `docker-compose up` runs successfully.
- `npm run web` launches the frontend.
- Authentication correctly redirects to the Dashboard upon success.

## 4. Key Configuration Files
- `backend/app/main.py`: Contains CORS middleware and router definitions.
- `frontend/.env`: Defines `EXPO_PUBLIC_API_URL` for backend connectivity.
- `frontend/app/(app)/dashboard.tsx`: Main user interface post-login.
- `frontend/context/AuthContext.tsx`: Global session management.

## 5. Next Steps
1. **Real Data Fetching**: Connect the "Sync Activities" button to a backend endpoint that pulls the latest Strava streams.
2. **Swipe Interface**: Implement the React Native "Pairwise Vote" component to rank recently synced hikes.
3. **Leaderboards**: Build the mobile UI for Global vs. Friend rankings based on backend Elo scores.
4. **Hikebox Integration**: Support manual polyline uploads for non-Strava activities.

---
*Generated on 2026-05-05*
