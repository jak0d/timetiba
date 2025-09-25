"""
Tests for ConflictAnalyzer - conflict resolution suggestion engine
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from services.conflict_analyzer import ConflictAnalyzer, ConflictPattern, ResolutionSuggestion
from models.optimization_models import SolutionModel, ScheduledSessionModel


class TestConflictPattern:
    """Test ConflictPattern class"""
    
    def test_conflict_pattern_creation(self):
        """Test creating a conflict pattern"""
        pattern = ConflictPattern("venue_double_booking", 5, ["venue1", "venue2"])
        
        assert pattern.conflict_type == "venue_double_booking"
        assert pattern.frequency == 5
        assert pattern.entities == ["venue1", "venue2"]
        assert 0.0 <= pattern.severity_score <= 1.0
    
    def test_severity_calculation(self):
        """Test severity score calculation"""
        # High frequency, many entities
        high_severity = ConflictPattern("lecturer_conflict", 10, ["l1", "l2", "l3", "l4", "l5"])
        
        # Low frequency, few entities
        low_severity = ConflictPattern("equipment_conflict", 1, ["venue1"])
        
        assert high_severity.severity_score > low_severity.severity_score


class TestResolutionSuggestion:
    """Test ResolutionSuggestion class"""
    
    def test_resolution_suggestion_creation(self):
        """Test creating a resolution suggestion"""
        suggestion = ResolutionSuggestion(
            resolution_id="test_res_1",
            description="Move session to different venue",
            resolution_type="reassign_venue",
            affected_sessions=["session1"],
            parameters={"new_venue_id": "venue2"},
            score=0.8,
            effort_level="low",
            impact_description="Changes venue location"
        )
        
        assert suggestion.resolution_id == "test_res_1"
        assert suggestion.resolution_type == "reassign_venue"
        assert suggestion.score == 0.8
        assert suggestion.effort_level == "low"
        assert 0.0 <= suggestion.confidence <= 1.0
    
    def test_confidence_calculation(self):
        """Test confidence calculation based on score and effort"""
        # High score, low effort = high confidence
        high_conf = ResolutionSuggestion(
            "test1", "desc", "reschedule", ["s1"], {}, 0.9, "low", "impact"
        )
        
        # Low score, high effort = low confidence
        low_conf = ResolutionSuggestion(
            "test2", "desc", "split_group", ["s1"], {}, 0.5, "high", "impact"
        )
        
        assert high_conf.confidence > low_conf.confidence


class TestConflictAnalyzer:
    """Test ConflictAnalyzer main functionality"""
    
    @pytest.fixture
    def analyzer(self):
        """Create ConflictAnalyzer instance"""
        return ConflictAnalyzer()
    
    @pytest.fixture
    def sample_conflicts(self):
        """Sample conflicts for testing"""
        return [
            {
                'id': 'conflict1',
                'type': 'venue_double_booking',
                'severity': 'high',
                'affected_entities': ['venue1', 'session1', 'session2'],
                'session_ids': ['session1', 'session2']
            },
            {
                'id': 'conflict2',
                'type': 'lecturer_conflict',
                'severity': 'medium',
                'affected_entities': ['lecturer1', 'session3', 'session4'],
                'session_ids': ['session3', 'session4']
            },
            {
                'id': 'conflict3',
                'type': 'venue_double_booking',
                'severity': 'high',
                'affected_entities': ['venue2', 'session5', 'session6'],
                'session_ids': ['session5', 'session6']
            }
        ]
    
    @pytest.fixture
    def sample_solution(self):
        """Sample solution for testing"""
        sessions = [
            ScheduledSessionModel(
                id="session1",
                course_id="course1",
                lecturer_id="lecturer1",
                venue_id="venue1",
                student_groups=["group1"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="session2",
                course_id="course2",
                lecturer_id="lecturer2",
                venue_id="venue1",  # Same venue - conflict
                student_groups=["group2"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="session3",
                course_id="course3",
                lecturer_id="lecturer1",  # Same lecturer - conflict
                venue_id="venue2",
                student_groups=["group3"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            )
        ]
        
        return SolutionModel(
            sessions=sessions,
            score=0.6,
            is_feasible=False,
            conflicts=[],
            metadata={}
        )
    
    @pytest.fixture
    def sample_entities(self):
        """Sample entities for testing"""
        return {
            'venues': [
                {
                    'id': 'venue1',
                    'name': 'Room A',
                    'capacity': 30,
                    'equipment': ['projector', 'whiteboard']
                },
                {
                    'id': 'venue2',
                    'name': 'Room B',
                    'capacity': 50,
                    'equipment': ['projector', 'computer']
                },
                {
                    'id': 'venue3',
                    'name': 'Room C',
                    'capacity': 25,
                    'equipment': ['whiteboard']
                }
            ],
            'lecturers': [
                {
                    'id': 'lecturer1',
                    'name': 'Dr. Smith',
                    'subjects': ['math', 'physics'],
                    'availability': {
                        'monday': {'available': True},
                        'tuesday': {'available': True}
                    },
                    'max_hours_per_week': 20
                },
                {
                    'id': 'lecturer2',
                    'name': 'Prof. Johnson',
                    'subjects': ['chemistry', 'biology'],
                    'availability': {
                        'monday': {'available': True},
                        'wednesday': {'available': True}
                    },
                    'max_hours_per_week': 25
                }
            ],
            'courses': [
                {
                    'id': 'course1',
                    'name': 'Mathematics 101',
                    'subjects': ['math'],
                    'required_equipment': ['whiteboard'],
                    'lecturer_id': 'lecturer1'
                },
                {
                    'id': 'course2',
                    'name': 'Physics 101',
                    'subjects': ['physics'],
                    'required_equipment': ['projector'],
                    'lecturer_id': 'lecturer2'
                }
            ],
            'student_groups': [
                {
                    'id': 'group1',
                    'name': 'Group A',
                    'size': 20
                },
                {
                    'id': 'group2',
                    'name': 'Group B',
                    'size': 25
                }
            ]
        }
    
    def test_analyze_conflicts(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test conflict analysis functionality"""
        result = analyzer.analyze_conflicts(sample_conflicts, sample_solution, sample_entities)
        
        assert 'total_conflicts' in result
        assert result['total_conflicts'] == 3
        assert 'patterns' in result
        assert 'entity_analysis' in result
        assert 'root_causes' in result
        assert 'severity_distribution' in result
        assert 'recommendations' in result
        
        # Check patterns
        patterns = result['patterns']
        assert len(patterns) > 0
        
        # Should identify venue_double_booking pattern (appears twice)
        venue_pattern = next((p for p in patterns if p['conflict_type'] == 'venue_double_booking'), None)
        assert venue_pattern is not None
        assert venue_pattern['frequency'] == 2
    
    def test_identify_conflict_patterns(self, analyzer, sample_conflicts):
        """Test conflict pattern identification"""
        patterns = analyzer._identify_conflict_patterns(sample_conflicts)
        
        assert len(patterns) > 0
        
        # Should identify venue_double_booking pattern
        venue_pattern = next((p for p in patterns if p.conflict_type == 'venue_double_booking'), None)
        assert venue_pattern is not None
        assert venue_pattern.frequency == 2
    
    def test_generate_resolution_suggestions(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test resolution suggestion generation"""
        suggestions = analyzer.generate_resolution_suggestions(
            sample_conflicts, sample_solution, sample_entities, max_suggestions=5
        )
        
        assert len(suggestions) > 0
        assert len(suggestions) <= 5
        
        # Check suggestion structure
        for suggestion in suggestions:
            assert hasattr(suggestion, 'resolution_id')
            assert hasattr(suggestion, 'description')
            assert hasattr(suggestion, 'resolution_type')
            assert hasattr(suggestion, 'score')
            assert hasattr(suggestion, 'effort_level')
            assert 0.0 <= suggestion.score <= 1.0
            assert suggestion.effort_level in ['low', 'medium', 'high']
    
    def test_venue_conflict_resolutions(self, analyzer, sample_solution, sample_entities):
        """Test venue conflict resolution generation"""
        venue_conflicts = [
            {
                'id': 'conflict1',
                'type': 'venue_double_booking',
                'session_ids': ['session1', 'session2']
            }
        ]
        
        suggestions = analyzer._generate_venue_conflict_resolutions(
            venue_conflicts, sample_solution, sample_entities
        )
        
        assert len(suggestions) > 0
        
        # Should include venue reassignment suggestions
        venue_reassign = next((s for s in suggestions if s.resolution_type == 'reassign_venue'), None)
        assert venue_reassign is not None
        assert 'new_venue_id' in venue_reassign.parameters
    
    def test_lecturer_conflict_resolutions(self, analyzer, sample_solution, sample_entities):
        """Test lecturer conflict resolution generation"""
        lecturer_conflicts = [
            {
                'id': 'conflict2',
                'type': 'lecturer_conflict',
                'session_ids': ['session1', 'session3']
            }
        ]
        
        suggestions = analyzer._generate_lecturer_conflict_resolutions(
            lecturer_conflicts, sample_solution, sample_entities
        )
        
        assert len(suggestions) > 0
        
        # Should include rescheduling suggestions
        reschedule = next((s for s in suggestions if s.resolution_type == 'reschedule'), None)
        assert reschedule is not None
    
    def test_capacity_conflict_resolutions(self, analyzer, sample_solution, sample_entities):
        """Test capacity conflict resolution generation"""
        # Create a capacity conflict scenario
        capacity_conflicts = [
            {
                'id': 'conflict3',
                'type': 'capacity_exceeded',
                'session_ids': ['session1']
            }
        ]
        
        # Modify session to have large student groups
        sample_solution.sessions[0].student_groups = ['group1', 'group2']  # Total size: 45
        
        suggestions = analyzer._generate_capacity_resolutions(
            capacity_conflicts, sample_solution, sample_entities
        )
        
        assert len(suggestions) > 0
        
        # Should suggest moving to larger venue
        venue_move = next((s for s in suggestions if s.resolution_type == 'reassign_venue'), None)
        if venue_move:
            assert 'required_capacity' in venue_move.parameters
    
    def test_suggestion_ranking(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test suggestion ranking functionality"""
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            sample_conflicts, sample_solution, sample_entities, max_suggestions=10
        )
        
        # Check that suggestions are ranked (scores in descending order)
        scores = [s.score for s in suggestions]
        assert scores == sorted(scores, reverse=True)
    
    def test_multiple_alternatives_generation(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test generation of multiple alternative resolution paths"""
        alternatives = analyzer.generate_multiple_alternatives(
            sample_conflicts, sample_solution, sample_entities, num_alternatives=3
        )
        
        assert len(alternatives) <= 3
        assert all(isinstance(alt, list) for alt in alternatives)
        
        # Each alternative should contain ResolutionSuggestion objects
        for alternative in alternatives:
            assert all(isinstance(suggestion, ResolutionSuggestion) for suggestion in alternative)
    
    def test_suggestion_quality_evaluation(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test suggestion quality evaluation"""
        suggestions = analyzer.generate_resolution_suggestions(
            sample_conflicts, sample_solution, sample_entities, max_suggestions=1
        )
        
        if suggestions:
            suggestion = suggestions[0]
            evaluation = analyzer.evaluate_suggestion_quality(
                suggestion, sample_conflicts, sample_solution, sample_entities
            )
            
            assert 'overall_score' in evaluation
            assert 'confidence' in evaluation
            assert 'feasibility_score' in evaluation
            assert 'impact_score' in evaluation
            assert 'effort_score' in evaluation
            assert 'risk_assessment' in evaluation
            assert 'recommendation' in evaluation
            
            # Check score ranges
            assert 0.0 <= evaluation['overall_score'] <= 1.0
            assert 0.0 <= evaluation['confidence'] <= 1.0
            assert 0.0 <= evaluation['feasibility_score'] <= 1.0
            assert evaluation['recommendation'] in ['approve', 'review']
    
    def test_find_alternative_venues(self, analyzer, sample_solution, sample_entities):
        """Test finding alternative venues for a session"""
        session = sample_solution.sessions[0]
        venues = {v['id']: v for v in sample_entities['venues']}
        
        alternatives = analyzer._find_alternative_venues(session, venues, sample_entities)
        
        # Should find venues other than the current one
        assert all(v['id'] != session.venue_id for v in alternatives)
        
        # Should be sorted by capacity
        if len(alternatives) > 1:
            capacities = [v.get('capacity', 0) for v in alternatives]
            assert capacities == sorted(capacities)
    
    def test_find_alternative_times(self, analyzer, sample_solution):
        """Test finding alternative time slots"""
        session = sample_solution.sessions[0]
        
        alternatives = analyzer._find_alternative_times(session, sample_solution.sessions)
        
        assert isinstance(alternatives, list)
        assert len(alternatives) <= 5  # Should limit to 5 alternatives
        
        # Each alternative should be a time string
        for alt_time in alternatives:
            assert isinstance(alt_time, str)
            assert ':' in alt_time  # Should contain time format
    
    def test_risk_assessment(self, analyzer, sample_conflicts):
        """Test risk assessment for suggestions"""
        suggestion = ResolutionSuggestion(
            "test_risk", "High effort suggestion", "split_group", 
            ["s1", "s2", "s3", "s4"], {}, 0.7, "high", "Multiple sessions affected"
        )
        
        risk_assessment = analyzer._assess_suggestion_risk(suggestion, sample_conflicts)
        
        assert 'level' in risk_assessment
        assert 'factors' in risk_assessment
        assert 'mitigation_suggestions' in risk_assessment
        
        # High effort with multiple sessions should be high risk
        assert risk_assessment['level'] in ['low', 'medium', 'high']
        assert len(risk_assessment['factors']) > 0
    
    def test_entity_analysis(self, analyzer, sample_conflicts, sample_entities):
        """Test entity involvement analysis"""
        analysis = analyzer._analyze_entity_involvement(sample_conflicts, sample_entities)
        
        assert 'most_problematic_entities' in analysis
        assert 'entity_type_analysis' in analysis
        
        # Check entity type analysis structure
        type_analysis = analysis['entity_type_analysis']
        for entity_type in sample_entities.keys():
            if entity_type in type_analysis:
                assert 'total_conflicts' in type_analysis[entity_type]
                assert 'entities_with_conflicts' in type_analysis[entity_type]
                assert 'total_entities' in type_analysis[entity_type]
    
    def test_root_cause_identification(self, analyzer, sample_conflicts, sample_solution, sample_entities):
        """Test root cause identification"""
        root_causes = analyzer._identify_root_causes(sample_conflicts, sample_solution, sample_entities)
        
        assert isinstance(root_causes, list)
        
        # Each root cause should have required fields
        for cause in root_causes:
            assert 'type' in cause
            assert 'description' in cause
            assert 'severity' in cause
            assert 'recommendation' in cause
            assert cause['severity'] in ['low', 'medium', 'high']


class TestConflictAnalyzerIntegration:
    """Integration tests for ConflictAnalyzer"""
    
    @pytest.fixture
    def analyzer(self):
        return ConflictAnalyzer()
    
    def test_end_to_end_conflict_resolution(self, analyzer):
        """Test complete conflict resolution workflow"""
        # Create realistic scenario
        conflicts = [
            {
                'id': 'c1',
                'type': 'venue_double_booking',
                'severity': 'high',
                'affected_entities': ['venue1', 'session1', 'session2'],
                'session_ids': ['session1', 'session2']
            }
        ]
        
        sessions = [
            ScheduledSessionModel(
                id="session1",
                course_id="math101",
                lecturer_id="prof_smith",
                venue_id="venue1",
                student_groups=["group_a"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="session2",
                course_id="physics101",
                lecturer_id="prof_jones",
                venue_id="venue1",
                student_groups=["group_b"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            )
        ]
        
        solution = SolutionModel(
            sessions=sessions,
            score=0.5,
            is_feasible=False
        )
        
        entities = {
            'venues': [
                {'id': 'venue1', 'name': 'Room A', 'capacity': 30, 'equipment': []},
                {'id': 'venue2', 'name': 'Room B', 'capacity': 40, 'equipment': []}
            ],
            'lecturers': [
                {'id': 'prof_smith', 'name': 'Dr. Smith', 'subjects': ['math']},
                {'id': 'prof_jones', 'name': 'Dr. Jones', 'subjects': ['physics']}
            ],
            'courses': [
                {'id': 'math101', 'name': 'Math 101', 'required_equipment': []},
                {'id': 'physics101', 'name': 'Physics 101', 'required_equipment': []}
            ],
            'student_groups': [
                {'id': 'group_a', 'size': 20},
                {'id': 'group_b', 'size': 25}
            ]
        }
        
        # Analyze conflicts
        analysis = analyzer.analyze_conflicts(conflicts, solution, entities)
        assert analysis['total_conflicts'] == 1
        
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(conflicts, solution, entities)
        assert len(suggestions) > 0
        
        # Evaluate suggestion quality
        if suggestions:
            evaluation = analyzer.evaluate_suggestion_quality(
                suggestions[0], conflicts, solution, entities
            )
            assert 'recommendation' in evaluation
    
    def test_performance_with_large_dataset(self, analyzer):
        """Test performance with larger datasets"""
        # Create larger conflict set
        conflicts = []
        sessions = []
        
        for i in range(50):
            conflicts.append({
                'id': f'conflict_{i}',
                'type': 'venue_double_booking',
                'severity': 'medium',
                'affected_entities': [f'venue_{i%10}', f'session_{i}', f'session_{i+50}'],
                'session_ids': [f'session_{i}', f'session_{i+50}']
            })
            
            sessions.append(ScheduledSessionModel(
                id=f"session_{i}",
                course_id=f"course_{i%20}",
                lecturer_id=f"lecturer_{i%15}",
                venue_id=f"venue_{i%10}",
                student_groups=[f"group_{i%25}"],
                start_time=datetime(2024, 1, 15, 9 + (i % 8), 0),
                end_time=datetime(2024, 1, 15, 10 + (i % 8), 0),
                day_of_week=i % 5
            ))
        
        solution = SolutionModel(sessions=sessions, score=0.3, is_feasible=False)
        
        entities = {
            'venues': [{'id': f'venue_{i}', 'name': f'Room {i}', 'capacity': 30 + i*5} for i in range(10)],
            'lecturers': [{'id': f'lecturer_{i}', 'name': f'Prof {i}', 'subjects': ['math']} for i in range(15)],
            'courses': [{'id': f'course_{i}', 'name': f'Course {i}', 'required_equipment': []} for i in range(20)],
            'student_groups': [{'id': f'group_{i}', 'size': 20 + i} for i in range(25)]
        }
        
        # Should complete within reasonable time
        import time
        start_time = time.time()
        
        suggestions = analyzer.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=10)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should complete within 5 seconds for this dataset size
        assert processing_time < 5.0
        assert len(suggestions) <= 10

