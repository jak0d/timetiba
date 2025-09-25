"""
AI Optimization Service for Timetabling
FastAPI service that provides constraint satisfaction problem solving for timetable optimization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from models.optimization_models import (
    OptimizationRequest,
    OptimizationResponse,
    ConstraintModel,
    SolutionModel,
    ScheduledSessionModel
)
from services.csp_solver import CSPSolver
from services.constraint_encoder import ConstraintEncoder
from services.conflict_analyzer import ConflictAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Timetabling Optimization Service",
    description="Constraint satisfaction and optimization service for academic timetabling",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
csp_solver = CSPSolver()
constraint_encoder = ConstraintEncoder()
conflict_analyzer = ConflictAnalyzer()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Timetabling Optimization Service",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check with service status"""
    try:
        # Test OR-Tools availability
        solver_status = csp_solver.test_solver()
        return {
            "status": "healthy",
            "services": {
                "csp_solver": "available" if solver_status else "unavailable",
                "constraint_encoder": "available"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_timetable(request: OptimizationRequest):
    """
    Optimize timetable using constraint satisfaction problem solving
    
    Args:
        request: OptimizationRequest containing entities, constraints, and parameters
        
    Returns:
        OptimizationResponse with optimized solution or error details
    """
    try:
        logger.info(f"Received optimization request with {len(request.constraints)} constraints")
        
        # Encode constraints for CSP solver
        encoded_constraints = constraint_encoder.encode_constraints(
            request.constraints,
            request.entities
        )
        
        # Solve the CSP
        solution = csp_solver.solve(
            encoded_constraints,
            request.optimization_parameters
        )
        
        if solution.is_feasible:
            logger.info(f"Optimization successful with score: {solution.score}")
            return OptimizationResponse(
                success=True,
                solution=solution,
                message="Optimization completed successfully"
            )
        else:
            logger.warning("No feasible solution found")
            return OptimizationResponse(
                success=False,
                solution=None,
                message="No feasible solution found with given constraints",
                conflicts=solution.conflicts
            )
            
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {str(e)}"
        )

@app.post("/validate")
async def validate_solution(solution: SolutionModel):
    """
    Validate a timetable solution against constraints
    
    Args:
        solution: SolutionModel to validate
        
    Returns:
        Validation result with conflicts and score
    """
    try:
        logger.info("Validating solution")
        
        validation_result = csp_solver.validate_solution(solution)
        
        return {
            "valid": validation_result.is_valid,
            "score": validation_result.score,
            "conflicts": validation_result.conflicts,
            "message": "Validation completed"
        }
        
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )

@app.post("/analyze-conflicts")
async def analyze_conflicts(request: dict):
    """
    Analyze conflicts and identify patterns
    
    Args:
        request: Dictionary containing conflicts, solution, and entities
        
    Returns:
        Analysis results with patterns and suggestions
    """
    try:
        logger.info("Received conflict analysis request")
        
        conflicts = request.get("conflicts", [])
        solution_data = request.get("solution", {})
        entities = request.get("entities", {})
        
        # Convert solution data to SolutionModel
        sessions = []
        for session_data in solution_data.get("sessions", []):
            session = ScheduledSessionModel(**session_data)
            sessions.append(session)
        
        solution = SolutionModel(
            sessions=sessions,
            score=solution_data.get("score", 0.0),
            is_feasible=solution_data.get("is_feasible", True),
            conflicts=solution_data.get("conflicts", []),
            metadata=solution_data.get("metadata", {})
        )
        
        # Analyze conflicts
        analysis_result = conflict_analyzer.analyze_conflicts(conflicts, solution, entities)
        
        return {
            "success": True,
            "analysis": analysis_result,
            "message": "Conflict analysis completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Conflict analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Conflict analysis failed: {str(e)}"
        )

@app.post("/suggest-resolutions")
async def suggest_resolutions(request: dict):
    """
    Generate resolution suggestions for conflicts
    
    Args:
        request: Dictionary containing conflicts, solution, entities, and parameters
        
    Returns:
        List of ranked resolution suggestions
    """
    try:
        logger.info("Received resolution suggestion request")
        
        conflicts = request.get("conflicts", [])
        solution_data = request.get("solution", {})
        entities = request.get("entities", {})
        max_suggestions = request.get("max_suggestions", 5)
        
        # Convert solution data to SolutionModel
        sessions = []
        for session_data in solution_data.get("sessions", []):
            session = ScheduledSessionModel(**session_data)
            sessions.append(session)
        
        solution = SolutionModel(
            sessions=sessions,
            score=solution_data.get("score", 0.0),
            is_feasible=solution_data.get("is_feasible", True),
            conflicts=solution_data.get("conflicts", []),
            metadata=solution_data.get("metadata", {})
        )
        
        # Generate suggestions
        suggestions = conflict_analyzer.generate_resolution_suggestions(
            conflicts, solution, entities, max_suggestions
        )
        
        # Convert suggestions to dictionaries
        suggestion_dicts = []
        for suggestion in suggestions:
            suggestion_dicts.append({
                "resolution_id": suggestion.resolution_id,
                "description": suggestion.description,
                "resolution_type": suggestion.resolution_type,
                "affected_sessions": suggestion.affected_sessions,
                "parameters": suggestion.parameters,
                "score": suggestion.score,
                "effort_level": suggestion.effort_level,
                "impact_description": suggestion.impact_description,
                "confidence": suggestion.confidence,
                "ranking_score": getattr(suggestion, 'ranking_score', suggestion.score)
            })
        
        return {
            "success": True,
            "suggestions": suggestion_dicts,
            "total_suggestions": len(suggestion_dicts),
            "message": "Resolution suggestions generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Resolution suggestion failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Resolution suggestion failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)