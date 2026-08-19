import pytest
from app.assessments.tat.engines.clinical.context_adjustment_engine import ContextAdjustmentEngine

@pytest.fixture
def engine():
    return ContextAdjustmentEngine()

def test_age_group_classification(engine):
    assert engine._get_age_group(10) == "child"
    assert engine._get_age_group(15) == "adolescent"
    assert engine._get_age_group(22) == "young_adult"
    assert engine._get_age_group(35) == "adult"
    assert engine._get_age_group(55) == "middle_aged"
    assert engine._get_age_group(70) == "senior"
    assert engine._get_age_group(None) == "adult"

def test_age_congruence_score(engine):
    # Perfect match for child (dependency, play)
    score = engine.compute_age_congruence_score(10, ["play", "dependency"])
    assert score == 85.0 or score == 100.0  # 2 matches = 85.0
    
    # No match
    score = engine.compute_age_congruence_score(10, ["taxes", "mortgage"])
    assert score == 30.0

    # 1 match for adolescent
    score = engine.compute_age_congruence_score(15, ["identity", "taxes"])
    assert score == 60.0

def test_stress_context_score(engine):
    # High stress scenario
    score = engine.compute_stress_context_score(
        living_condition="homeless",
        family_structure="no family",
        environment_type="highly stressful"
    )
    # homeless (+35), no family (+35), highly stressful (+30) = 100
    assert score == 100.0

    # Low stress scenario
    score = engine.compute_stress_context_score(
        living_condition="with parents",
        family_structure="nuclear",
        environment_type="highly supportive"
    )
    # with parents (+5), nuclear (+5), highly supportive (+0) = 10
    assert score == 10.0

def test_environmental_pressure_score(engine):
    # High pressure
    score = engine.compute_environmental_pressure_score(
        environment_type="academically pressured",
        occupation="student",
        socioeconomic_status="low"
    )
    # academically pressured (+30), student (+20), low (+30) = 80
    assert score == 80.0

def test_pcs_computation(engine):
    # Max everything out
    pcs = engine.compute_pcs(100.0, 100.0, 100.0, 100.0, 100.0)
    assert pcs == 100.0

    # Minimum everything out
    pcs = engine.compute_pcs(0.0, 0.0, 0.0, 0.0, 0.0)
    assert pcs == 0.0

def test_apply_context_adjustment_layer(engine):
    # FinalScore = (BasePsychologicalScore × 0.80) + (PCS × 0.20)
    # 50 * 0.8 + 100 * 0.2 = 40 + 20 = 60
    final_score = engine.apply_context_adjustment_layer(base_score=50.0, pcs=100.0)
    assert final_score == 60.0

    # 100 * 0.8 + 0 * 0.2 = 80
    final_score = engine.apply_context_adjustment_layer(base_score=100.0, pcs=0.0)
    assert final_score == 80.0

def test_process_patient_context(engine):
    patient_data = {
        "age": 16,
        "living_condition": "foster care",
        "family_structure": "foster",
        "environment_type": "conflict",
        "occupation": "student",
        "socioeconomic_status": "low"
    }
    
    result = engine.process_patient_context(patient_data, observed_themes=["rebellion", "school"])
    
    assert "psychological_context_score" in result
    assert result["psychological_context_score"] >= 0.0
    assert result["psychological_context_score"] <= 100.0
    assert result["age_congruence_score"] >= 0.0
