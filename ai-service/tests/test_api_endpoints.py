"""
Integration tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json

from main import app
from models.optimization_models import (
    OptimizationRequest,
    OptimizationParameters,
    ConstraintModel,
    ConstraintType,
    Priority,
    SolutionModel,
    ScheduledSessionModel
)

class TestAPIEndpoints:
    
    def setup_method(self):
        """Set up test fixtures"""
        self.client = TestClient(app)
        
        self.sample_request_data = {
            "entities": {
                "venues": [
                    {
                        "id": "v1",
                        "name": "Room A",
                        "capacity": 50,
                        "equipment": ["projector"]
                    }
                ],
                "lecturers": [
                    {
                        "id": "l1",
                        "name": "Dr. Smith",
                        "availability": {
                            "monday": [{"start_hour": 9, "end_hour": 17}]
                        }
                    }
                ],
                "courses": [
                    {
                        "id": "c1",
                        "name": "Math 101",
                        "duration": 60,
                        "frequency": 1,
                        "required_equipment": ["projector"],
                        "student_groups": ["g1"],
                        "lecturer_id": "l1"
                    }
                ],
                "student_groups": [
                    {
                        "id": "g1",
                        "name": "Group 1",
                        "size": 25
                    }
                ]
            },
            "constraints": [
                {
                    "id": "c1",
                    "type": "hard_availability",
                    "priority": "critical",
                    "entities": ["l1"],
                    "rule": {"lecturer_id": "l1"},
                    "weight": 1.0
                }
            ],
            "optimization_parameters": {
                "max_solve_time_seconds": 60,
                "preference_weight": 0.3,
                "efficiency_weight": 0.4,
                "balance_weight": 0.3,
                "allow_partial_solutions": True
            }
        }
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = self.client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AI Timetabling Optimization Service"
        assert data["status"] == "running"
        assert "timestamp" in data
    
    def test_health_check_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
        assert "csp_solver" in data["services"]
        assert "constraint_encoder" in data["services"]
        assert "timestamp" in data
    
    @patch('main.csp_solver')
    def test_health_check_unhealthy(self, mock_solver):
        """Test health check when solver is unavailable"""
        mock_solver.test_solver.side_effect = Exception("Solver error")
        
        response = self.client.get("/health")
        
        assert response.status_code == 503
        assert "Service unhealthy" in response.json()["detail"]
    
    @patch('main.csp_solver')
    @patch('main.constraint_encoder')
    def test_optimize_endpoint_success(self, mock_encoder, mock_solver):
        """Test successful optimization request"""
        # Mock encoder
        mock_encoder.encode_constraints.return_value = {
            "entities": {},
            "time_slots": [],
            "constraints": []
        }
        
        # Mock solver
        mock_solution = SolutionModel(
            sessions=[
                ScheduledSessionModel(
                    id="session_1",
                    course_id="c1",
                    lecturer_id="l1", 
                    venue_id="v1",
                    student_groups=["g1"],
                    start_time="2024-01-01T09:00:00",
                    end_time="2024-01-01T10:00:00",
                    day_of_week=0
                )
            ],
            score=0.85,
            is_feasible=True,
            conflicts=[]
        )
        mock_solver.solve.return_value = mock_solution
        
        response = self.client.post("/optimize", json=self.sample_request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["solution"] is not None
        assert data["message"] == "Optimization completed successfully"
        assert len(data["solution"]["sessions"]) == 1
    
    @patch('main.csp_solver')
    @patch('main.constraint_encoder')
    def test_optimize_endpoint_infeasible(self, mock_encoder, mock_solver):
        """Test optimization request with infeasible solution"""
        # Mock encoder
        mock_encoder.encode_constraints.return_value = {
            "entities": {},
            "time_slots": [],
            "constraints": []
        }
        
        # Mock solver returning infeasible solution
        mock_solution = SolutionModel(
            sessions=[],
            score=0.0,
            is_feasible=False,
            conflicts=[{"type": "capacity_conflict", "message": "Insufficient capacity"}]
        )
        mock_solver.solve.return_value = mock_solution
        
        response = self.client.post("/optimize", json=self.sample_request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["solution"] is None
        assert "No feasible solution found" in data["message"]
        assert len(data["conflicts"]) == 1
    
    @patch('main.csp_solver')
    @patch('main.constraint_encoder')
    def test_optimize_endpoint_error(self, mock_encoder, mock_solver):
        """Test optimization request with solver error"""
        # Mock encoder
        mock_encoder.encode_constraints.side_effect = Exception("Encoding failed")
        
        response = self.client.post("/optimize", json=self.sample_request_data)
        
        assert response.status_code == 500
        assert "Optimization failed" in response.json()["detail"]
    
    def test_optimize_endpoint_invalid_request(self):
        """Test optimization with invalid request data"""
        invalid_data = {"invalid": "data"}
        
        response = self.client.post("/optimize", json=invalid_data)
        
        assert response.status_code == 422  # Validation error
    
    @patch('main.csp_solver')
    def test_validate_endpoint_success(self, mock_solver):
        """Test successful solution validation"""
        # Mock validation result
        mock_validation = Mock()
        mock_validation.is_valid = True
        mock_validation.score = 0.8
        mock_validation.conflicts = []
        mock_solver.validate_solution.return_value = mock_validation
        
        solution_data = {
            "sessions": [
                {
                    "id": "session_1",
                    "course_id": "c1",
                    "lecturer_id": "l1",
                    "venue_id": "v1", 
                    "student_groups": ["g1"],
                    "start_time": "2024-01-01T09:00:00",
                    "end_time": "2024-01-01T10:00:00",
                    "day_of_week": 0
                }
            ],
            "score": 0.8,
            "is_feasible": True,
            "conflicts": []
        }
        
        response = self.client.post("/validate", json=solution_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["score"] == 0.8
        assert data["message"] == "Validation completed"
    
    @patch('main.csp_solver')
    def test_validate_endpoint_error(self, mock_solver):
        """Test validation endpoint with solver error"""
        mock_solver.validate_solution.side_effect = Exception("Validation failed")
        
        solution_data = {
            "sessions": [],
            "score": 0.0,
            "is_feasible": False,
            "conflicts": []
        }
        
        response = self.client.post("/validate", json=solution_data)
        
        assert response.status_code == 500
        assert "Validation failed" in response.json()["detail"]
    
    def test_validate_endpoint_invalid_solution(self):
        """Test validation with invalid solution data"""
        invalid_solution = {"invalid": "solution"}
        
        response = self.client.post("/validate", json=invalid_solution)
        
        assert response.status_code == 422  # Validation error

if __name__ == "__main__":
    pytest.main([__file__])