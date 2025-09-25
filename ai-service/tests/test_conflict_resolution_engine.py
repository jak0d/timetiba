"""
Comprehensive tests for the Conflict Resolution Suggestion Engine
Tests the complete functionality of conflict analysis and resolution suggestion generation
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from services.conflict_analyzer import ConflictAnalyzer, ConflictPattern, ResolutionSuggestion
from models.optimization_models import SolutionModel, ScheduledSessionModel


class TestConflictResolutionEngine:
    """Test the complete conflict resolution engine functionality"""
    
    @pytest.fixture
    def engine(self):
        """Create ConflictAnalyzer instance"""
        return ConflictAnalyzer()
    
    @pytest.fixture
    def complex_scenario(self):
        """Create a complex scheduling scenario with multiple conflict types"""
        # Create sessions with various conflicts
        sessions = [
            # Venue double booking
            ScheduledSessionModel(
                id="session1",
                course_id="math101",
                lecturer_id="prof_smith",
                venue_id="room_a",
                student_groups=["group1"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="session2",
                course_id="physics101",
                lecturer_id="prof_jones",
                venue_id="room_a",  # Same venue - conflict
                student_groups=["group2"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            # Lecturer conflict
            ScheduledSessionModel(
                id="session3",
                course_id="chemistry101",
                lecturer_id="prof_smith",  # Same lecturer - conflict
                venue_id="room_b",
                student_groups=["group3"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            # Student group overlap
            ScheduledSessionModel(
                id="session4",
                course_id="biology101",
                lecturer_id="prof_brown",
                venue_id="room_c",
                student_groups=["group1"],  # Same group - conflict
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            ),
            # Capacity exceeded
            ScheduledSessionModel(
                id="session5",
                course_id="history101",
                lecturer_id="prof_davis",
                venue_id="room_d",  # Small room, large groups
                student_groups=["group4", "group5"],
                start_time=datetime(2024, 1, 15, 10, 0),
                end_time=datetime(2024, 1, 15, 11, 0),
                day_of_week=0
            )
        ]
        
        conflicts = [
            {
                'id': 'conflict1',
                'type': 'venue_double_booking',
                'severity': 'high',
                'affected_entities': ['room_a', 'session1', 'session2'],
                'session_ids': ['session1', 'session2']
            },
            {
                'id': 'conflict2',
                'type': 'lecturer_conflict',
                'severity': 'high',
                'affected_entities': ['prof_smith', 'session1', 'session3'],
                'session_ids': ['session1', 'session3']
            },
            {
                'id': 'conflict3',
                'type': 'student_group_overlap',
                'severity': 'medium',
                'affected_entities': ['group1', 'session1', 'session4'],
                'session_ids': ['session1', 'session4']
            },
            {
                'id': 'conflict4',
                'type': 'capacity_exceeded',
                'severity': 'high',
                'affected_entities': ['room_d', 'session5'],
                'session_ids': ['session5']
            },
            # Add more conflicts to create patterns
            {
                'id': 'conflict5',
                'type': 'venue_double_booking',
                'severity': 'high',
                'affected_entities': ['room_b', 'session6', 'session7'],
                'session_ids': ['session6', 'session7']
            },
            {
                'id': 'conflict6',
                'type': 'lecturer_conflict',
                'severity': 'medium',
                'affected_entities': ['prof_jones', 'session8', 'session9'],
                'session_ids': ['session8', 'session9']
            }
        ]
        
        solution = SolutionModel(
            sessions=sessions,
            score=0.3,
            is_feasible=False,
            conflicts=conflicts
        )
        
        entities = {
            'venues': [
                {'id': 'room_a', 'name': 'Room A', 'capacity': 30, 'equipment': ['projector']},
                {'id': 'room_b', 'name': 'Room B', 'capacity': 40, 'equipment': ['whiteboard']},
                {'id': 'room_c', 'name': 'Room C', 'capacity': 25, 'equipment': ['computer']},
                {'id': 'room_d', 'name': 'Room D', 'capacity': 20, 'equipment': []},
                {'id': 'room_e', 'name': 'Room E', 'capacity': 60, 'equipment': ['projector', 'computer']},
                {'id': 'room_f', 'name': 'Room F', 'capacity': 35, 'equipment': ['whiteboard']}
            ],
            'lecturers': [
                {
                    'id': 'prof_smith',
                    'name': 'Dr. Smith',
                    'subjects': ['math', 'chemistry'],
                    'availability': {
                        'monday': {'available': True},
                        'tuesday': {'available': True},
                        'wednesday': {'available': True}
                    },
                    'max_hours_per_week': 20
                },
                {
                    'id': 'prof_jones',
                    'name': 'Dr. Jones',
                    'subjects': ['physics'],
                    'availability': {
                        'monday': {'available': True},
                        'tuesday': {'available': True}
                    },
                    'max_hours_per_week': 25
                },
                {
                    'id': 'prof_brown',
                    'name': 'Dr. Brown',
                    'subjects': ['biology'],
                    'availability': {
                        'monday': {'available': True},
                        'wednesday': {'available': True}
                    },
                    'max_hours_per_week': 18
                },
                {
                    'id': 'prof_davis',
                    'name': 'Dr. Davis',
                    'subjects': ['history'],
                    'availability': {
                        'monday': {'available': True},
                        'thursday': {'available': True}
                    },
                    'max_hours_per_week': 22
                }
            ],
            'courses': [
                {'id': 'math101', 'name': 'Math 101', 'subjects': ['math'], 'required_equipment': [], 'lecturer_id': 'prof_smith'},
                {'id': 'physics101', 'name': 'Physics 101', 'subjects': ['physics'], 'required_equipment': ['projector'], 'lecturer_id': 'prof_jones'},
                {'id': 'chemistry101', 'name': 'Chemistry 101', 'subjects': ['chemistry'], 'required_equipment': [], 'lecturer_id': 'prof_smith'},
                {'id': 'biology101', 'name': 'Biology 101', 'subjects': ['biology'], 'required_equipment': ['computer'], 'lecturer_id': 'prof_brown'},
                {'id': 'history101', 'name': 'History 101', 'subjects': ['history'], 'required_equipment': [], 'lecturer_id': 'prof_davis'}
            ],
            'student_groups': [
                {'id': 'group1', 'name': 'Group 1', 'size': 25},
                {'id': 'group2', 'name': 'Group 2', 'size': 28},
                {'id': 'group3', 'name': 'Group 3', 'size': 22},
                {'id': 'group4', 'name': 'Group 4', 'size': 30},
                {'id': 'group5', 'name': 'Group 5', 'size': 15}
            ]
        }
        
        return {
            'conflicts': conflicts,
            'solution': solution,
            'entities': entities
        }
    
    def test_comprehensive_conflict_analysis(self, engine, complex_scenario):
        """Test comprehensive conflict analysis with multiple conflict types"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        analysis = engine.analyze_conflicts(conflicts, solution, entities)
        
        # Verify analysis completeness
        assert analysis['total_conflicts'] == 6
        assert len(analysis['patterns']) > 0
        assert 'entity_analysis' in analysis
        assert 'root_causes' in analysis
        assert 'severity_distribution' in analysis
        assert 'recommendations' in analysis
        
        # Check pattern identification
        patterns = analysis['patterns']
        pattern_types = [p['conflict_type'] for p in patterns]
        
        # Should now identify patterns since we have recurring conflict types
        assert len(patterns) > 0
        pattern_types = [p['conflict_type'] for p in patterns]
        
        # Should identify venue_double_booking pattern (appears twice)
        assert 'venue_double_booking' in pattern_types
        # Should identify lecturer_conflict pattern (appears twice)
        assert 'lecturer_conflict' in pattern_types
        
        # Check pattern properties
        for pattern in patterns:
            assert pattern['frequency'] >= 2  # Pattern threshold
            assert len(pattern['entities']) > 0
        
        # Check severity distribution
        severity_dist = analysis['severity_distribution']
        assert 'high' in severity_dist
        assert severity_dist['high'] >= 4  # We have 4 high-severity conflicts
        
        # Check recommendations
        recommendations = analysis['recommendations']
        assert len(recommendations) > 0
        assert all(isinstance(rec, str) for rec in recommendations)
    
    def test_multi_type_resolution_generation(self, engine, complex_scenario):
        """Test resolution generation for multiple conflict types simultaneously"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=10
        )
        
        # Should generate suggestions for different conflict types
        assert len(suggestions) > 0
        
        # Check variety of resolution types
        resolution_types = set(s.resolution_type for s in suggestions)
        assert len(resolution_types) > 1  # Should have multiple resolution strategies
        
        # Verify suggestion quality
        for suggestion in suggestions:
            assert 0.0 <= suggestion.score <= 1.0
            assert suggestion.effort_level in ['low', 'medium', 'high']
            assert len(suggestion.affected_sessions) > 0
            assert suggestion.description
            assert suggestion.resolution_id
    
    def test_alternative_path_generation(self, engine, complex_scenario):
        """Test generation of multiple alternative resolution paths"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        alternatives = engine.generate_multiple_alternatives(
            conflicts, solution, entities, num_alternatives=3
        )
        
        # Should generate multiple alternative paths
        assert len(alternatives) > 0
        assert len(alternatives) <= 3
        
        # Each alternative should be a list of suggestions
        for alternative in alternatives:
            assert isinstance(alternative, list)
            assert all(isinstance(s, ResolutionSuggestion) for s in alternative)
        
        # Alternatives should be different
        if len(alternatives) > 1:
            alt1_types = set(s.resolution_type for s in alternatives[0])
            alt2_types = set(s.resolution_type for s in alternatives[1])
            # Should have some difference in approach
            assert alt1_types != alt2_types or len(alternatives[0]) != len(alternatives[1])
    
    def test_suggestion_quality_evaluation_comprehensive(self, engine, complex_scenario):
        """Test comprehensive suggestion quality evaluation"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=5
        )
        
        assert len(suggestions) > 0
        
        for suggestion in suggestions:
            evaluation = engine.evaluate_suggestion_quality(
                suggestion, conflicts, solution, entities
            )
            
            # Check evaluation completeness
            required_fields = [
                'overall_score', 'confidence', 'feasibility_score',
                'impact_score', 'effort_score', 'risk_assessment', 'recommendation'
            ]
            for field in required_fields:
                assert field in evaluation
            
            # Check score ranges
            assert 0.0 <= evaluation['overall_score'] <= 1.0
            assert 0.0 <= evaluation['confidence'] <= 1.0
            assert 0.0 <= evaluation['feasibility_score'] <= 1.0
            assert 0.0 <= evaluation['impact_score'] <= 1.0
            assert 0.0 <= evaluation['effort_score'] <= 1.0
            
            # Check risk assessment structure
            risk = evaluation['risk_assessment']
            assert 'level' in risk
            assert 'factors' in risk
            assert 'mitigation_suggestions' in risk
            assert risk['level'] in ['low', 'medium', 'high']
            
            # Check recommendation
            assert evaluation['recommendation'] in ['approve', 'review']
    
    def test_venue_conflict_resolution_strategies(self, engine, complex_scenario):
        """Test specific venue conflict resolution strategies"""
        venue_conflicts = [c for c in complex_scenario['conflicts'] if c['type'] == 'venue_double_booking']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine._generate_venue_conflict_resolutions(
            venue_conflicts, solution, entities
        )
        
        assert len(suggestions) > 0
        
        # Should include venue reassignment suggestions
        venue_reassign = [s for s in suggestions if s.resolution_type == 'reassign_venue']
        assert len(venue_reassign) > 0
        
        # Should include rescheduling suggestions
        reschedule = [s for s in suggestions if s.resolution_type == 'reschedule']
        assert len(reschedule) > 0
        
        # Check parameter completeness
        for suggestion in venue_reassign:
            assert 'new_venue_id' in suggestion.parameters
            assert suggestion.parameters['new_venue_id'] in [v['id'] for v in entities['venues']]
    
    def test_capacity_conflict_resolution_strategies(self, engine, complex_scenario):
        """Test capacity conflict resolution strategies"""
        capacity_conflicts = [c for c in complex_scenario['conflicts'] if c['type'] == 'capacity_exceeded']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine._generate_capacity_resolutions(
            capacity_conflicts, solution, entities
        )
        
        assert len(suggestions) > 0
        
        # Should suggest moving to larger venue
        venue_moves = [s for s in suggestions if s.resolution_type == 'reassign_venue']
        if venue_moves:
            for suggestion in venue_moves:
                new_venue_id = suggestion.parameters['new_venue_id']
                new_venue = next(v for v in entities['venues'] if v['id'] == new_venue_id)
                required_capacity = suggestion.parameters.get('required_capacity', 0)
                assert new_venue['capacity'] >= required_capacity
        
        # Should suggest splitting groups if needed
        split_suggestions = [s for s in suggestions if s.resolution_type == 'split_group']
        if split_suggestions:
            for suggestion in split_suggestions:
                assert 'sessions_needed' in suggestion.parameters
                assert suggestion.parameters['sessions_needed'] > 1
    
    def test_lecturer_conflict_resolution_strategies(self, engine, complex_scenario):
        """Test lecturer conflict resolution strategies"""
        lecturer_conflicts = [c for c in complex_scenario['conflicts'] if c['type'] == 'lecturer_conflict']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine._generate_lecturer_conflict_resolutions(
            lecturer_conflicts, solution, entities
        )
        
        assert len(suggestions) > 0
        
        # Should include rescheduling suggestions
        reschedule = [s for s in suggestions if s.resolution_type == 'reschedule']
        assert len(reschedule) > 0
        
        # Should include lecturer reassignment if possible
        reassign = [s for s in suggestions if s.resolution_type == 'reassign_lecturer']
        if reassign:
            for suggestion in reassign:
                new_lecturer_id = suggestion.parameters['new_lecturer_id']
                assert new_lecturer_id in [l['id'] for l in entities['lecturers']]
    
    def test_suggestion_ranking_quality(self, engine, complex_scenario):
        """Test the quality of suggestion ranking"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        suggestions = engine.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=10
        )
        
        if len(suggestions) > 1:
            # Check that suggestions are properly ranked
            scores = [s.score for s in suggestions]
            assert scores == sorted(scores, reverse=True)
            
            # Higher-ranked suggestions should generally have better characteristics
            top_suggestion = suggestions[0]
            bottom_suggestion = suggestions[-1]
            
            # Top suggestion should have higher or equal score
            assert top_suggestion.score >= bottom_suggestion.score
            
            # Top suggestion should not have higher effort than bottom (unless score difference is significant)
            effort_order = {'low': 1, 'medium': 2, 'high': 3}
            if top_suggestion.score - bottom_suggestion.score < 0.2:
                assert effort_order[top_suggestion.effort_level] <= effort_order[bottom_suggestion.effort_level]
    
    def test_risk_assessment_accuracy(self, engine):
        """Test accuracy of risk assessment for different suggestion types"""
        # Create high-risk suggestion
        high_risk_suggestion = ResolutionSuggestion(
            "high_risk_test",
            "Split multiple large groups across many sessions",
            "split_group",
            ["s1", "s2", "s3", "s4", "s5"],  # Many affected sessions
            {"sessions_needed": 5},
            0.4,  # Low score
            "high",  # High effort
            "Creates 5 new sessions affecting many students"
        )
        
        # Create low-risk suggestion
        low_risk_suggestion = ResolutionSuggestion(
            "low_risk_test",
            "Move session to nearby available room",
            "reassign_venue",
            ["s1"],  # Single session
            {"new_venue_id": "room_b"},
            0.9,  # High score
            "low",  # Low effort
            "Simple venue change"
        )
        
        conflicts = [{'id': 'c1', 'type': 'venue_double_booking', 'session_ids': ['s1']}]
        
        high_risk_assessment = engine._assess_suggestion_risk(high_risk_suggestion, conflicts)
        low_risk_assessment = engine._assess_suggestion_risk(low_risk_suggestion, conflicts)
        
        # High-risk suggestion should be assessed as higher risk
        risk_levels = {'low': 1, 'medium': 2, 'high': 3}
        assert risk_levels[high_risk_assessment['level']] > risk_levels[low_risk_assessment['level']]
        
        # High-risk should have more risk factors
        assert len(high_risk_assessment['factors']) > len(low_risk_assessment['factors'])
        
        # High-risk should have mitigation suggestions
        assert len(high_risk_assessment['mitigation_suggestions']) > 0
    
    def test_pattern_analysis_accuracy(self, engine, complex_scenario):
        """Test accuracy of conflict pattern analysis"""
        conflicts = complex_scenario['conflicts']
        
        patterns = engine._identify_conflict_patterns(conflicts)
        
        # Should identify patterns correctly
        assert len(patterns) > 0
        
        # Check for expected patterns
        pattern_types = [p.conflict_type for p in patterns]
        
        # Should not identify patterns that don't exist
        non_existent_patterns = ['equipment_conflict', 'time_slot_congestion']
        for pattern_type in non_existent_patterns:
            assert pattern_type not in pattern_types
        
        # Patterns should have reasonable severity scores
        for pattern in patterns:
            assert 0.0 <= pattern.severity_score <= 1.0
            assert pattern.frequency > 0
            assert len(pattern.entities) > 0
    
    def test_root_cause_identification(self, engine, complex_scenario):
        """Test root cause identification accuracy"""
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        root_causes = engine._identify_root_causes(conflicts, solution, entities)
        
        # Should identify some root causes
        assert len(root_causes) > 0
        
        # Each root cause should have required fields
        for cause in root_causes:
            assert 'type' in cause
            assert 'description' in cause
            assert 'severity' in cause
            assert 'recommendation' in cause
            assert cause['severity'] in ['low', 'medium', 'high']
        
        # Should identify resource scarcity issues
        cause_types = [c['type'] for c in root_causes]
        expected_causes = ['venue_scarcity', 'lecturer_overload', 'time_slot_congestion']
        
        # At least one expected cause should be identified
        assert any(cause_type in expected_causes for cause_type in cause_types)
    
    def test_performance_with_complex_scenario(self, engine, complex_scenario):
        """Test performance with complex scenarios"""
        import time
        
        conflicts = complex_scenario['conflicts']
        solution = complex_scenario['solution']
        entities = complex_scenario['entities']
        
        # Test analysis performance
        start_time = time.time()
        analysis = engine.analyze_conflicts(conflicts, solution, entities)
        analysis_time = time.time() - start_time
        
        # Test suggestion generation performance
        start_time = time.time()
        suggestions = engine.generate_resolution_suggestions(conflicts, solution, entities)
        suggestion_time = time.time() - start_time
        
        # Test alternative generation performance
        start_time = time.time()
        alternatives = engine.generate_multiple_alternatives(conflicts, solution, entities)
        alternative_time = time.time() - start_time
        
        # Should complete within reasonable time
        assert analysis_time < 2.0  # 2 seconds
        assert suggestion_time < 3.0  # 3 seconds
        assert alternative_time < 5.0  # 5 seconds
        
        # Should produce meaningful results
        assert len(suggestions) > 0
        assert len(alternatives) > 0
        assert analysis['total_conflicts'] == len(conflicts)


