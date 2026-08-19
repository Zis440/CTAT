"""
Validation Framework for TAT System
Prepares system for future clinical validation studies
"""

from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, field
import statistics
import json
from pathlib import Path
from datetime import datetime


@dataclass
class ValidationMetrics:
    """Metrics for validation studies"""
    
    # Test-retest reliability
    test_retest_correlation: Optional[float] = None
    test_retest_mean_difference: Optional[float] = None
    
    # Inter-rater reliability
    inter_rater_icc: Optional[float] = None  # Intraclass correlation coefficient
    inter_rater_agreement: Optional[float] = None  # Percentage agreement
    
    # Criterion validity
    correlation_with_gold_standard: Optional[float] = None
    
    # Internal consistency
    cronbach_alpha: Optional[float] = None
    
    # Bias metrics
    demographic_bias_detected: bool = False
    bias_details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'test_retest_correlation': self.test_retest_correlation,
            'test_retest_mean_difference': self.test_retest_mean_difference,
            'inter_rater_icc': self.inter_rater_icc,
            'inter_rater_agreement': self.inter_rater_agreement,
            'correlation_with_gold_standard': self.correlation_with_gold_standard,
            'cronbach_alpha': self.cronbach_alpha,
            'demographic_bias_detected': self.demographic_bias_detected,
            'bias_details': self.bias_details
        }


