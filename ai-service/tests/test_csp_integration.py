"""
Integration tests for CSP solver with sample timetabling problems
"""

import pytest
from datetime import datetime

from services.csp_solver import CSPSolver
from services.constraint_encoder import ConstraintEncoder
from models.optimization_models import (
    OptimizationParameters,
    ConstraintModel,
    ConstraintType,
    Priority
)

class TestCSPIntegration:
    
    def setup_method(self):
        """Set up test fixtures"""
        self.solver = CSPSolver()
        self.encoder = ConstraintEncoder()
        
        # Sample timetabling problem
        self.sample_entities = {
            "venues": [
                {
                    "id": "room_a",
                    "name": "Room A",
                    "capacity": 50,
                    "equipment": ["projector", "whiteboard"]
                },
                {
                    "id": "room_b",
                    "name": "Room B", 
                    "capacity": 30,
                    "equipment": ["computer", "projector"]
                },
                {
                    "id": "lab_1",
                    "name": "Computer Lab 1",
                    "capacity": 25,
                    "equipment": ["computer", "network"]
                }
            ],
            "lecturers": [
                {
                    "id": "dr_smith",
                    "name": "Dr. Smith",
                    "availability": {
                        "monday": [{"start_hour": 9, "end_hour": 17}],
                        "tuesday": [{"start_hour": 10, "end_hour": 16}],
                        "wednesday": [{"start_hour": 9, "end_hour": 15}],
                        "thursday": [{"start_hour": 11, "end_hour": 17}],
                        "friday": [{"start_hour": 9, "end_hour": 14}]
                    },
                    "preferences": {
                        "preferred_times": ["0_9", "0_10", "2_9"],  # Monday 9-10 AM, Wednesday 9 AM
                        "max_consecutive_hours": 3
                    },
                    "max_hours_per_week": 20
                },
                {
                    "id": "prof_jones",
                    "name": "Prof. Jones",
                    "availability": {
                        "monday": [{"start_hour": 8, "end_hour": 16}],
                        "tuesday": [{"start_hour": 9, "end_hour": 17}],
                        "wednesday": [{"start_hour": 10, "end_hour": 18}],
                        "thursday": [{"start_hour": 8, "end_hour": 15}],
                        "friday": [{"start_hour": 9, "end_hour": 16}]
                    },
                    "preferences": {
                        "preferred_times": ["1_14", "3_10"],  # Tuesday 2 PM, Thursday 10 AM
                        "max_consecutive_hours": 4
                    },
                    "max_hours_per_week": 25
                }
            ],
            "courses": [
                {
                    "id": "math_101",
                    "name": "Mathematics 101",
                    "duration": 60,
                    "frequency": 2,  # 2 sessions per week
                    "required_equipment": ["projector"],
                    "student_groups": ["cs_year1", "math_year1"],
                    "lecturer_id": "dr_smith"
                },
                {
                    "id": "cs_201",
                    "name": "Computer Science 201",
                    "duration": 90,
                    "frequency": 1,
                    "required_equipment": ["computer", "projector"],
                    "student_groups": ["cs_year2"],
                    "lecturer_id": "prof_jones"
                },
                {
                    "id": "prog_lab",
                    "name": "Programming Lab",
                    "duration": 120,
                    "frequency": 1,
                    "required_equipment": ["computer", "network"],
                    "student_groups": ["cs_year1"],
                    "lecturer_id": "prof_jones"
                }
            ],
            "student_groups": [
                {
                    "id": "cs_year1",
                    "name": "Computer Science Year 1",
                    "size": 30,
                    "courses": ["math_101", "prog_lab"]
                },
                {
                    "id": "cs_year2", 
                    "name": "Computer Science Year 2",
                    "size": 25,
                    "courses": ["cs_201"]
                },
                {
                    "id": "math_year1",
                    "name": "Mathematics Year 1",
                    "size": 20,
                    "courses": ["math_101"]
                }
            ]
        }
        
        self.sample_constraints = [
            ConstraintModel(
                id="hard_availability_smith",
                type=ConstraintType.HARD_AVAILABILITY,
                priority=Priority.CRITICAL,
                entities=["dr_smith"],
                rule={"lecturer_id": "dr_smith", "enforce_availability": True},
                weight=1.0
            ),
            ConstraintModel(
                id="hard_availability_jones",
                type=ConstraintType.HARD_AVAILABILITY,
                priority=Priority.CRITICAL,
                entities=["prof_jones"],
                rule={"lecturer_id": "prof_jones", "enforce_availability": True},
                weight=1.0
            ),
            ConstraintModel(
                id="venue_capacity_all",
                type=ConstraintType.VENUE_CAPACITY,
                priority=Priority.CRITICAL,
                entities=["room_a", "room_b", "lab_1"],
                rule={"enforce_capacity": True},
                weight=1.0
            ),
            ConstraintModel(
                id="equipment_requirements",
                type=ConstraintType.EQUIPMENT_REQUIREMENT,
                priority=Priority.HIGH,
                entities=["math_101", "cs_201", "prog_lab"],
                rule={"enforce_equipment": True},
                weight=0.9
            ),
            ConstraintModel(
                id="lecturer_preferences",
                type=ConstraintType.LECTURER_PREFERENCE,
                priority=Priority.MEDIUM,
                entities=["dr_smith", "prof_jones"],
                rule={"optimize_preferences": True},
                weight=0.7
            )
        ]
        
        self.optimization_params = OptimizationParameters(
            max_solve_time_seconds=60,
            preference_weight=0.3,
            efficiency_weight=0.4,
            balance_weight=0.3,
            allow_partial_solutions=True
        )
    
    def test_constraint_encoding_integration(self):
        """Test complete constraint encoding workflow"""
        encoded_constraints = self.encoder.encode_constraints(
            self.sample_constraints,
            self.sample_entities
        )
        
        # Verify encoding structure
        assert "entities" in encoded_constraints
        assert "time_slots" in encoded_constraints
        assert "constraints" in encoded_constraints
        assert "metadata" in encoded_constraints
        
        # Verify entities are properly encoded
        entities = encoded_constraints["entities"]
        assert len(entities["venues"]) == 3
        assert len(entities["lecturers"]) == 2
        assert len(entities["courses"]) == 3
        assert len(entities["student_groups"]) == 3
        
        # Verify time slots generated
        time_slots = encoded_constraints["time_slots"]
        assert len(time_slots) == 50  # 5 days * 10 hours
        
        # Verify constraints encoded
        constraints = encoded_constraints["constraints"]
        assert len(constraints) == 5
        
        # Check lecturer availability normalization
        dr_smith = next(l for l in entities["lecturers"] if l["id"] == "dr_smith")
        availability = dr_smith["availability"]
        assert "0" in availability  # Monday
        assert "4" in availability  # Friday
        assert isinstance(availability["0"], list)
    
    def test_csp_solver_with_real_problem(self):
        """Test CSP solver with realistic timetabling problem"""
        # Encode constraints
        encoded_constraints = self.encoder.encode_constraints(
            self.sample_constraints,
            self.sample_entities
        )
        
        # Solve the problem
        solution = self.solver.solve(encoded_constraints, self.optimization_params)
        
        # Verify solution structure
        assert solution is not None
        assert hasattr(solution, 'is_feasible')
        assert hasattr(solution, 'sessions')
        assert hasattr(solution, 'score')
        assert hasattr(solution, 'conflicts')
        assert hasattr(solution, 'metadata')
        
        # If feasible, verify solution quality
        if solution.is_feasible:
            assert len(solution.sessions) > 0
            assert 0.0 <= solution.score <= 1.0
            
            # Verify all courses have required sessions
            course_sessions = {}
            for session in solution.sessions:
                course_id = session.course_id
                course_sessions[course_id] = course_sessions.get(course_id, 0) + 1
            
            # Check frequency requirements
            for course in self.sample_entities["courses"]:
                course_id = course["id"]
                expected_frequency = course["frequency"]
                actual_frequency = course_sessions.get(course_id, 0)
                
                # Should have at least the required frequency
                assert actual_frequency >= expected_frequency, f"Course {course_id} has {actual_frequency} sessions, expected {expected_frequency}"
        
        # If infeasible, should have conflict information
        else:
            assert len(solution.conflicts) > 0
            assert "type" in solution.conflicts[0]
    
    def test_solution_validation_comprehensive(self):
        """Test comprehensive solution validation"""
        # Create a sample solution
        from models.optimization_models import SolutionModel, ScheduledSessionModel
        
        sessions = [
            ScheduledSessionModel(
                id="math_101_session_1",
                course_id="math_101",
                lecturer_id="dr_smith",
                venue_id="room_a",
                student_groups=["cs_year1", "math_year1"],
                start_time=datetime(2024, 1, 1, 9, 0),  # Monday 9 AM
                end_time=datetime(2024, 1, 1, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="math_101_session_2",
                course_id="math_101",
                lecturer_id="dr_smith",
                venue_id="room_a",
                student_groups=["cs_year1", "math_year1"],
                start_time=datetime(2024, 1, 3, 9, 0),  # Wednesday 9 AM
                end_time=datetime(2024, 1, 3, 10, 0),
                day_of_week=2
            ),
            ScheduledSessionModel(
                id="cs_201_session_1",
                course_id="cs_201",
                lecturer_id="prof_jones",
                venue_id="room_b",
                student_groups=["cs_year2"],
                start_time=datetime(2024, 1, 2, 14, 0),  # Tuesday 2 PM
                end_time=datetime(2024, 1, 2, 15, 30),
                day_of_week=1
            ),
            ScheduledSessionModel(
                id="prog_lab_session_1",
                course_id="prog_lab",
                lecturer_id="prof_jones",
                venue_id="lab_1",
                student_groups=["cs_year1"],
                start_time=datetime(2024, 1, 4, 10, 0),  # Thursday 10 AM
                end_time=datetime(2024, 1, 4, 12, 0),
                day_of_week=3
            )
        ]
        
        solution = SolutionModel(
            sessions=sessions,
            score=0.0,  # Will be calculated
            is_feasible=True,
            conflicts=[],
            metadata={}
        )
        
        # Validate the solution
        validation_result = self.solver.validate_solution(solution)
        
        # Check validation result
        assert validation_result.is_valid is True  # No conflicts in this schedule
        assert 0.0 <= validation_result.score <= 1.0
        assert len(validation_result.conflicts) == 0
        assert isinstance(validation_result.constraint_violations, list)
    
    def test_solution_validation_with_conflicts(self):
        """Test solution validation with scheduling conflicts"""
        from models.optimization_models import SolutionModel, ScheduledSessionModel
        
        # Create conflicting sessions (same lecturer, same time)
        sessions = [
            ScheduledSessionModel(
                id="math_101_session_1",
                course_id="math_101",
                lecturer_id="dr_smith",
                venue_id="room_a",
                student_groups=["cs_year1"],
                start_time=datetime(2024, 1, 1, 9, 0),  # Monday 9 AM
                end_time=datetime(2024, 1, 1, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="conflicting_session",
                course_id="other_course",
                lecturer_id="dr_smith",  # Same lecturer
                venue_id="room_b",
                student_groups=["other_group"],
                start_time=datetime(2024, 1, 1, 9, 0),  # Same time - CONFLICT!
                end_time=datetime(2024, 1, 1, 10, 0),
                day_of_week=0
            )
        ]
        
        solution = SolutionModel(
            sessions=sessions,
            score=0.0,
            is_feasible=True,
            conflicts=[],
            metadata={}
        )
        
        # Validate the solution
        validation_result = self.solver.validate_solution(solution)
        
        # Should detect the conflict
        assert validation_result.is_valid is False
        assert validation_result.score < 1.0
        assert len(validation_result.conflicts) > 0
        
        # Check conflict details
        lecturer_conflict = any(
            conflict["type"] == "lecturer_double_booking" 
            for conflict in validation_result.conflicts
        )
        assert lecturer_conflict is True
    
    def test_optimization_scoring_components(self):
        """Test individual scoring components"""
        from models.optimization_models import SolutionModel, ScheduledSessionModel
        
        # Create a well-balanced solution
        sessions = [
            ScheduledSessionModel(
                id="session_1",
                course_id="math_101",
                lecturer_id="dr_smith",
                venue_id="room_a",
                student_groups=["cs_year1"],
                start_time=datetime(2024, 1, 1, 9, 0),
                end_time=datetime(2024, 1, 1, 10, 0),
                day_of_week=0
            ),
            ScheduledSessionModel(
                id="session_2",
                course_id="cs_201",
                lecturer_id="prof_jones",
                venue_id="room_b",
                student_groups=["cs_year2"],
                start_time=datetime(2024, 1, 1, 10, 0),  # Consecutive with session 1
                end_time=datetime(2024, 1, 1, 11, 0),
                day_of_week=0
            )
        ]
        
        solution = SolutionModel(
            sessions=sessions,
            score=0.0,
            is_feasible=True,
            conflicts=[],
            metadata={}
        )
        
        # Test individual scoring components
        venue_score = self.solver._calculate_venue_utilization_score(solution)
        lecturer_score = self.solver._calculate_lecturer_satisfaction_score(solution)
        student_score = self.solver._calculate_student_convenience_score(solution)
        efficiency_score = self.solver._calculate_efficiency_score(solution)
        
        # All scores should be between 0 and 1
        assert 0.0 <= venue_score <= 1.0
        assert 0.0 <= lecturer_score <= 1.0
        assert 0.0 <= student_score <= 1.0
        assert 0.0 <= efficiency_score <= 1.0
    
    def test_empty_solution_handling(self):
        """Test handling of empty solutions"""
        from models.optimization_models import SolutionModel
        
        empty_solution = SolutionModel(
            sessions=[],
            score=0.0,
            is_feasible=False,
            conflicts=[],
            metadata={}
        )
        
        validation_result = self.solver.validate_solution(empty_solution)
        
        # Should handle empty solution gracefully
        assert validation_result.is_valid is True  # No conflicts in empty solution
        assert validation_result.score >= 0.0
        assert len(validation_result.conflicts) == 0

if __name__ == "__main__":
    pytest.main([__file__])