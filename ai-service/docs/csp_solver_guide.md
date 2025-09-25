# CSP Solver Implementation Guide

## Overview

The Constraint Satisfaction Problem (CSP) solver is the core component of the AI Timetabling system, responsible for generating optimal schedules while satisfying complex constraints. This implementation uses Google OR-Tools CP-SAT solver to handle both hard and soft constraints efficiently.

## Architecture

### Core Components

1. **CSPSolver** (`services/csp_solver.py`)
   - Main solver class using OR-Tools CP-SAT
   - Handles variable creation, constraint encoding, and optimization
   - Provides solution validation and scoring

2. **ConstraintEncoder** (`services/constraint_encoder.py`)
   - Converts domain-specific constraints to CSP format
   - Normalizes entity data and generates time slots
   - Encodes constraint rules for solver consumption

3. **Data Models** (`models/optimization_models.py`)
   - Pydantic models for type safety and validation
   - Request/response structures for API communication
   - Constraint and solution representations

## Constraint Types

### Hard Constraints (Must be satisfied)

#### 1. Venue Capacity Constraints
- **Purpose**: Ensure venue capacity is not exceeded by student group sizes
- **Implementation**: For each session, check that assigned venue capacity ≥ total students
- **Violation**: Prevents timetable generation if violated

```python
# Example: Course with 40 students cannot be assigned to venue with capacity 30
if total_students > venue_capacity:
    model.Add(variables["venue"] != venue_idx)
```

#### 2. Lecturer Availability Constraints
- **Purpose**: Respect lecturer availability windows
- **Implementation**: Check lecturer availability for each time slot
- **Violation**: Lecturer cannot be assigned outside available hours

```python
# Example: Lecturer not available Tuesday 8 AM
if not is_available:
    model.AddBoolOr([lecturer_selected.Not(), time_selected.Not()])
```

#### 3. No Double Booking Constraints
- **Purpose**: Prevent resource conflicts (venues, lecturers)
- **Implementation**: Ensure no two sessions use same resource at same time
- **Violation**: Creates scheduling conflicts

```python
# Example: Same venue cannot host two sessions simultaneously
model.Add(venue_time_conflict == 0)  # Prevent this conflict
```

#### 4. Equipment Requirements
- **Purpose**: Match course equipment needs with venue capabilities
- **Implementation**: Check venue equipment against course requirements
- **Violation**: Course cannot be scheduled in inadequate venue

```python
# Example: Programming course needs computers
if not has_all_equipment:
    model.Add(variables["venue"] != venue_idx)
```

### Soft Constraints (Optimization objectives)

#### 1. Lecturer Preferences
- **Purpose**: Optimize lecturer satisfaction by respecting preferences
- **Weight**: Configurable (default: 30%)
- **Scoring**: Higher score for preferred time slots

```python
# Example: Lecturer prefers Monday 9 AM
if time_key in preferred_times:
    preference_satisfaction_vars[key] = pref_var
```

#### 2. Efficiency Optimization
- **Purpose**: Minimize gaps and maximize resource utilization
- **Weight**: Configurable (default: 40%)
- **Scoring**: Bonus for consecutive sessions, optimal utilization

```python
# Example: Consecutive sessions reduce gaps
model.AddBoolAnd([has_current, has_next]).OnlyEnforceIf(eff_var)
```

#### 3. Workload Balance
- **Purpose**: Distribute teaching load evenly among lecturers
- **Weight**: Configurable (default: 30%)
- **Scoring**: Penalize extreme workload imbalances

```python
# Example: Lecturer workload within 50-80% of capacity
model.Add(total_sessions >= min_sessions).OnlyEnforceIf(balance_var)
model.Add(total_sessions <= max_sessions_balanced).OnlyEnforceIf(balance_var)
```

#### 4. Student Convenience
- **Purpose**: Minimize travel time and gaps for student groups
- **Implementation**: Group sessions by student groups, minimize gaps
- **Scoring**: Lower gaps result in higher scores

## Solution Validation

### Validation Metrics

1. **Hard Constraint Compliance** (40% weight)
   - Venue capacity violations
   - Lecturer availability violations
   - Double booking conflicts
   - Equipment requirement violations

2. **Venue Utilization** (15% weight)
   - Balance across available venues
   - Avoid overuse and underuse
   - Optimal utilization: 60-80% of capacity

3. **Lecturer Satisfaction** (20% weight)
   - Preference satisfaction rate
   - Workload distribution balance
   - Availability compliance

4. **Student Convenience** (15% weight)
   - Gap minimization between sessions
   - Travel time optimization
   - Schedule compactness

5. **Overall Efficiency** (10% weight)
   - Time slot utilization rate
   - Resource allocation efficiency
   - Schedule optimization

### Scoring Algorithm

```python
overall_score = (
    hard_constraints * 0.4 +
    venue_utilization * 0.15 +
    lecturer_satisfaction * 0.2 +
    student_convenience * 0.15 +
    overall_efficiency * 0.1
)
```

## Usage Examples

### Basic Optimization Request

