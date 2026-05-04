from app.services.osm import osm_element_to_wkt


def test_osm_way_to_wkt():
    element = {
        "type": "way",
        "id": 1,
        "geometry": [{"lat": 37.0, "lon": -122.0}, {"lat": 37.1, "lon": -122.1}],
    }
    wkt = osm_element_to_wkt(element)
    assert wkt == "LINESTRING(-122.0 37.0, -122.1 37.1)"


def test_osm_relation_to_wkt():
    element = {
        "type": "relation",
        "id": 2,
        "members": [
            {
                "type": "way",
                "role": "",
                "geometry": [
                    {"lat": 37.0, "lon": -122.0},
                    {"lat": 37.1, "lon": -122.1},
                ],
            },
            {
                "type": "way",
                "role": "",
                "geometry": [
                    {"lat": 37.1, "lon": -122.1},
                    {"lat": 37.2, "lon": -122.2},
                ],
            },
        ],
    }
    wkt = osm_element_to_wkt(element)
    # Note: our current implementation just flattens/concatenates
    assert "LINESTRING" in wkt
    assert "-122.0 37.0" in wkt
    assert "-122.2 37.2" in wkt
