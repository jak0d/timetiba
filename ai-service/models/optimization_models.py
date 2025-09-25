"""
Pydantic models for AI optimization service
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class ConstraintType(str, Enum):
    HARD_AVAILABILITY = "hard_availability"
    VENUE_CAPACITY = "venue_capacity"
    EQUIPMENT_REQUIREMENT = "equipment_requirement"
    LECTURER_PREFERENCE = "lecturer_preference"
    STUDENT_BREAK = "student_break"
    DEPARTMENT_POLICY = "department_policy"

class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EntityModel(BaseModel):
    """Base model for scheduling entities"""
    id: str
    name: str
    type: str

class VenueModel(EntityModel):
    """Venue entity model"""
    capacity: int
    equipment: List[str] = []
    availability: List[Dict[str, Any]] = []
    location: Optional[str] = None

class LecturerModel(EntityModel):
    """Lecturer entity model"""
    subjects: List[str] = []
    availability: Dict[str, Any] = {}
    preferences: Dict[str, Any] = {}
    max_hours_per_day: int = 8
    max_hours_per_week: int = 40

class CourseModel(EntityModel):
    """Course entity model"""
    duration: int  # minutes
    frequency: int  # sessions per week
    required_equipment: List[str] = []
    student_groups: List[str] = []
    lecturer_id: str

class StudentGroupModel(EntityModel):
    """Student group entity model"""
    size: int
    courses: List[str] = []
    year_level: int
    department: str

class ConstraintModel(BaseModel):
    """Constraint model for optimization"""
    id: str
    type: ConstraintType
    priority: Priority
    entities: List[str]
    rule: Dict[str, Any]
    weight: float = Field(default=1.0, ge=0.0, le=10.0)

class OptimizationParameters(BaseModel):
    """Parameters for optimization algorithm"""
    max_solve_time_seconds: int = Field(default=300, ge=1, le=3600)
    preference_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    efficiency_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    balance_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    allow_partial_solutions: bool = True

class OptimizationRequest(BaseModel):
    """Request model for timetable optimization"""
    entities: Dict[str, List[Dict[str, Any]]]
    constraints: List[ConstraintModel]
    optimization_parameters: OptimizationParameters = OptimizationParameters()
    existing_schedule: Optional[Dict[str, Any]] = None

class ScheduledSessionModel(BaseModel):
    """Model for a scheduled session"""
    id: str
    course_id: str
    lecturer_id: str
    venue_id: str
    student_groups: List[str]
    start_time: datetime
    end_time: datetime
    day_of_week: int  # 0=Monday, 6=Sunday

class SolutionModel(BaseModel):
    """Model for optimization solution"""
    sessions: List[ScheduledSessionModel]
    score: float
    is_feasible: bool
    conflicts: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}

class ValidationResult(BaseModel):
    """Result of solution validation"""
    is_valid: bool
    score: float
    conflicts: List[Dict[str, Any]] = []
    constraint_violations: List[Dict[str, Any]] = []

class OptimizationResponse(BaseModel):
    """Response model for optimization requests"""
    success: bool
    solution: Optional[SolutionModel] = None
    message: str
    conflicts: List[Dict[str, Any]] = []
    processing_time_seconds: Optional[float] = None