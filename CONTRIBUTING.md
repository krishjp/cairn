# Contributing to Cairn

Thank you for your interest in improving Cairn! This document outlines our development standards and upcoming goals.

## Development and Testing

### Running Tests
The project uses `pytest` with database transaction rollbacks for isolated testing:

```bash
docker compose exec backend pytest
```

### Linting and Formatting
We use `ruff` to ensure a consistent code style. Please run these before submitting a Pull Request:

```bash
docker compose exec backend ruff check .
docker compose exec backend ruff format .
```

## Project Roadmap

We are currently focused on the following areas:

- [ ] **Mocked Webhook Testing**: Expand `mock_webhook.py` to support full JSON payload simulation via `curl` to the actual `/webhook` endpoint.
- [ ] **Geometry Distortion**: Add more realistic GPS "drift" to mock activities to test matching robustness.
- [ ] **Strava Webhook Signature Verification**: Implement security headers for production webhooks.
- [ ] **Offline Maps**: Cached map tiles for use in low-signal trailheads.

## Community Standards

- **Privacy First**: Never commit real user GPS data or Strava credentials to the repository.
- **Architectural Integrity**: Keep the "Dictionary-Style" aesthetic consistent across new components.
- **Documentation**: If you add a new CLI tool, please document it in `DEVELOPMENT.md`.
