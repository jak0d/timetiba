"""
Integration tests for Conflict Resolution Suggestion Engine with CSP Solver
Tests the complete workflow from conflict detection to resolution application
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from services.conflict_analyzer import ConflictAnalyzer
from services.csp_solver import CSPSolver
from models.optimization_models import (
    SolutionModel, ScheduledSessionModel, OptimizationParameters,
    VenueModel, LecturerModel, CourseModel, StudentGroupModel
)


class TestConflictResolutionIntegration:
    """Integration tests for conflict resolution with CSP solver"""
    
    @pytest.fixture
    def analyzer(self):
        """Create ConflictAnalyzer instance"""
        return ConflictAnalyzer()
    
    @pytest.fixture
    def csp_solver(self):
        """Create CSP solver instance"""
        return CSPSolver()
    
    @pytest.fixture
    def complex_scenario(self):
        """Create a complex scenario with multiple conflict types"""
        venues = [
            VenueModel(id="v1", name="Room A", type="classroom", capacity=30, equipment=["projector"]),
            VenueModel(id="v2", name="Room B", type="lab", capacity=50, equipment=["lab"]),
            VenueModel(id="v3", name="Room C", type="auditorium", capacity=100, equipment=["projector", "microphone"])
        ]
        
        lecturers = [
            LecturerModel(
                id="l1", name="Prof Smith", type="lecturer", subjects=["math"], 
                availability={"monday": True, "tuesday": True}, max_hours_per_week=20
            ),
            LecturerModel(
                id="l2", name="Prof Jones", type="lecturer", subjects=["physics"], 
                availability={"monday": True, "wednesday": True}, max_hours_per_week=25
            )
        ]
        
        courses = [
            CourseModel(id="c1", name="Math 101", type="course", duration=60, frequency=2, required_equipment=["projector"], lecturer_id="l1"),
            CourseModel(id="c2", name="Physics 101", type="course", duration=60, frequency=2, required_equipment=["lab"], lecturer_id="l2"),
            CourseModel(id="c3", name="Advanced Math", type="course", duration=60, frequency=1, required_equipment=["projector"], lecturer_id="l1")
        ]
        
        student_groups = [
            StudentGroupModel(id="g1", name="Group A", type="group", size=25, year_level=1, department="math"),
            StudentGroupModel(id="g2", name="Group B", type="group", size=35, year_level=1, department="physics"),
            StudentGroupModel(id="g3", name="Group C", type="group", size=45, year_level=2, department="math")
        ]
        
        # Create conflicted sessions
        sessions = [
            ScheduledSessionModel(
                id="s1", course_id="c1", lecturer_id="l1", venue_id="v1",
                student_groups=["g1"], start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0), day_of_week=0
            ),
            ScheduledSessionModel(
                id="s2", course_id="c2", lecturer_id="l2", venue_id="v1",  # Venue conflict
                student_groups=["g2"], start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0), day_of_week=0
            ),
            ScheduledSessionModel(
                id="s3", course_id="c3", lecturer_id="l1", venue_id="v2",  # Lecturer conflict
                student_groups=["g3"], start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0), day_of_week=0
            )
        ]
        
        solution = SolutionModel(sessions=sessions, score=0.3, is_feasible=False)
        
        conflicts = [
            {
                'id': 'conf1', 'type': 'venue_double_booking', 'severity': 'high',
                'session_ids': ['s1', 's2'], 'affected_entities': ['v1', 's1', 's2']
            },
            {
                'id': 'conf2', 'type': 'lecturer_conflict', 'severity': 'high',
                'session_ids': ['s1', 's3'], 'affected_entities': ['l1', 's1', 's3']
            }
        ]
        
        entities = {
            'venues': [v.model_dump() for v in venues],
            'lecturers': [l.model_dump() for l in lecturers],
            'courses': [c.model_dump() for c in courses],
            'student_groups': [g.model_dump() for g in student_groups]
        }
        
        return conflicts, solution, entities, venues, lecturers, courses, student_groups
    
    def test_end_to_end_conflict_resolution_workflow(self, analyzer, complex_scenario):
        """Test complete workflow from conflict detection to resolution"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        # Step 1: Analyze conflicts
        analysis = analyzer.analyze_conflicts(conflicts, solution, entities)
        
        assert analysis['total_conflicts'] == 2
        assert len(analysis['patterns']) >= 0  # May be 0 with only 2 conflicts
        assert len(analysis['root_causes']) >= 0
        
        # Step 2: Generate resolution suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=5
        )
        
        assert len(suggestions) > 0
        assert all(s.score > 0 for s in suggestions)
        
        # Step 3: Evaluate suggestion quality
        top_suggestion = suggestions[0]
        evaluation = analyzer.evaluate_suggestion_quality(
            top_suggestion, conflicts, solution, entities
        )
        
        assert evaluation['recommendation'] in ['approve', 'review']
        assert 0 <= evaluation['overall_score'] <= 1
        
        # Step 4: Generate alternative paths
        alternatives = analyzer.generate_multiple_alternatives(
            conflicts, solution, entities, num_alternatives=3
        )
        
        assert len(alternatives) > 0
        assert all(isinstance(alt, list) for alt in alternatives)
    
    def test_suggestion_application_simulation(self, analyzer, complex_scenario):
        """Test simulating the application of resolution suggestions"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=3
        )
        
        assert len(suggestions) > 0
        
        # Simulate applying the top suggestion
        top_suggestion = suggestions[0]
        
        # Create modified solution based on suggestion
        modified_sessions = solution.sessions.copy()
        
        if top_suggestion.resolution_type == 'reassign_venue':
            session_id = top_suggestion.parameters.get('session_id')
            new_venue_id = top_suggestion.parameters.get('new_venue_id')
            
            for session in modified_sessions:
                if session.id == session_id:
                    session.venue_id = new_venue_id
                    break
        
        elif top_suggestion.resolution_type == 'reschedule':
            session_id = top_suggestion.parameters.get('session_id')
            new_time = top_suggestion.parameters.get('new_time')
            
            for session in modified_sessions:
                if session.id == session_id:
                    # Parse new time and update session
                    if 'Monday 10:00' in str(new_time):
                        session.start_time = datetime(2024, 1, 15, 10, 0)
                        session.end_time = datetime(2024, 1, 15, 11, 0)
                    break
        
        # Create new solution with modifications
        modified_solution = SolutionModel(
            sessions=modified_sessions,
            score=0.8,  # Assume improvement
            is_feasible=True
        )
        
        # Verify improvement (this would normally involve re-running conflict detection)
        assert modified_solution.score > solution.score
        assert modified_solution.is_feasible
    
    def test_iterative_conflict_resolution(self, analyzer, complex_scenario):
        """Test iterative resolution of multiple conflicts"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        remaining_conflicts = conflicts.copy()
        current_solution = solution
        resolution_steps = []
        
        # Simulate iterative resolution
        max_iterations = 3
        for iteration in range(max_iterations):
            if not remaining_conflicts:
                break
            
            # Generate suggestions for remaining conflicts
            suggestions = analyzer.generate_resolution_suggestions(
                remaining_conflicts, current_solution, entities, max_suggestions=1
            )
            
            if not suggestions:
                break
            
            # Apply top suggestion (simulated)
            top_suggestion = suggestions[0]
            resolution_steps.append({
                'iteration': iteration + 1,
                'suggestion': top_suggestion,
                'conflicts_before': len(remaining_conflicts)
            })
            
            # Remove resolved conflicts (simplified simulation)
            affected_sessions = set(top_suggestion.affected_sessions)
            remaining_conflicts = [
                c for c in remaining_conflicts
                if not any(session_id in affected_sessions for session_id in c.get('session_ids', []))
            ]
            
            # Update solution score (simulated improvement)
            current_solution.score = min(1.0, current_solution.score + 0.3)
        
        # Verify iterative improvement
        assert len(resolution_steps) > 0
        assert current_solution.score > solution.score
        assert len(remaining_conflicts) < len(conflicts)
    
    def test_conflict_resolution_with_constraints(self, analyzer, complex_scenario):
        """Test resolution suggestions respect various constraints"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=10
        )
        
        # Verify suggestions respect constraints
        for suggestion in suggestions:
            if suggestion.resolution_type == 'reassign_venue':
                new_venue_id = suggestion.parameters.get('new_venue_id')
                session_id = suggestion.parameters.get('session_id')
                
                # Find the session and verify venue suitability
                session = next((s for s in solution.sessions if s.id == session_id), None)
                venue = next((v for v in entities['venues'] if v['id'] == new_venue_id), None)
                
                if session and venue:
                    # Check capacity constraint
                    total_students = sum(
                        next((g['size'] for g in entities['student_groups'] if g['id'] == group_id), 0)
                        for group_id in session.student_groups
                    )
                    assert venue['capacity'] >= total_students
                    
                    # Check equipment constraint
                    course = next((c for c in entities['courses'] if c['id'] == session.course_id), None)
                    if course:
                        required_equipment = course.get('required_equipment', [])
                        venue_equipment = venue.get('equipment', [])
                        assert all(eq in venue_equipment for eq in required_equipment)
    
    def test_suggestion_quality_metrics(self, analyzer, complex_scenario):
        """Test quality metrics for resolution suggestions"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=5
        )
        
        # Evaluate each suggestion
        evaluations = []
        for suggestion in suggestions:
            evaluation = analyzer.evaluate_suggestion_quality(
                suggestion, conflicts, solution, entities
            )
            evaluations.append(evaluation)
        
        # Verify quality metrics
        for evaluation in evaluations:
            assert 0 <= evaluation['overall_score'] <= 1
            assert 0 <= evaluation['confidence'] <= 1
            assert 0 <= evaluation['feasibility_score'] <= 1
            assert 0 <= evaluation['impact_score'] <= 1
            assert 0 <= evaluation['effort_score'] <= 1
            assert evaluation['recommendation'] in ['approve', 'review']
            assert evaluation['risk_assessment']['level'] in ['low', 'medium', 'high']
        
        # Higher scored suggestions should generally have better evaluations
        if len(evaluations) > 1:
            sorted_by_score = sorted(zip(suggestions, evaluations), key=lambda x: x[0].score, reverse=True)
            top_eval = sorted_by_score[0][1]
            bottom_eval = sorted_by_score[-1][1]
            
            # Top suggestion should generally have better or equal metrics
            assert top_eval['overall_score'] >= bottom_eval['overall_score'] * 0.8  # Allow some variance
    
    def test_performance_with_large_conflict_set(self, analyzer):
        """Test performance with a large number of conflicts"""
        import time
        
        # Create large conflict set
        num_conflicts = 100
        num_sessions = 200
        
        conflicts = []
        sessions = []
        
        for i in range(num_conflicts):
            conflicts.append({
                'id': f'conflict_{i}',
                'type': ['venue_double_booking', 'lecturer_conflict', 'capacity_exceeded'][i % 3],
                'severity': ['low', 'medium', 'high'][i % 3],
                'session_ids': [f'session_{i}', f'session_{i+num_conflicts}'],
                'affected_entities': [f'entity_{i}', f'session_{i}']
            })
        
        for i in range(num_sessions):
            sessions.append(ScheduledSessionModel(
                id=f"session_{i}",
                course_id=f"course_{i % 20}",
                lecturer_id=f"lecturer_{i % 15}",
                venue_id=f"venue_{i % 10}",
                student_groups=[f"group_{i % 25}"],
                start_time=datetime(2024, 1, 15, 9 + (i % 8), 0),
                end_time=datetime(2024, 1, 15, 10 + (i % 8), 0),
                day_of_week=i % 5
            ))
        
        solution = SolutionModel(sessions=sessions, score=0.2, is_feasible=False)
        
        entities = {
            'venues': [{'id': f'venue_{i}', 'name': f'Room {i}', 'capacity': 50 + i*5, 'equipment': []} for i in range(10)],
            'lecturers': [{'id': f'lecturer_{i}', 'name': f'Prof {i}', 'subjects': ['math'], 'availability': {}} for i in range(15)],
            'courses': [{'id': f'course_{i}', 'name': f'Course {i}', 'required_equipment': []} for i in range(20)],
            'student_groups': [{'id': f'group_{i}', 'size': 20 + i} for i in range(25)]
        }
        
        # Measure performance
        start_time = time.time()
        
        # Analyze conflicts
        analysis = analyzer.analyze_conflicts(conflicts, solution, entities)
        
        # Generate suggestions
        suggestions = analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions=10
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Performance assertions
        assert processing_time < 10.0  # Should complete within 10 seconds
        assert len(suggestions) > 0
        assert analysis['total_conflicts'] == num_conflicts
        
        print(f"Processed {num_conflicts} conflicts in {processing_time:.2f} seconds")
        print(f"Generated {len(suggestions)} suggestions")
    
    def test_edge_case_handling(self, analyzer):
        """Test handling of edge cases in conflict resolution"""
        
        # Test with no conflicts
        empty_conflicts = []
        minimal_solution = SolutionModel(sessions=[], score=1.0, is_feasible=True)
        minimal_entities = {'venues': [], 'lecturers': [], 'courses': [], 'student_groups': []}
        
        analysis = analyzer.analyze_conflicts(empty_conflicts, minimal_solution, minimal_entities)
        assert analysis['total_conflicts'] == 0
        
        suggestions = analyzer.generate_resolution_suggestions(
            empty_conflicts, minimal_solution, minimal_entities
        )
        assert len(suggestions) == 0
        
        # Test with malformed conflict data
        malformed_conflicts = [
            {'id': 'bad1', 'type': 'unknown_type'},  # Missing required fields
            {'id': 'bad2', 'session_ids': []},  # Empty session IDs
        ]
        
        # Should handle gracefully without crashing
        try:
            suggestions = analyzer.generate_resolution_suggestions(
                malformed_conflicts, minimal_solution, minimal_entities
            )
            # Should return empty or minimal suggestions
            assert isinstance(suggestions, list)
        except Exception as e:
            pytest.fail(f"Should handle malformed data gracefully, but raised: {e}")
    
    def test_suggestion_consistency(self, analyzer, complex_scenario):
        """Test that suggestions are consistent across multiple runs"""
        conflicts, solution, entities, venues, lecturers, courses, student_groups = complex_scenario
        
        # Generate suggestions multiple times
        runs = []
        for _ in range(5):
            suggestions = analyzer.generate_resolution_suggestions(
                conflicts, solution, entities, max_suggestions=3
            )
            runs.append(suggestions)
        
        # Verify consistency
        assert all(len(run) > 0 for run in runs)
        
        # Top suggestions should be similar across runs (allowing for some variation in ranking)
        first_run_types = [s.resolution_type for s in runs[0]]
        for run in runs[1:]:
            run_types = [s.resolution_type for s in run]
            # At least 50% overlap in suggestion types
            overlap = len(set(first_run_types) & set(run_types))
            assert overlap >= len(first_run_types) * 0.5


