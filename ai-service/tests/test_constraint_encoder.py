"""
Unit tests for Constraint Encoder
"""

import pytest
from datetime import datetime

from services.constraint_encoder import ConstraintEncoder
from models.optimization_models import ConstraintModel, ConstraintType, Priority

class TestConstraintEncoder:
    
    def setup_method(self):
        """Set up test fixtures"""
        self.encoder = ConstraintEncoder()
        self.sample_entities = {
            "venues": [
                {
                    "id": "v1",
                    "name": "Room A",
                    "capacity": 50,
                    "equipment": ["projector", "whiteboard"]
                },
                {
                    "id": "v2", 
                    "name": "Room B",
                    "capacity": 30,
                    "equipment": ["computer"]
                }
            ],
            "lecturers": [
                {
                    "id": "l1",
                    "name": "Dr. Smith",
                    "availability": {
                        "monday": [{"start_hour": 9, "end_hour": 17}],
                        "tuesday": [{"start_hour": 10, "end_hour": 16}]
                    }
                }
            ],
            "courses": [
                {
                    "id": "c1",
                    "name": "Math 101",
                    "duration": 60,
                    "frequency": 2,
                    "required_equipment": ["projector"],
                    "student_groups": ["g1"]
                }
            ],
            "student_groups": [
                {
                    "id": "g1",
                    "name": "Group 1", 
                    "size": 25
                }
            ]
        }
        
        self.sample_constraints = [
            ConstraintModel(
                id="c1",
                type=ConstraintType.HARD_AVAILABILITY,
                priority=Priority.CRITICAL,
                entities=["l1"],
                rule={"lecturer_id": "l1", "available_times": ["monday_9", "tuesday_10"]},
                weight=1.0
            ),
            ConstraintModel(
                id="c2",
                type=ConstraintType.VENUE_CAPACITY,
                priority=Priority.HIGH,
                entities=["v1", "c1"],
                rule={"venue_id": "v1", "min_capacity": 25},
                weight=0.9
            )
        ]
    
    def test_encoder_initialization(self):
        """Test encoder initializes correctly"""
        assert self.encoder.time_slots == []
        assert self.encoder.encoded_entities == {}
    
    def test_generate_time_slots(self):
        """Test time slot generation"""
        time_slots = self.encoder._generate_time_slots()
        
        # Should generate slots for Monday-Friday, 8 AM - 5 PM
        expected_slots = 5 * 10  # 5 days * 10 hours
        assert len(time_slots) == expected_slots
        
        # Check first slot
        first_slot = time_slots[0]
        assert first_slot["day_of_week"] == 0  # Monday
        assert first_slot["hour"] == 8
        assert first_slot["day_name"] == "Monday"
        assert first_slot["time_display"] == "08:00"
        
        # Check last slot
        last_slot = time_slots[-1]
        assert last_slot["day_of_week"] == 4  # Friday
        assert last_slot["hour"] == 17
        assert last_slot["day_name"] == "Friday"
    
    def test_encode_entities_venues(self):
        """Test venue encoding"""
        encoded = self.encoder._encode_entities({"venues": self.sample_entities["venues"]})
        
        assert "venues" in encoded
        assert len(encoded["venues"]) == 2
        
        venue1 = encoded["venues"][0]
        assert venue1["id"] == "v1"
        assert venue1["capacity"] == 50
        assert "projector" in venue1["equipment"]
    
    def test_encode_entities_lecturers(self):
        """Test lecturer encoding with availability normalization"""
        encoded = self.encoder._encode_entities({"lecturers": self.sample_entities["lecturers"]})
        
        assert "lecturers" in encoded
        lecturer = encoded["lecturers"][0]
        
        # Check availability normalization
        availability = lecturer["availability"]
        assert "0" in availability  # Monday
        assert "1" in availability  # Tuesday
        assert isinstance(availability["0"], list)
        assert availability["0"][0]["start_hour"] == 9
    
    def test_encode_entities_courses(self):
        """Test course encoding"""
        encoded = self.encoder._encode_entities({"courses": self.sample_entities["courses"]})
        
        assert "courses" in encoded
        course = encoded["courses"][0]
        
        assert course["duration"] == 60
        assert course["frequency"] == 2
        assert "projector" in course["required_equipment"]
        assert "g1" in course["student_groups"]
    
    def test_encode_entities_student_groups(self):
        """Test student group encoding"""
        encoded = self.encoder._encode_entities({"student_groups": self.sample_entities["student_groups"]})
        
        assert "student_groups" in encoded
        group = encoded["student_groups"][0]
        
        assert group["size"] == 25
        assert group["id"] == "g1"
    
    def test_normalize_availability_dict_format(self):
        """Test availability normalization from dict format"""
        availability = {
            "monday": {"start_hour": 9, "end_hour": 17},
            "tuesday": [{"start_hour": 10, "end_hour": 16}]
        }
        
        normalized = self.encoder._normalize_availability(availability)
        
        assert "0" in normalized  # Monday
        assert "1" in normalized  # Tuesday
        assert isinstance(normalized["0"], list)
        assert normalized["0"][0]["start_hour"] == 9
        assert normalized["1"][0]["start_hour"] == 10
    
    def test_normalize_availability_missing_days(self):
        """Test availability normalization fills missing days"""
        availability = {"monday": [{"start_hour": 9, "end_hour": 17}]}
        
        normalized = self.encoder._normalize_availability(availability)
        
        # Should have entries for all weekdays
        for day in range(5):
            assert str(day) in normalized
        
        # Monday should have availability
        assert len(normalized["0"]) == 1
        
        # Other days should be empty
        assert len(normalized["1"]) == 0
    
    def test_parse_day_key(self):
        """Test day key parsing"""
        assert self.encoder._parse_day_key("monday") == 0
        assert self.encoder._parse_day_key("Monday") == 0
        assert self.encoder._parse_day_key("mon") == 0
        assert self.encoder._parse_day_key("0") == 0
        
        assert self.encoder._parse_day_key("friday") == 4
        assert self.encoder._parse_day_key("fri") == 4
        assert self.encoder._parse_day_key("4") == 4
        
        # Invalid key should default to 0
        assert self.encoder._parse_day_key("invalid") == 0
    
    def test_encode_constraint_list(self):
        """Test constraint list encoding"""
        encoded_constraints = self.encoder._encode_constraint_list(self.sample_constraints)
        
        assert len(encoded_constraints) == 2
        
        constraint1 = encoded_constraints[0]
        assert constraint1["id"] == "c1"
        assert constraint1["type"] == "hard_availability"
        assert constraint1["priority"] == "critical"
        assert constraint1["weight"] == 1.0
        assert "encoded_rule" in constraint1
    
    def test_encode_constraint_rule_hard_availability(self):
        """Test encoding of hard availability constraint"""
        constraint = self.sample_constraints[0]  # hard_availability
        encoded_rule = self.encoder._encode_constraint_rule(constraint)
        
        assert encoded_rule["constraint_type"] == "availability"
        assert encoded_rule["is_hard"] is True
        assert encoded_rule["lecturer_id"] == "l1"
    
    def test_encode_constraint_rule_venue_capacity(self):
        """Test encoding of venue capacity constraint"""
        constraint = self.sample_constraints[1]  # venue_capacity
        encoded_rule = self.encoder._encode_constraint_rule(constraint)
        
        assert encoded_rule["constraint_type"] == "capacity"
        assert encoded_rule["is_hard"] is True
        assert encoded_rule["venue_id"] == "v1"
    
    def test_encode_constraint_rule_preference(self):
        """Test encoding of preference constraint"""
        preference_constraint = ConstraintModel(
            id="p1",
            type=ConstraintType.LECTURER_PREFERENCE,
            priority=Priority.MEDIUM,
            entities=["l1"],
            rule={"preferred_times": ["morning"]},
            weight=0.5
        )
        
        encoded_rule = self.encoder._encode_constraint_rule(preference_constraint)
        
        assert encoded_rule["constraint_type"] == "preference"
        assert encoded_rule["is_hard"] is False
    
    def test_encode_constraints_full_workflow(self):
        """Test complete constraint encoding workflow"""
        result = self.encoder.encode_constraints(self.sample_constraints, self.sample_entities)
        
        # Check structure
        assert "entities" in result
        assert "time_slots" in result
        assert "constraints" in result
        assert "metadata" in result
        
        # Check entities
        assert "venues" in result["entities"]
        assert "lecturers" in result["entities"]
        assert "courses" in result["entities"]
        assert "student_groups" in result["entities"]
        
        # Check time slots
        assert len(result["time_slots"]) == 50  # 5 days * 10 hours
        
        # Check constraints
        assert len(result["constraints"]) == 2
        
        # Check metadata
        metadata = result["metadata"]
        assert "encoding_timestamp" in metadata
        assert metadata["total_constraints"] == 2
        assert metadata["total_time_slots"] == 50

if __name__ == "__main__":
    pytest.main([__file__])