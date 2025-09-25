"""
Constraint Encoder for converting domain constraints to CSP format
"""

from typing import List, Dict, Any
import logging
from datetime import datetime, time

from models.optimization_models import ConstraintModel

logger = logging.getLogger(__name__)

class ConstraintEncoder:
    """
    Encodes domain-specific constraints into CSP-compatible format
    """
    
    def __init__(self):
        self.time_slots = []
        self.encoded_entities = {}
    
    def encode_constraints(self, constraints: List[ConstraintModel], entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Encode constraints and entities for CSP solver
        
        Args:
            constraints: List of domain constraints
            entities: Dictionary of entity lists (venues, lecturers, courses, etc.)
            
        Returns:
            Dictionary with encoded constraint data
        """
        try:
            # Generate time slots
            self.time_slots = self._generate_time_slots()
            
            # Encode entities
            self.encoded_entities = self._encode_entities(entities)
            
            # Encode constraints
            encoded_constraints = self._encode_constraint_list(constraints)
            
            return {
                "entities": self.encoded_entities,
                "time_slots": self.time_slots,
                "constraints": encoded_constraints,
                "metadata": {
                    "encoding_timestamp": datetime.now().isoformat(),
                    "total_constraints": len(constraints),
                    "total_time_slots": len(self.time_slots)
                }
            }
            
        except Exception as e:
            logger.error(f"Constraint encoding failed: {str(e)}")
            raise
    
    def _generate_time_slots(self) -> List[Dict[str, Any]]:
        """Generate available time slots for scheduling"""
        time_slots = []
        
        # Generate slots for Monday to Friday, 8 AM to 6 PM
        for day in range(5):  # Monday = 0, Friday = 4
            for hour in range(8, 18):  # 8 AM to 5 PM (6 PM exclusive)
                time_slots.append({
                    "id": f"slot_{day}_{hour}",
                    "day_of_week": day,
                    "hour": hour,
                    "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][day],
                    "time_display": f"{hour:02d}:00"
                })
        
        return time_slots
    
    def _encode_entities(self, entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
        """Encode entities with additional CSP-specific data"""
        encoded = {}
        
        # Encode venues
        if "venues" in entities:
            encoded["venues"] = []
            for venue in entities["venues"]:
                encoded_venue = venue.copy()
                encoded_venue["equipment"] = venue.get("equipment", [])
                encoded_venue["capacity"] = venue.get("capacity", 50)
                encoded["venues"].append(encoded_venue)
        
        # Encode lecturers
        if "lecturers" in entities:
            encoded["lecturers"] = []
            for lecturer in entities["lecturers"]:
                encoded_lecturer = lecturer.copy()
                # Ensure availability is properly formatted
                availability = lecturer.get("availability", {})
                encoded_lecturer["availability"] = self._normalize_availability(availability)
                encoded["lecturers"].append(encoded_lecturer)
        
        # Encode courses
        if "courses" in entities:
            encoded["courses"] = []
            for course in entities["courses"]:
                encoded_course = course.copy()
                encoded_course["duration"] = course.get("duration", 60)  # Default 60 minutes
                encoded_course["frequency"] = course.get("frequency", 1)  # Default 1 session per week
                encoded_course["required_equipment"] = course.get("required_equipment", [])
                encoded_course["student_groups"] = course.get("student_groups", [])
                encoded["courses"].append(encoded_course)
        
        # Encode student groups
        if "student_groups" in entities:
            encoded["student_groups"] = []
            for group in entities["student_groups"]:
                encoded_group = group.copy()
                encoded_group["size"] = group.get("size", 30)  # Default size
                encoded["student_groups"].append(encoded_group)
        
        return encoded
    
    def _normalize_availability(self, availability: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        """Normalize lecturer availability to consistent format"""
        normalized = {}
        
        # Handle different availability formats
        for day_key, day_availability in availability.items():
            day_num = self._parse_day_key(day_key)
            
            if isinstance(day_availability, list):
                # Already in correct format
                normalized[str(day_num)] = day_availability
            elif isinstance(day_availability, dict):
                # Convert single availability object to list
                normalized[str(day_num)] = [day_availability]
            else:
                # Default availability if format is unclear
                normalized[str(day_num)] = [{"start_hour": 8, "end_hour": 17}]
        
        # Ensure all weekdays have some availability entry
        for day in range(5):  # Monday to Friday
            if str(day) not in normalized:
                normalized[str(day)] = []  # No availability
        
        return normalized
    
    def _parse_day_key(self, day_key: str) -> int:
        """Parse day key to day number (0=Monday, 4=Friday)"""
        day_mapping = {
            "monday": 0, "mon": 0, "0": 0,
            "tuesday": 1, "tue": 1, "1": 1,
            "wednesday": 2, "wed": 2, "2": 2,
            "thursday": 3, "thu": 3, "3": 3,
            "friday": 4, "fri": 4, "4": 4
        }
        
        return day_mapping.get(day_key.lower(), 0)
    
    def _encode_constraint_list(self, constraints: List[ConstraintModel]) -> List[Dict[str, Any]]:
        """Encode list of constraints"""
        encoded_constraints = []
        
        for constraint in constraints:
            encoded_constraint = {
                "id": constraint.id,
                "type": constraint.type.value,
                "priority": constraint.priority.value,
                "entities": constraint.entities,
                "rule": constraint.rule,
                "weight": constraint.weight,
                "encoded_rule": self._encode_constraint_rule(constraint)
            }
            encoded_constraints.append(encoded_constraint)
        
        return encoded_constraints
    
    def _encode_constraint_rule(self, constraint: ConstraintModel) -> Dict[str, Any]:
        """Encode individual constraint rule for CSP"""
        encoded_rule = constraint.rule.copy()
        
        # Add constraint-type specific encoding
        if constraint.type.value == "hard_availability":
            encoded_rule["constraint_type"] = "availability"
            encoded_rule["is_hard"] = True
        elif constraint.type.value == "venue_capacity":
            encoded_rule["constraint_type"] = "capacity"
            encoded_rule["is_hard"] = True
        elif constraint.type.value == "equipment_requirement":
            encoded_rule["constraint_type"] = "equipment"
            encoded_rule["is_hard"] = True
        elif constraint.type.value == "lecturer_preference":
            encoded_rule["constraint_type"] = "preference"
            encoded_rule["is_hard"] = False
        else:
            encoded_rule["constraint_type"] = "general"
            encoded_rule["is_hard"] = constraint.priority.value in ["critical", "high"]
        
        return encoded_rule