import requests
import polyline
from shapely.geometry import LineString
from app.core.config import settings

def exchange_code_for_token(code: str):
    """Exchange OAuth2 code for access and refresh tokens."""
    url = "https://www.strava.com/oauth/token"
    payload = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "client_secret": settings.STRAVA_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    }
    response = requests.post(url, data=payload)
    response.raise_for_status()
    return response.json()

def decode_polyline_to_wkt(encoded_polyline: str) -> str:
    """Convert Strava polyline to WKT LineString."""
    coords = polyline.decode(encoded_polyline)
    # Strava returns (lat, lon), Shapely expects (lon, lat) for GeoJSON/PostGIS
    line = LineString([(c[1], c[0]) for c in coords])
    return line.wkt

def get_activity_stream(activity_id: int, access_token: str):
    """Fetch activity stream (lat/lng) from Strava."""
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"keys": "latlng", "key_by_type": "true"}
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()