class ValidationFramework:
    """
    Framework for validating TAT scoring system
    Prepares for future clinical validation studies
    """
    
    def __init__(self, output_dir: str = "validation_data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.validation_data: List[Dict[str, Any]] = []
    
    def test_retest_reliability(
        self,
        story_text: str,
        scoring_function: callable,
        num_iterations: int = 10
    ) -> Tuple[float, float]:
        """
        Test test-retest reliability (same story, multiple scorings)
        
        Returns:
            (correlation, mean_difference)
        """
        
        scores_list = []
        
        for i in range(num_iterations):
            result = scoring_function(story_text)
            overall_score = result.get('overall_score', 0.0)
            scores_list.append(overall_score)
        
        # Calculate statistics
        if len(set(scores_list)) == 1:
            # Perfect reliability (all scores identical)
            correlation = 1.0
            mean_diff = 0.0
        else:
            # Some variation (should not happen in deterministic system)
            correlation = self._calculate_correlation(scores_list[::2], scores_list[1::2])
            mean_diff = statistics.mean([abs(scores_list[i] - scores_list[i+1]) 
                                         for i in range(0, len(scores_list)-1, 2)])
        
        return correlation, mean_diff
    
    def compare_to_clinician_scores(
        self,
        system_scores: List[float],
        clinician_scores: List[float]
    ) -> Dict[str, float]:
        """
        Compare system scores to clinician (gold standard) scores
        
        Args:
            system_scores: Scores from automated system
            clinician_scores: Scores from trained clinician
        
        Returns:
            Dictionary with correlation, mean difference, agreement
        """
        
        if len(system_scores) != len(clinician_scores):
            raise ValueError("Score lists must be same length")
        
        # Correlation
        correlation = self._calculate_correlation(system_scores, clinician_scores)
        
        # Mean absolute difference
        mean_diff = statistics.mean([abs(s - c) for s, c in zip(system_scores, clinician_scores)])
        
        # Agreement within threshold (±1 point on 10-point scale)
        threshold = 1.0
        agreement_count = sum(1 for s, c in zip(system_scores, clinician_scores) 
                             if abs(s - c) <= threshold)
        agreement_pct = (agreement_count / len(system_scores)) * 100
        
        return {
            'correlation': round(correlation, 3),
            'mean_absolute_difference': round(mean_diff, 2),
            'agreement_within_1pt': round(agreement_pct, 1)
        }
    
    def calculate_icc(
        self,
        rater1_scores: List[float],
        rater2_scores: List[float]
    ) -> float:
        """
        Calculate Intraclass Correlation Coefficient (ICC)
        Simplified ICC(2,1) for two raters
        """
        
        if len(rater1_scores) != len(rater2_scores):
            raise ValueError("Score lists must be same length")
        
        n = len(rater1_scores)
        
        # Calculate means
        grand_mean = statistics.mean(rater1_scores + rater2_scores)
        
        # Between-subjects variance
        subject_means = [(r1 + r2) / 2 for r1, r2 in zip(rater1_scores, rater2_scores)]
        bms = sum((m - grand_mean) ** 2 for m in subject_means) / (n - 1)
        
        # Within-subjects variance
        wms = sum((r1 - m) ** 2 + (r2 - m) ** 2 
                 for r1, r2, m in zip(rater1_scores, rater2_scores, subject_means)) / n
        
        # ICC calculation
        if bms + wms == 0:
            return 1.0  # Perfect agreement
        
        icc = (bms - wms) / (bms + wms)
        
        return max(0.0, min(1.0, icc))  # Clamp to [0, 1]
    
    def detect_demographic_bias(
        self,
        scores: List[float],
        demographics: List[Dict[str, Any]],
        demographic_key: str = "age"
    ) -> Dict[str, Any]:
        """
        Detect potential demographic bias in scoring
        
        Args:
            scores: List of scores
            demographics: List of demographic dicts (e.g., {'age': 25, 'gender': 'F'})
            demographic_key: Which demographic to analyze
        
        Returns:
            Bias analysis results
        """
        
        if len(scores) != len(demographics):
            raise ValueError("Scores and demographics must be same length")
        
        # Group scores by demographic category
        groups = {}
        for score, demo in zip(scores, demographics):
            category = demo.get(demographic_key, "unknown")
            if category not in groups:
                groups[category] = []
            groups[category].append(score)
        
        # Calculate statistics per group
        group_stats = {}
        for category, group_scores in groups.items():
            if len(group_scores) > 0:
                group_stats[category] = {
                    'mean': round(statistics.mean(group_scores), 2),
                    'std': round(statistics.stdev(group_scores), 2) if len(group_scores) > 1 else 0.0,
                    'n': len(group_scores)
                }
        
        # Detect significant differences (simple threshold check)
        means = [stats['mean'] for stats in group_stats.values()]
        if len(means) > 1:
            max_diff = max(means) - min(means)
            bias_detected = max_diff > 1.5  # >1.5 points difference on 10-point scale
        else:
            max_diff = 0.0
            bias_detected = False
        
        return {
            'demographic_key': demographic_key,
            'group_statistics': group_stats,
            'max_difference': round(max_diff, 2),
            'bias_detected': bias_detected,
            'interpretation': 'Significant bias detected' if bias_detected else 'No significant bias'
        }
    
    def export_for_statistical_analysis(
        self,
        data: List[Dict[str, Any]],
        filename: str = "validation_export.csv"
    ):
        """
        Export validation data for external statistical analysis (SPSS, R, etc.)
        """
        
        import csv
        
        filepath = self.output_dir / filename
        
        if not data:
            raise ValueError("No data to export")
        
        # Get all keys from first record
        fieldnames = list(data[0].keys())
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        return str(filepath)
    
    def generate_validation_report(
        self,
        metrics: ValidationMetrics,
        filename: str = "validation_report.json"
    ) -> str:
        """Generate comprehensive validation report"""
        
        filepath = self.output_dir / filename
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics.to_dict(),
            'interpretation': self._interpret_metrics(metrics)
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        
        return str(filepath)
    
    def _calculate_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate Pearson correlation coefficient"""
        
        if len(x) != len(y) or len(x) == 0:
            return 0.0
        
        n = len(x)
        mean_x = statistics.mean(x)
        mean_y = statistics.mean(y)
        
        numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        
        sum_sq_x = sum((xi - mean_x) ** 2 for xi in x)
        sum_sq_y = sum((yi - mean_y) ** 2 for yi in y)
        
        denominator = (sum_sq_x * sum_sq_y) ** 0.5
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator
    
    def _interpret_metrics(self, metrics: ValidationMetrics) -> Dict[str, str]:
        """Interpret validation metrics"""
        
        interpretation = {}
        
        # Test-retest
        if metrics.test_retest_correlation is not None:
            if metrics.test_retest_correlation >= 0.9:
                interpretation['test_retest'] = "Excellent reliability"
            elif metrics.test_retest_correlation >= 0.7:
                interpretation['test_retest'] = "Good reliability"
            else:
                interpretation['test_retest'] = "Poor reliability (needs improvement)"
        
        # Inter-rater
        if metrics.inter_rater_icc is not None:
            if metrics.inter_rater_icc >= 0.75:
                interpretation['inter_rater'] = "Excellent agreement"
            elif metrics.inter_rater_icc >= 0.6:
                interpretation['inter_rater'] = "Good agreement"
            else:
                interpretation['inter_rater'] = "Poor agreement (needs improvement)"
        
        # Criterion validity
        if metrics.correlation_with_gold_standard is not None:
            if metrics.correlation_with_gold_standard >= 0.7:
                interpretation['criterion_validity'] = "Strong validity"
            elif metrics.correlation_with_gold_standard >= 0.5:
                interpretation['criterion_validity'] = "Moderate validity"
            else:
                interpretation['criterion_validity'] = "Weak validity (needs improvement)"
        
        # Bias
        if metrics.demographic_bias_detected:
            interpretation['bias'] = "⚠️ Demographic bias detected - requires investigation"
        else:
            interpretation['bias'] = "No significant demographic bias detected"
        
        return interpretation


if __name__ == "__main__":
    # Test the validation framework
    framework = ValidationFramework("test_validation")
    
    # Simulate test-retest
    def mock_scoring(story):
        return {'overall_score': 6.5}  # Deterministic
    
    correlation, mean_diff = framework.test_retest_reliability(
        "A woman sits alone.",
        mock_scoring,
        num_iterations=5
    )
    
    print(f"Test-retest correlation: {correlation}")
    print(f"Mean difference: {mean_diff}")
    
    # Simulate clinician comparison
    system_scores = [6.5, 7.2, 5.8, 8.1, 6.0]
    clinician_scores = [6.0, 7.5, 5.5, 8.0, 6.5]
    
    comparison = framework.compare_to_clinician_scores(system_scores, clinician_scores)
    print(f"\nClinician comparison: {comparison}")
    
    # Simulate bias detection
    scores = [6.5, 7.2, 5.8, 8.1, 6.0, 5.5, 7.0]
    demographics = [
        {'age': '18-25'}, {'age': '18-25'}, {'age': '26-40'}, 
        {'age': '26-40'}, {'age': '41-60'}, {'age': '41-60'}, {'age': '60+'}
    ]
    
    bias_analysis = framework.detect_demographic_bias(scores, demographics, 'age')
    print(f"\nBias analysis: {bias_analysis}")
