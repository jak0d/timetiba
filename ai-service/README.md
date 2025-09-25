# AI Timetabling Optimization Service

A FastAPI-based microservice that provides constraint satisfaction problem (CSP) solving for academic timetabling optimization using OR-Tools.

## Features

- **Constraint Satisfaction Problem Solving**: Uses OR-Tools CP-SAT solver for timetabling optimization
- **RESTful API**: FastAPI-based service with automatic OpenAPI documentation
- **Constraint Encoding**: Converts domain-specific constraints to CSP format
- **Solution Validation**: Validates timetable solutions against constraints
- **Health Monitoring**: Built-in health checks and service monitoring

## Installation

### Prerequisites

- Python 3.11+
- pip or poetry for dependency management

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

3. Access the API documentation:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

### Docker

1. Build the image:
```bash
docker build -t ai-timetabler .
```

2. Run the container:
```bash
docker run -p 8001:8001 ai-timetabler
```

## API Endpoints

### Health Check
- `GET /` - Basic service information
- `GET /health` - Detailed health check with service status

### Optimization
- `POST /optimize` - Optimize timetable using CSP solver
- `POST /validate` - Validate a timetable solution

## Usage Example

```python
import requests

# Optimization request
request_data = {
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
    ]
}

response = requests.post("http://localhost:8001/optimize", json=request_data)
result = response.json()
```

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_csp_solver.py
```

## Architecture

The service consists of several key components:

- **FastAPI Application** (`main.py`): REST API endpoints and request handling
- **CSP Solver** (`services/csp_solver.py`): OR-Tools based constraint satisfaction solver
- **Constraint Encoder** (`services/constraint_encoder.py`): Converts domain constraints to CSP format
- **Data Models** (`models/optimization_models.py`): Pydantic models for request/response validation

## Configuration

The service can be configured through environment variables:

- `LOG_LEVEL`: Logging level (default: INFO)
- `MAX_SOLVE_TIME`: Default maximum solve time in seconds (default: 300)
- `CORS_ORIGINS`: Allowed CORS origins (default: *)

## Development

### Adding New Constraints

1. Add constraint type to `ConstraintType` enum in `models/optimization_models.py`
2. Implement constraint encoding in `services/constraint_encoder.py`
3. Add constraint handling in `services/csp_solver.py`
4. Write tests for the new constraint type

### Performance Tuning

The OR-Tools solver can be tuned through various parameters:
- `max_time_in_seconds`: Maximum solving time
- `num_search_workers`: Number of parallel search workers
- `log_search_progress`: Enable search progress logging

## License

This project is part of the AI Timetabler system.