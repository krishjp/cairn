# Development Guide

This document covers the setup, installation, and internal tools for developing on Cairn.

## Setup and Installation

### 1. Configure Environment
Copy the `.env.example` file to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

**Frontend Environment:**
Create a `.env` file in the `frontend` directory:
```bash
# frontend/.env
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev
```

### 2. Start Services
Ensure Docker is running and execute:

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
```

> [!TIP]
> If you've just pulled changes that updated `backend/requirements.txt`, you should rebuild your backend image to install new dependencies:
> ```bash
> docker compose up -d --build
> ```

### 3. Database Migrations (Alembic)
Cairn uses Alembic for database migrations, providing a workflow similar to Django:

*   **Create a migration** (after changing `models.py`):
    ```bash
    docker compose exec backend alembic revision --autogenerate -m "description of change"
    ```
*   **Apply migrations**:
    ```bash
    docker compose exec backend alembic upgrade head
    ```
*   **Revert last migration**:
    ```bash
    docker compose exec backend alembic downgrade -1
    ```

### 4. Seed Trail Data
Populate the database with trails from specific regions. This command automatically triggers automated enrichment (descriptions from Wikipedia and imagery from Wikimedia Commons):

```bash
# Seed and enrich a park (e.g., yosemite)
docker compose exec backend python -m app.seed_osm --park yosemite

# Or seed a custom bounding box
docker compose exec backend python -m app.seed_osm --bbox "lat_min,lon_min,lat_max,lon_max"
```

---

## Useful Developer CLI Tools

### Wipe Rankings
Reset all comparison history and personal scores for testing:
```bash
docker compose exec backend python -m app.wipe_rankings
```

### Mock Data Management
Populate your feed with test activities from Yosemite (Mist Trail, etc.):
```bash
# Attach mock hikes to a specific username
docker compose exec backend python -m app.manage_mock_data --attach-user <USERNAME>

# Or via User ID
docker compose exec backend python -m app.manage_mock_data --attach <YOUR_USER_ID>
```

### Mock Strava Webhooks
Simulate the end-to-end ingestion flow (creation + matching) without real Strava API calls:
```bash
# Mock a new hike for a user using an existing trail as geometry
docker compose exec backend python -m app.mock_webhook --username <USERNAME> --route "Mist Trail"
```

### User Management
Promote or demote users to admin status:
```bash
# Promote a user to admin
docker compose exec backend python -m app.manage_users --username <USERNAME> --admin

# Demote a user from admin
docker compose exec backend python -m app.manage_users --username <USERNAME> --no-admin
```

---

## Frontend Setup (Mobile & Web)
The app is built with Expo and can be run on iOS, Android, or Web.

```bash
cd frontend
npm install
npm run web  # For browser access
# OR
npx expo start  # Scan QR code with Expo Go on your phone
```

## API Documentation
Once the stack is running, interactive documentation is available at:
*   **Swagger UI:** http://localhost:8000/docs
*   **Ngrok Dashboard:** http://localhost:4040