```python
from services.csp_solver import CSPSolver
from services.constraint_encoder import ConstraintEncoder

# Initialize components
solver = CSPSolver()
encoder = ConstraintEncoder()

# Encode constraints
encoded_constraints = encoder.encode_constraints(constraints, entities)

# Solve optimization problem
solution = solver.solve(encoded_constraints, optimization_params)

# Validate solution
validation_result = solver.validate_solution(solution)
```

### Custom Optimization Parameters

```python
from models.optimization_models import OptimizationParameters

params = OptimizationParameters(
    max_solve_time_seconds=300,  # 5 minutes max
    preference_weight=0.4,       # Prioritize preferences
    efficiency_weight=0.3,       # Moderate efficiency focus
    balance_weight=0.3,          # Moderate balance focus
    allow_partial_solutions=True # Accept partial solutions if needed
)

solution = solver.solve(encoded_constraints, params)
```

### Constraint Definition

```python
from models.optimization_models import ConstraintModel, ConstraintType, Priority

# Hard availability constraint
availability_constraint = ConstraintModel(
    id="lecturer_availability",
    type=ConstraintType.HARD_AVAILABILITY,
    priority=Priority.CRITICAL,
    entities=["lecturer_1"],
    rule={"lecturer_id": "lecturer_1", "enforce_availability": True},
    weight=1.0
)

# Soft preference constraint
preference_constraint = ConstraintModel(
    id="lecturer_preferences",
    type=ConstraintType.LECTURER_PREFERENCE,
    priority=Priority.MEDIUM,
    entities=["lecturer_1"],
    rule={"preferred_times": ["monday_9", "wednesday_14"]},
    weight=0.7
)
```

## Performance Optimization

### Solver Configuration

1. **Time Limits**: Set appropriate solving time limits based on problem size
2. **Parallel Processing**: OR-Tools automatically uses multiple cores
3. **Memory Management**: Large problems may require memory optimization

### Problem Size Guidelines

- **Small**: < 50 sessions, < 10 lecturers, < 20 venues
- **Medium**: 50-200 sessions, 10-30 lecturers, 20-50 venues  
- **Large**: 200+ sessions, 30+ lecturers, 50+ venues

### Optimization Tips

1. **Constraint Ordering**: Place hard constraints first
2. **Variable Domains**: Minimize variable domain sizes when possible
3. **Symmetry Breaking**: Add constraints to reduce symmetric solutions
4. **Preprocessing**: Filter infeasible combinations early

## Error Handling

### Common Issues

1. **Infeasible Problems**
   - **Cause**: Conflicting hard constraints
   - **Solution**: Analyze conflicts, relax constraints, or add resources

2. **Timeout Issues**
   - **Cause**: Problem too complex for time limit
   - **Solution**: Increase time limit or simplify problem

3. **Memory Issues**
   - **Cause**: Too many variables/constraints
   - **Solution**: Problem decomposition or constraint reduction

### Debugging Tools

1. **Conflict Analysis**: Identify conflicting constraints
2. **Solution Validation**: Detailed constraint violation reports
3. **Performance Metrics**: Solving time and memory usage tracking

## Integration with Main System

### API Endpoints

- `POST /optimize`: Main optimization endpoint
- `POST /validate`: Solution validation endpoint
- `GET /health`: Solver availability check

### Data Flow

1. **Input**: Entities (venues, lecturers, courses) + Constraints
2. **Encoding**: Convert to CSP format
3. **Solving**: Generate optimal solution
4. **Validation**: Verify solution quality
5. **Output**: Scheduled sessions with scores

### Error Responses

```json
{
  "success": false,
  "solution": null,
  "message": "No feasible solution found",
  "conflicts": [
    {
      "type": "capacity_conflict",
      "message": "Venue capacity insufficient",
      "entities": ["venue_1", "course_1"]
    }
  ]
}
```

## Testing

### Test Coverage

- **Unit Tests**: Individual constraint types and scoring functions
- **Integration Tests**: Complete optimization workflows
- **Performance Tests**: Large-scale problem solving
- **Validation Tests**: Solution quality verification

### Test Data

- **Synthetic Problems**: Generated test cases with known solutions
- **Real-world Scenarios**: Actual university timetabling problems
- **Edge Cases**: Boundary conditions and error scenarios

## Future Enhancements

### Planned Features

1. **Multi-objective Optimization**: Pareto-optimal solutions
2. **Dynamic Constraints**: Time-dependent constraint handling
3. **Machine Learning Integration**: Learning from historical solutions
4. **Distributed Solving**: Large-scale problem decomposition

### Performance Improvements

1. **Constraint Learning**: Automatic constraint discovery
2. **Heuristic Guidance**: Problem-specific solving strategies
3. **Incremental Solving**: Efficient solution updates
4. **Parallel Constraint Processing**: Multi-threaded constraint evaluation

## References

- [OR-Tools Documentation](https://developers.google.com/optimization)
- [CP-SAT Solver Guide](https://developers.google.com/optimization/cp/cp_solver)
- [Constraint Programming Principles](https://en.wikipedia.org/wiki/Constraint_programming)
- [Timetabling Problem Research](https://www.sciencedirect.com/topics/computer-science/timetabling-problem)