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
        "gsrlimit": limit
    }
    headers = {
        "User-Agent": "CairnApp/1.0 (contact@cairn.example.com)"
    }
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

ENRICHMENTS = {
    "Mist Trail": "The Mist Trail is Yosemite's signature hike. It features steep stone stairs alongside two massive waterfalls: Vernal and Nevada Fall. Prepare to get wet!",
    "John Muir Trail": "The John Muir Trail (JMT) is a premier long-distance trail in the Sierra Nevada mountain range of California, passing through Yosemite, Ansel Adams Wilderness, and Sequoia National Parks.",
    "Half Dome Trail": "The hike to Half Dome is one of the most iconic in the world. It culminates in a daring ascent up the cables on the sheer granite face of the dome.",
    "Four Mile Trail": "The Four Mile Trail provides continuous steep hiking with some of the most spectacular views of Yosemite Valley, including El Capitan and Yosemite Falls.",
    "Panorama Trail": "A beautiful trail descending from Glacier Point to Yosemite Valley, passing Illilouette Fall and offering unique views of Half Dome's back side."
}

def enrich():
    with Session(engine) as session:
        for name, desc in ENRICHMENTS.items():
            stmt = select(CanonicalRoute).where(CanonicalRoute.name.ilike(f"%{name}%"))
            route = session.exec(stmt).first()
            if route:
                print(f"Enriching {route.name}...")
                route.description = desc
                # Search specifically for the trail in Yosemite
                query = f"{route.name} Yosemite"
                images = fetch_wikimedia_images(query)
                if images:
                    route.images = images
                session.add(route)
        session.commit()
    print("Enrichment complete.")

if __name__ == "__main__":
    enrich()
