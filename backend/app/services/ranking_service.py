import math
from typing import Tuple
from app.core.config import settings

# Scaling factor for match quality
QUALITY_NORMALIZER = math.sqrt(2 * settings.RANKING_BETA**2)


def calculate_v_w(difference: float, draw_margin: float):
    """Additive and Multiplicative correction functions for TrueSkill update."""
    # This is a simplified version for 1v1 without ties
    # In a 1v1 win/loss, the margin is essentially 0
    t = difference / settings.RANKING_BETA
    # Standard normal PDF and CDF
    pdf = (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * t**2)
    cdf = 0.5 * (1.0 + math.erf(t / math.sqrt(2.0)))

    if cdf == 0:
        v = -t
        w = 0.0
    else:
        v = pdf / cdf
        w = v * (v + t)
    return v, w


def update_rating(
    winner_mu: float, winner_sigma: float, loser_mu: float, loser_sigma: float
) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    """
    Updates the ratings for a winner and a loser using TrueSkill 1v1 formulas.
    Returns: ((new_winner_mu, new_winner_sigma), (new_loser_mu, new_loser_sigma))
    """
    # 1. Calculate the variance sum
    c_squared = winner_sigma**2 + loser_sigma**2 + 2 * (settings.RANKING_BETA**2)
    c = math.sqrt(c_squared)

    # 2. Difference between means
    mu_diff = winner_mu - loser_mu

    # 3. Calculate corrections
    v, w = calculate_v_w(mu_diff / c, 0.0)

    # 4. Update Means
    new_winner_mu = winner_mu + (winner_sigma**2 / c) * v
    new_loser_mu = loser_mu - (loser_sigma**2 / c) * v

    # 5. Update Sigmas (Uncertainty)
    # Apply TAU to prevent sigma from shrinking to absolute zero
    new_winner_sigma = math.sqrt(
        winner_sigma**2 * (1 - (winner_sigma**2 / c_squared) * w)
        + settings.RANKING_TAU**2
    )
    new_loser_sigma = math.sqrt(
        loser_sigma**2 * (1 - (loser_sigma**2 / c_squared) * w)
        + settings.RANKING_TAU**2
    )

    # Clip means to the 0.0 - 10.0 range (with a small buffer)
    new_winner_mu = max(0.0, min(10.0, new_winner_mu))
    new_loser_mu = max(0.0, min(10.0, new_loser_mu))

    return (new_winner_mu, new_winner_sigma), (new_loser_mu, new_loser_sigma)


def calculate_match_quality(
    mu1: float, sigma1: float, mu2: float, sigma2: float
) -> float:
    """
    Calculates the 'Match Quality' between two items.
    High quality means the outcome is uncertain (similar mu, similar sigma).
    This is used for 'Active Selection' of pairs.
    """
    # Formula: exp(- (mu1 - mu2)^2 / (2 * (sigma1^2 + sigma2^2 + 2*BETA^2)))
    # Plus a factor for the sigmas (we prefer items we are unsure about)
    var_sum = sigma1**2 + sigma2**2 + 2 * (settings.RANKING_BETA**2)
    mu_diff_sq = (mu1 - mu2) ** 2

    quality = math.exp(-mu_diff_sq / (2 * var_sum)) * (
        QUALITY_NORMALIZER / math.sqrt(var_sum)
    )
    return quality


def assign_bucket_label(index: int, total_ranked: int) -> str:
    """
    Assigns a bucket label based on percentile rank.
    25% Peak, 50% Another Hike, 25% A Hill.
    """
    if total_ranked == 0:
        return "A Hill"

    peak_threshold = int(total_ranked * settings.RANKING_PERCENTILE_PEAK)
    hike_threshold = int(
        total_ranked
        * (settings.RANKING_PERCENTILE_PEAK + settings.RANKING_PERCENTILE_HIKE)
    )

    if index < peak_threshold:
        return "Peak"
    elif index < hike_threshold:
        return "Another Hike"
    else:
        return "A Hill"