class TestConflictResolutionEngineEdgeCases:
    """Test edge cases and error handling in conflict resolution engine"""
    
    @pytest.fixture
    def engine(self):
        return ConflictAnalyzer()
    
    def test_empty_conflicts_handling(self, engine):
        """Test handling of empty conflict list"""
        conflicts = []
        solution = SolutionModel(sessions=[], score=1.0, is_feasible=True)
        entities = {'venues': [], 'lecturers': [], 'courses': [], 'student_groups': []}
        
        analysis = engine.analyze_conflicts(conflicts, solution, entities)
        suggestions = engine.generate_resolution_suggestions(conflicts, solution, entities)
        
        assert analysis['total_conflicts'] == 0
        assert len(suggestions) == 0
    
    def test_no_viable_solutions_handling(self, engine):
        """Test handling when no viable solutions exist"""
        # Create impossible scenario
        conflicts = [
            {
                'id': 'impossible',
                'type': 'venue_double_booking',
                'session_ids': ['session1']
            }
        ]
        
        sessions = [
            ScheduledSessionModel(
                id="session1",
                course_id="course1",
                lecturer_id="lecturer1",
                venue_id="only_venue",
                student_groups=["group1"],
                start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0),
                day_of_week=0
            )
        ]
        
        solution = SolutionModel(sessions=sessions, score=0.0, is_feasible=False)
        
        # Only one venue, no alternatives
        entities = {
            'venues': [{'id': 'only_venue', 'name': 'Only Room', 'capacity': 30}],
            'lecturers': [{'id': 'lecturer1', 'name': 'Only Prof', 'subjects': ['math']}],
            'courses': [{'id': 'course1', 'name': 'Course 1', 'required_equipment': []}],
            'student_groups': [{'id': 'group1', 'size': 25}]
        }
        
        suggestions = engine.generate_resolution_suggestions(conflicts, solution, entities)
        
        # Should handle gracefully, possibly with rescheduling suggestions
        assert isinstance(suggestions, list)
        # May be empty or contain rescheduling suggestions
    
    def test_malformed_data_handling(self, engine):
        """Test handling of malformed input data"""
        # Missing required fields
        conflicts = [
            {
                'id': 'malformed',
                # Missing 'type' field
                'session_ids': ['session1']
            }
        ]
        
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
            )
        ]
        
        solution = SolutionModel(sessions=sessions, score=0.5, is_feasible=False)
        entities = {
            'venues': [{'id': 'venue1', 'name': 'Room 1', 'capacity': 30}],
            'lecturers': [{'id': 'lecturer1', 'name': 'Prof 1', 'subjects': ['math']}],
            'courses': [{'id': 'course1', 'name': 'Course 1'}],
            'student_groups': [{'id': 'group1', 'size': 25}]
        }
        
        # Should handle gracefully without crashing
        try:
            analysis = engine.analyze_conflicts(conflicts, solution, entities)
            suggestions = engine.generate_resolution_suggestions(conflicts, solution, entities)
            assert isinstance(analysis, dict)
            assert isinstance(suggestions, list)
        except Exception as e:
            # If it raises an exception, it should be a controlled one
            assert "malformed" in str(e).lower() or "missing" in str(e).lower()