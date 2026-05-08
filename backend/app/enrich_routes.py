import requests
from sqlmodel import Session, select
from app.core.db import engine
from app.models.models import CanonicalRoute


def fetch_wikimedia_images(query: str, limit: int = 3):
    print(f"Searching Wikimedia for: {query}...")
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,  # File namespace
        "iiprop": "url",
        "gsrlimit": limit,
    }
    headers = {"User-Agent": "CairnApp/1.0 (contact@cairn.example.com)"}
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        urls = []
        for page in pages.values():
            infos = page.get("imageinfo", [])
            if infos:
                urls.append(infos[0]["url"])
        return urls
    except Exception as e:
        print(f"Error fetching images: {e}")
        return []


def fetch_wikipedia_summary(title: str):
    print(f"Fetching summary for: {title}...")
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + requests.utils.quote(
        title
    )
    headers = {"User-Agent": "CairnApp/1.0 (contact@cairn.example.com)"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data.get("extract")
        return None
    except Exception as e:
        print(f"Error fetching summary: {e}")
        return None


def enrich():
    with Session(engine) as session:
        # Get all routes that need description or images
        stmt = select(CanonicalRoute)
        routes = session.exec(stmt).all()

        for route in routes:
            print(f"Processing {route.name}...")

            # 1. Fetch description if missing
            if not route.description:
                summary = fetch_wikipedia_summary(route.name)
                if not summary:
                    # Try with "Trail" appended if not found
                    summary = fetch_wikipedia_summary(f"{route.name} Trail")

                if not summary and " Trail" in route.name:
                    # Try stripping " Trail" (e.g. "Half Dome Trail" -> "Half Dome")
                    summary = fetch_wikipedia_summary(route.name.replace(" Trail", ""))

                if summary:
                    route.description = summary
                    print(f"  Added description for {route.name}")


            # 2. Fetch images if missing
            if not route.images or len(route.images) == 0:
                query = f"{route.name} Yosemite"
                images = fetch_wikimedia_images(query)
                if images:
                    route.images = images
                    print(f"  Added {len(images)} images for {route.name}")

            session.add(route)
            session.commit()  # Commit each to avoid losing progress

    print("Enrichment complete.")


if __name__ == "__main__":
    enrich()
