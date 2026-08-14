"""
Unit tests for app/services/scoring.py

These cover the pure, synchronous scoring functions (evaluate_action,
score_round) since they drive every player's final grade and are the
highest-risk logic to break silently.
"""

import pytest
from app.services.scoring import evaluate_action, score_round


class TestEvaluateAction:
    def test_correct_action_awards_base_points(self):
        result = evaluate_action(
            action="hang_up",
            correct_action="hang_up",
            submission_time=100.0,
            round_start_time=100.0,  # instant response -> max speed bonus
            round_duration=30,
        )
        assert result["is_correct"] is True
        assert result["points_awarded"] == 10 + result["speed_bonus"]
        assert result["grade"]["letter"] == "A+"

    def test_incorrect_action_awards_zero_base_points(self):
        result = evaluate_action(
            action="share",
            correct_action="hang_up",
            submission_time=105.0,
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["is_correct"] is False
        assert result["points_awarded"] == 0
        assert result["grade"]["letter"] == "F"

    def test_case_insensitive_match_is_treated_as_correct(self):
        # evaluate_action explicitly lowercases before comparing
        result = evaluate_action(
            action="Hang_Up",
            correct_action="hang_up",
            submission_time=100.0,
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["is_correct"] is True
        assert result["grade"]["letter"] == "A+"

    def test_speed_bonus_decreases_as_response_time_increases(self):
        fast = evaluate_action(
            action="hang_up", correct_action="hang_up",
            submission_time=101.0, round_start_time=100.0, round_duration=30,
        )
        slow = evaluate_action(
            action="hang_up", correct_action="hang_up",
            submission_time=125.0, round_start_time=100.0, round_duration=30,
        )
        assert fast["speed_bonus"] >= slow["speed_bonus"]

    def test_no_speed_bonus_when_incorrect(self):
        result = evaluate_action(
            action="share",
            correct_action="hang_up",
            submission_time=100.5,
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["speed_bonus"] == 0

    def test_no_speed_bonus_when_response_exceeds_round_duration(self):
        result = evaluate_action(
            action="hang_up",
            correct_action="hang_up",
            submission_time=200.0,  # way past the round
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["speed_bonus"] == 0

    def test_unknown_action_defaults_to_zero_base_points(self):
        result = evaluate_action(
            action="totally_unknown_action",
            correct_action="hang_up",
            submission_time=101.0,
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["points_awarded"] == 0
        assert result["grade"]["letter"] == "F"

    @pytest.mark.parametrize("action,expected_letter", [
        ("hang_up", "A+"),      # 10 pts
        ("call_back", "A"),     # 8 pts
        ("ask_questions", "B"), # 6 pts
        ("share", "F"),         # 0 pts
    ])
    def test_grade_thresholds(self, action, expected_letter):
        # Use a different correct_action so `action` scores its own base points
        # rather than being forced to 10 via the case-insensitive-match rule.
        result = evaluate_action(
            action=action,
            correct_action="__none__",
            submission_time=130.0,  # response right at round end -> no speed bonus
            round_start_time=100.0,
            round_duration=30,
        )
        assert result["grade"]["letter"] == expected_letter


class TestScoreRound:
    def test_scores_multiple_players_independently(self):
        round_actions = {
            "p1": "hang_up",
            "p2": "share",
        }
        round_action_times = {
            "p1": 105.0,
            "p2": 110.0,
        }
        results = score_round(
            round_actions=round_actions,
            round_action_times=round_action_times,
            correct_action="hang_up",
            round_start_time=100.0,
            round_duration=30,
        )
        assert set(results.keys()) == {"p1", "p2"}
        assert results["p1"]["is_correct"] is True
        assert results["p2"]["is_correct"] is False

    def test_missing_submission_time_falls_back_to_round_end(self):
        # A player who never submitted an action should still be scored,
        # as if they responded right at the buzzer.
        results = score_round(
            round_actions={"p1": "hang_up"},
            round_action_times={},  # no timestamp recorded
            correct_action="hang_up",
            round_start_time=100.0,
            round_duration=30,
        )
        assert results["p1"]["response_time"] == 30
        assert results["p1"]["speed_bonus"] == 0

    def test_empty_round_returns_empty_results(self):
        results = score_round(
            round_actions={},
            round_action_times={},
            correct_action="hang_up",
            round_start_time=100.0,
            round_duration=30,
        )
        assert results == {}
