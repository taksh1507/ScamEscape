"""
Unit tests for app/services/psychological_scorer.py

Covers the pure calculation methods on PsychologicalScorer. These feed
directly into the Round 2 (chat) result screen, so a silent regression
here would misgrade every player without raising an exception anywhere.
"""

import pytest
from app.services.psychological_scorer import PsychologicalScorer


@pytest.fixture
def scorer():
    return PsychologicalScorer()


class TestPanicIndicators:
    def test_no_indicators_returns_zero(self, scorer):
        assert scorer.calculate_panic_indicators({}) == 0.0

    def test_high_urgency_match_increases_panic(self, scorer):
        calm = scorer.calculate_panic_indicators({"message_urgency_match": 0})
        panicked = scorer.calculate_panic_indicators({"message_urgency_match": 1})
        assert panicked > calm

    def test_result_is_clamped_to_100(self, scorer):
        result = scorer.calculate_panic_indicators({
            "message_urgency_match": 1,
            "response_time_decrease": 1,
            "caps_messages_count": 100,
            "questions_per_message": 100,
            "link_clicks_after_pressure": 100,
        })
        assert 0.0 <= result <= 100.0


class TestTrustScore:
    def test_no_actions_or_claims_gives_zero_trust(self, scorer):
        assert scorer.calculate_trust_score([], []) == 0.0

    def test_trust_actions_increase_score(self, scorer):
        score = scorer.calculate_trust_score(["shared_otp"], [])
        assert score > 0

    def test_distrust_actions_decrease_score(self, scorer):
        # hung_up (-50) should pull a trust-heavy player back down
        trusting = scorer.calculate_trust_score(["clicked_link"], [])
        trusting_then_hung_up = scorer.calculate_trust_score(["clicked_link", "hung_up"], [])
        assert trusting_then_hung_up < trusting

    def test_score_is_clamped_to_0_100_range(self, scorer):
        low = scorer.calculate_trust_score(["hung_up", "reported_scam"], [])
        high = scorer.calculate_trust_score(
            ["shared_otp", "provided_info", "clicked_link", "confirmed_details"],
            ["verified_badge", "official_tone", "known_contact_impersonation"],
        )
        assert low == 0.0
        assert high == 100.0


class TestAwarenessScore:
    def test_no_warnings_returns_zero(self, scorer):
        assert scorer.calculate_awareness_score(0, 0, 0, 0) == 0.0

    def test_perfect_awareness_still_clamped_to_100(self, scorer):
        result = scorer.calculate_awareness_score(
            warnings_detected=10, warnings_missed=0,
            red_flags_caught=5, red_flags_ignored=0,
        )
        assert result == 100.0

    def test_partial_awareness_gives_partial_credit(self, scorer):
        # Previously this saturated to 100 due to a double-scaling bug
        # (awareness was multiplied by 100 twice). Now it should reflect
        # the actual detection/red-flag ratio.
        result = scorer.calculate_awareness_score(
            warnings_detected=1, warnings_missed=9,
            red_flags_caught=1, red_flags_ignored=9,
        )
        # detected_rate=0.1 -> 0.1*70=7; red_flag ratio=0.1 -> 0.1*30=3 -> 10.0
        assert result == pytest.approx(10.0)
        assert result < 100.0


class TestDecisionQuality:
    def test_no_decisions_returns_zero(self, scorer):
        assert scorer.calculate_decision_quality([], ["hang_up"]) == 0.0

    def test_good_early_confident_decision_scores_highly(self, scorer):
        result = scorer.calculate_decision_quality(
            decisions_made=[{"action": "hang_up", "timing": "early", "confidence": 1.0}],
            optimal_decisions=["hang_up"],
        )
        assert result == 100.0

    def test_bad_decision_reduces_quality(self, scorer):
        result = scorer.calculate_decision_quality(
            decisions_made=[{"action": "share_otp", "timing": "early", "confidence": 1.0}],
            optimal_decisions=["hang_up"],
        )
        assert result == 0.0  # clamped from a negative raw score

    def test_late_timing_scores_lower_than_early(self, scorer):
        early = scorer.calculate_decision_quality(
            decisions_made=[{"action": "hang_up", "timing": "early", "confidence": 1.0}],
            optimal_decisions=["hang_up"],
        )
        late = scorer.calculate_decision_quality(
            decisions_made=[{"action": "hang_up", "timing": "late", "confidence": 1.0}],
            optimal_decisions=["hang_up"],
        )
        assert late < early


class TestReactionTimeScore:
    def test_no_responses_returns_neutral_score(self, scorer):
        assert scorer.calculate_reaction_time_score([], []) == 50.0

    def test_ideal_range_scores_highest(self, scorer):
        ideal = scorer.calculate_reaction_time_score([30.0], [])
        too_fast = scorer.calculate_reaction_time_score([1.0], [])
        too_slow = scorer.calculate_reaction_time_score([200.0], [])
        assert ideal > too_fast
        assert ideal > too_slow

    def test_very_fast_response_is_penalized(self, scorer):
        result = scorer.calculate_reaction_time_score([0.0], [])
        assert result < 90
