#!/usr/bin/env python3
"""
Integration test script for AI Optimization Service
Run this to test the service manually
"""

import requests
import json
import time
import subprocess
import sys
from typing import Dict, Any

def start_service():
    """Start the FastAPI service in background"""
    print("Starting AI Optimization Service...")
    process = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "main:app", 
        "--host", "0.0.0.0", "--port", "8001"
    ])
    
    # Wait for service to start
    time.sleep(3)
    
    return process

def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_optimization():
    """Test optimization endpoint"""
    print("\n=== Testing Optimization ===")
    
    request_data = {
        "entities": {
            "venues": [
                {
                    "id": "v1",
                    "name": "Room A",
                    "capacity": 50,
                    "equipment": ["projector"]
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
            "max_solve_time_seconds": 30,
            "preference_weight": 0.3,
            "efficiency_weight": 0.4,
            "balance_weight": 0.3,
            "allow_partial_solutions": True
        }
    }
    
    try:
        response = requests.post(
            "http://localhost:8001/optimize", 
            json=request_data,
            timeout=60
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result['success']}")
            print(f"Message: {result['message']}")
            
            if result['success'] and result['solution']:
                sessions = result['solution']['sessions']
                print(f"Generated {len(sessions)} sessions:")
                for session in sessions:
                    print(f"  - {session['id']}: Course {session['course_id']} "
                          f"in {session['venue_id']} with {session['lecturer_id']}")
            elif result['conflicts']:
                print(f"Conflicts found: {len(result['conflicts'])}")
                for conflict in result['conflicts']:
                    print(f"  - {conflict}")
        else:
            print(f"Error: {response.text}")
            
        return response.status_code == 200
        
    except Exception as e:
        print(f"Optimization test failed: {e}")
        return False

def main():
    """Run integration tests"""
    print("AI Optimization Service Integration Test")
    print("=" * 50)
    
    # Start service
    service_process = None
    try:
        service_process = start_service()
        
        # Run tests
        health_ok = test_health_check()
        optimization_ok = test_optimization()
        
        # Summary
        print("\n=== Test Summary ===")
        print(f"Health Check: {'PASS' if health_ok else 'FAIL'}")
        print(f"Optimization: {'PASS' if optimization_ok else 'FAIL'}")
        
        if health_ok and optimization_ok:
            print("\n✅ All tests passed! Service is working correctly.")
            return 0
        else:
            print("\n❌ Some tests failed. Check the output above.")
            return 1
            
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        return 1
    finally:
        if service_process:
            print("\nStopping service...")
            service_process.terminate()
            service_process.wait()

if __name__ == "__main__":
    exit(main())