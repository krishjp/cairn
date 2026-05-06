from app.services.ranking_service import (
    update_rating,
    calculate_match_quality,
    assign_bucket_label,
)


def test_initial_win():
    """Testing a win between two fresh hikes in the same bucket."""
    w_mu, w_sigma = 5.5, 1.0
    l_mu, l_sigma = 5.5, 1.0

    (nw_mu, nw_sigma), (nl_mu, nl_sigma) = update_rating(w_mu, w_sigma, l_mu, l_sigma)

    assert nw_mu > w_mu
    assert nl_mu < l_mu
    assert nw_sigma < w_sigma
    assert nl_sigma < l_sigma
    print(
        f"\nInitial Win: {nw_mu:.2f} (σ={nw_sigma:.2f}) beats {nl_mu:.2f} (σ={nl_sigma:.2f})"
    )


def test_upset_win():
    """Testing an upset: A 'Hill' (low mu) beats a 'Peak' (high mu)."""
    w_mu, w_sigma = 2.0, 1.0  # The underdog
    l_mu, l_sigma = 8.5, 1.0  # The favorite

    (nw_mu, nw_sigma), (nl_mu, nl_sigma) = update_rating(w_mu, w_sigma, l_mu, l_sigma)

    # Underdog should jump significantly
    assert nw_mu > w_mu + 1.0
    assert nl_mu < l_mu - 1.0
    print(f"Upset Win: Underdog {nw_mu:.2f} beats Favorite {nl_mu:.2f}")


def test_expected_win():
    """Testing an expected win: A 'Peak' beats a 'Hill'."""
    w_mu, w_sigma = 8.5, 0.5  # High confidence favorite
    l_mu, l_sigma = 2.0, 0.5  # High confidence underdog

    (nw_mu, nw_sigma), (nl_mu, nl_sigma) = update_rating(w_mu, w_sigma, l_mu, l_sigma)

    # Should move very little since the result was expected
    assert abs(nw_mu - w_mu) < 0.2
    assert abs(nl_mu - l_mu) < 0.2
    print(
        f"Expected Win: Favorite {nw_mu:.2f} beats Underdog {nl_mu:.2f} (Little change)"
    )


def test_match_quality():
    """Testing the active selection logic."""
    # High quality: close scores, high uncertainty
    q1 = calculate_match_quality(5.5, 1.0, 5.6, 1.0)

    # Low quality: far apart scores
    q2 = calculate_match_quality(2.0, 1.0, 8.5, 1.0)

    # Low quality: certain vs uncertain
    q3 = calculate_match_quality(5.5, 0.1, 5.5, 1.5)

    assert q1 > q2
    assert q1 > q3
    print(
        f"Match Quality - Rival: {q1:.3f}, Mismatch: {q2:.3f}, Uncertainty Diff: {q3:.3f}"
    )


def test_clipping():
    """Ensuring scores stay within 0-10 range."""
    # Winner at 9.9
    w_mu, w_sigma = 9.9, 1.0
    l_mu, l_sigma = 5.0, 1.0

    (nw_mu, nw_sigma), (nl_mu, nl_sigma) = update_rating(w_mu, w_sigma, l_mu, l_sigma)

    assert nw_mu <= 10.0
    assert nl_mu >= 0.0


def test_bucket_distribution():
    """Testing the percentile-based bucket assignment."""
    # With 12 hikes:
    # Peak (25%) = 3
    # Hike (50%) = 6
    # Hill (25%) = 3
    total = 12

    # Check indices 0, 1, 2 (Peaks)
    assert assign_bucket_label(0, total) == "Peak"
    assert assign_bucket_label(2, total) == "Peak"

    # Check index 3 (Hike)
    assert assign_bucket_label(3, total) == "Another Hike"
    assert assign_bucket_label(8, total) == "Another Hike"

    # Check index 9 (Hill)
    assert assign_bucket_label(9, total) == "A Hill"
    assert assign_bucket_label(11, total) == "A Hill"

    print("Bucket Distribution for 12 items: 3 Peak, 6 Hike, 3 Hill -> PASSED")


def test_small_distribution():
    """Testing distribution with very few items."""
    # With 3 hikes, int(3*0.25) = 0. No peaks yet.
    assert assign_bucket_label(0, 3) == "Another Hike"

    # With 4 hikes, int(4*0.25) = 1. Top 1 is Peak.
    assert assign_bucket_label(0, 4) == "Peak"
    assert assign_bucket_label(1, 4) == "Another Hike"
    print("Small Distribution (3 vs 4 items) -> PASSED")