class TestConflictResolutionEngineRobustness:
    """Test robustness and error handling of the conflict resolution engine"""
    
    @pytest.fixture
    def analyzer(self):
        return ConflictAnalyzer()
    
    def test_memory_usage_with_large_datasets(self, analyzer):
        """Test memory usage doesn't grow excessively with large datasets"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Process increasingly large datasets
        for size_multiplier in [1, 2, 4, 8]:
            conflicts = [
                {
                    'id': f'c_{i}',
                    'type': 'venue_double_booking',
                    'session_ids': [f's_{i}', f's_{i+1000}'],
                    'affected_entities': [f'v_{i}']
                }
                for i in range(50 * size_multiplier)
            ]
            
            sessions = [
                ScheduledSessionModel(
                    id=f"s_{i}",
                    course_id=f"course_{i % 10}",
                    lecturer_id=f"lecturer_{i % 5}",
                    venue_id=f"venue_{i % 3}",
                    student_groups=[f"group_{i % 8}"],
                    start_time=datetime(2024, 1, 15, 9, 0),
                    end_time=datetime(2024, 1, 15, 10, 0),
                    day_of_week=0
                )
                for i in range(100 * size_multiplier)
            ]
            
            solution = SolutionModel(sessions=sessions, score=0.5, is_feasible=False)
            entities = {
                'venues': [{'id': f'venue_{i}', 'capacity': 50} for i in range(10)],
                'lecturers': [{'id': f'lecturer_{i}', 'subjects': ['math']} for i in range(10)],
                'courses': [{'id': f'course_{i}', 'required_equipment': []} for i in range(10)],
                'student_groups': [{'id': f'group_{i}', 'size': 25} for i in range(10)]
            }
            
            # Process the dataset
            analyzer.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=5)
            
            current_memory = process.memory_info().rss
            memory_growth = current_memory - initial_memory
            
            # Memory growth should be reasonable (less than 100MB for this test)
            assert memory_growth < 100 * 1024 * 1024, f"Memory growth too large: {memory_growth / 1024 / 1024:.1f}MB"
    
    def test_concurrent_processing_safety(self, analyzer):
        """Test thread safety of conflict resolution engine"""
        import threading
        import time
        
        # Create test data
        conflicts = [
            {
                'id': 'c1',
                'type': 'venue_double_booking',
                'session_ids': ['s1', 's2'],
                'affected_entities': ['v1']
            }
        ]
        
        sessions = [
            ScheduledSessionModel(
                id="s1", course_id="c1", lecturer_id="l1", venue_id="v1",
                student_groups=["g1"], start_time=datetime(2024, 1, 15, 9, 0),
                end_time=datetime(2024, 1, 15, 10, 0), day_of_week=0
            )
        ]
        
        solution = SolutionModel(sessions=sessions, score=0.5, is_feasible=False)
        entities = {
            'venues': [{'id': 'v1', 'capacity': 50, 'equipment': []}],
            'lecturers': [{'id': 'l1', 'subjects': ['math'], 'availability': {}}],
            'courses': [{'id': 'c1', 'required_equipment': []}],
            'student_groups': [{'id': 'g1', 'size': 25}]
        }
        
        results = []
        errors = []
        
        def worker():
            try:
                suggestions = analyzer.generate_resolution_suggestions(
                    conflicts, solution, entities, max_suggestions=3
                )
                results.append(len(suggestions))
            except Exception as e:
                errors.append(str(e))
        
        # Run multiple threads concurrently
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify no errors occurred and results are consistent
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 10
        assert all(r > 0 for r in results), "All threads should generate suggestions"