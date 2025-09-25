#!/usr/bin/env python3
"""
Demo script for the Conflict Resolution Suggestion Engine
Showcases the AI-powered conflict analysis and resolution capabilities
"""

import json
from datetime import datetime, timedelta
from services.conflict_analyzer import ConflictAnalyzer
from models.optimization_models import SolutionModel, ScheduledSessionModel


def create_demo_scenario():
    """Create a realistic demo scenario with various conflicts"""
    
    # Create sample sessions with conflicts
    sessions = [
        # Venue double-booking conflict
        ScheduledSessionModel(
            id="session_1",
            course_id="MATH101",
            lecturer_id="prof_smith",
            venue_id="room_a",
            student_groups=["group_1a"],
            start_time=datetime(2024, 1, 15, 9, 0),
            end_time=datetime(2024, 1, 15, 10, 0),
            day_of_week=0  # Monday
        ),
        ScheduledSessionModel(
            id="session_2",
            course_id="PHYS101",
            lecturer_id="prof_jones",
            venue_id="room_a",  # Same venue - conflict!
            student_groups=["group_1b"],
            start_time=datetime(2024, 1, 15, 9, 0),
            end_time=datetime(2024, 1, 15, 10, 0),
            day_of_week=0
        ),
        
        # Lecturer conflict
        ScheduledSessionModel(
            id="session_3",
            course_id="MATH201",
            lecturer_id="prof_smith",  # Same lecturer - conflict!
            venue_id="room_b",
            student_groups=["group_2a"],
            start_time=datetime(2024, 1, 15, 9, 0),
            end_time=datetime(2024, 1, 15, 10, 0),
            day_of_week=0
        ),
        
        # Student group overlap
        ScheduledSessionModel(
            id="session_4",
            course_id="CHEM101",
            lecturer_id="prof_brown",
            venue_id="room_c",
            student_groups=["group_1a"],  # Same group as session_1 - conflict!
            start_time=datetime(2024, 1, 15, 9, 0),
            end_time=datetime(2024, 1, 15, 10, 0),
            day_of_week=0
        ),
        
        # Capacity exceeded
        ScheduledSessionModel(
            id="session_5",
            course_id="BIO101",
            lecturer_id="prof_davis",
            venue_id="room_d",  # Small room with large groups
            student_groups=["group_3a", "group_3b", "group_3c"],
            start_time=datetime(2024, 1, 15, 10, 0),
            end_time=datetime(2024, 1, 15, 11, 0),
            day_of_week=0
        )
    ]
    
    # Create solution with conflicts
    solution = SolutionModel(
        sessions=sessions,
        score=0.4,
        is_feasible=False,
        conflicts=[],
        metadata={"generation_time": datetime.now().isoformat()}
    )
    
    # Define conflicts
    conflicts = [
        {
            'id': 'conflict_1',
            'type': 'venue_double_booking',
            'severity': 'high',
            'description': 'Room A is double-booked at 9:00 AM',
            'affected_entities': ['room_a', 'session_1', 'session_2'],
            'session_ids': ['session_1', 'session_2']
        },
        {
            'id': 'conflict_2',
            'type': 'lecturer_conflict',
            'severity': 'high',
            'description': 'Prof. Smith is scheduled in two places simultaneously',
            'affected_entities': ['prof_smith', 'session_1', 'session_3'],
            'session_ids': ['session_1', 'session_3']
        },
        {
            'id': 'conflict_3',
            'type': 'student_group_overlap',
            'severity': 'medium',
            'description': 'Group 1A has overlapping sessions',
            'affected_entities': ['group_1a', 'session_1', 'session_4'],
            'session_ids': ['session_1', 'session_4']
        },
        {
            'id': 'conflict_4',
            'type': 'capacity_exceeded',
            'severity': 'medium',
            'description': 'Room D capacity exceeded (75 students in 50-seat room)',
            'affected_entities': ['room_d', 'session_5'],
            'session_ids': ['session_5']
        }
    ]
    
    # Define entities
    entities = {
        'venues': [
            {
                'id': 'room_a',
                'name': 'Lecture Hall A',
                'capacity': 100,
                'equipment': ['projector', 'whiteboard', 'microphone']
            },
            {
                'id': 'room_b',
                'name': 'Classroom B',
                'capacity': 40,
                'equipment': ['whiteboard', 'computer']
            },
            {
                'id': 'room_c',
                'name': 'Lab C',
                'capacity': 30,
                'equipment': ['lab_equipment', 'projector']
            },
            {
                'id': 'room_d',
                'name': 'Small Seminar Room',
                'capacity': 50,
                'equipment': ['whiteboard']
            },
            {
                'id': 'room_e',
                'name': 'Large Auditorium',
                'capacity': 200,
                'equipment': ['projector', 'microphone', 'sound_system']
            }
        ],
        'lecturers': [
            {
                'id': 'prof_smith',
                'name': 'Dr. Sarah Smith',
                'subjects': ['mathematics', 'statistics'],
                'availability': {
                    'monday': {'available': True, 'preferred_times': ['10:00', '14:00']},
                    'tuesday': {'available': True},
                    'wednesday': {'available': True},
                    'thursday': {'available': True},
                    'friday': {'available': False}
                },
                'max_hours_per_week': 20
            },
            {
                'id': 'prof_jones',
                'name': 'Prof. Michael Jones',
                'subjects': ['physics', 'engineering'],
                'availability': {
                    'monday': {'available': True},
                    'tuesday': {'available': True, 'preferred_times': ['09:00', '11:00']},
                    'wednesday': {'available': True},
                    'thursday': {'available': False},
                    'friday': {'available': True}
                },
                'max_hours_per_week': 25
            },
            {
                'id': 'prof_brown',
                'name': 'Dr. Lisa Brown',
                'subjects': ['chemistry', 'biochemistry'],
                'availability': {
                    'monday': {'available': True},
                    'tuesday': {'available': True},
                    'wednesday': {'available': True, 'preferred_times': ['13:00', '15:00']},
                    'thursday': {'available': True},
                    'friday': {'available': True}
                },
                'max_hours_per_week': 22
            },
            {
                'id': 'prof_davis',
                'name': 'Dr. Robert Davis',
                'subjects': ['biology', 'ecology'],
                'availability': {
                    'monday': {'available': True, 'preferred_times': ['10:00', '12:00']},
                    'tuesday': {'available': True},
                    'wednesday': {'available': False},
                    'thursday': {'available': True},
                    'friday': {'available': True}
                },
                'max_hours_per_week': 18
            }
        ],
        'courses': [
            {
                'id': 'MATH101',
                'name': 'Introduction to Mathematics',
                'subjects': ['mathematics'],
                'required_equipment': ['whiteboard'],
                'lecturer_id': 'prof_smith'
            },
            {
                'id': 'MATH201',
                'name': 'Advanced Mathematics',
                'subjects': ['mathematics'],
                'required_equipment': ['whiteboard', 'projector'],
                'lecturer_id': 'prof_smith'
            },
            {
                'id': 'PHYS101',
                'name': 'Introduction to Physics',
                'subjects': ['physics'],
                'required_equipment': ['projector', 'lab_equipment'],
                'lecturer_id': 'prof_jones'
            },
            {
                'id': 'CHEM101',
                'name': 'General Chemistry',
                'subjects': ['chemistry'],
                'required_equipment': ['lab_equipment'],
                'lecturer_id': 'prof_brown'
            },
            {
                'id': 'BIO101',
                'name': 'Introduction to Biology',
                'subjects': ['biology'],
                'required_equipment': ['projector'],
                'lecturer_id': 'prof_davis'
            }
        ],
        'student_groups': [
            {'id': 'group_1a', 'name': 'First Year Group A', 'size': 25},
            {'id': 'group_1b', 'name': 'First Year Group B', 'size': 30},
            {'id': 'group_2a', 'name': 'Second Year Group A', 'size': 20},
            {'id': 'group_3a', 'name': 'Third Year Group A', 'size': 25},
            {'id': 'group_3b', 'name': 'Third Year Group B', 'size': 25},
            {'id': 'group_3c', 'name': 'Third Year Group C', 'size': 25}
        ]
    }
    
    return conflicts, solution, entities


def print_section_header(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")


def print_conflicts(conflicts):
    """Print conflict information"""
    print_section_header("DETECTED CONFLICTS")
    
    for i, conflict in enumerate(conflicts, 1):
        print(f"\n{i}. {conflict['description']}")
        print(f"   Type: {conflict['type']}")
        print(f"   Severity: {conflict['severity']}")
        print(f"   Affected: {', '.join(conflict['affected_entities'])}")


def print_analysis_results(analysis):
    """Print conflict analysis results"""
    print_section_header("CONFLICT ANALYSIS RESULTS")
    
    print(f"Total Conflicts: {analysis['total_conflicts']}")
    
    print(f"\nConflict Patterns Identified: {len(analysis['patterns'])}")
    for pattern in analysis['patterns']:
        print(f"  • {pattern['conflict_type']}: {pattern['frequency']} occurrences "
              f"(severity: {pattern['severity_score']:.2f})")
    
    print(f"\nMost Problematic Entities:")
    for entity in analysis['entity_analysis']['most_problematic_entities'][:3]:
        print(f"  • {entity['entity_id']}: {entity['conflict_count']} conflicts "
              f"({', '.join(entity['conflict_types'])})")
    
    print(f"\nRoot Causes Identified: {len(analysis['root_causes'])}")
    for cause in analysis['root_causes']:
        print(f"  • {cause['type']} ({cause['severity']}): {cause['description']}")
        print(f"    Recommendation: {cause['recommendation']}")
    
    print(f"\nHigh-Level Recommendations:")
    for rec in analysis['recommendations']:
        print(f"  • {rec}")


def print_resolution_suggestions(suggestions):
    """Print resolution suggestions"""
    print_section_header("AI-GENERATED RESOLUTION SUGGESTIONS")
    
    if not suggestions:
        print("No resolution suggestions generated.")
        return
    
    for i, suggestion in enumerate(suggestions, 1):
        print(f"\n{i}. {suggestion.description}")
        print(f"   Resolution Type: {suggestion.resolution_type}")
        print(f"   Score: {suggestion.score:.2f}")
        print(f"   Confidence: {suggestion.confidence:.2f}")
        print(f"   Effort Level: {suggestion.effort_level}")
        print(f"   Impact: {suggestion.impact_description}")
        print(f"   Affected Sessions: {', '.join(suggestion.affected_sessions)}")
        
        if suggestion.parameters:
            print(f"   Parameters:")
            for key, value in suggestion.parameters.items():
                print(f"     - {key}: {value}")


def print_suggestion_evaluation(suggestion, evaluation):
    """Print detailed suggestion evaluation"""
    print_section_header(f"DETAILED EVALUATION: {suggestion.description}")
    
    print(f"Overall Score: {evaluation['overall_score']:.2f}")
    print(f"Confidence: {evaluation['confidence']:.2f}")
    print(f"Feasibility Score: {evaluation['feasibility_score']:.2f}")
    print(f"Impact Score: {evaluation['impact_score']:.2f}")
    print(f"Effort Score: {evaluation['effort_score']:.2f}")
    print(f"Recommendation: {evaluation['recommendation'].upper()}")
    
    risk = evaluation['risk_assessment']
    print(f"\nRisk Assessment: {risk['level'].upper()}")
    if risk['factors']:
        print("Risk Factors:")
        for factor in risk['factors']:
            print(f"  • {factor}")
    
    if risk['mitigation_suggestions']:
        print("Mitigation Suggestions:")
        for mitigation in risk['mitigation_suggestions']:
            print(f"  • {mitigation}")


def print_alternative_paths(alternatives):
    """Print alternative resolution paths"""
    print_section_header("ALTERNATIVE RESOLUTION PATHS")
    
    for i, alternative in enumerate(alternatives, 1):
        print(f"\nPath {i}: ({len(alternative)} suggestions)")
        for j, suggestion in enumerate(alternative, 1):
            print(f"  {j}. {suggestion.description} (Score: {suggestion.score:.2f}, "
                  f"Effort: {suggestion.effort_level})")


def main():
    """Main demo function"""
    print("🤖 AI Timetabler - Conflict Resolution Suggestion Engine Demo")
    print("=" * 60)
    
    # Create demo scenario
    conflicts, solution, entities = create_demo_scenario()
    
    # Initialize conflict analyzer
    analyzer = ConflictAnalyzer()
    
    # Print initial conflicts
    print_conflicts(conflicts)
    
    # Analyze conflicts
    print("\n🔍 Analyzing conflicts and identifying patterns...")
    analysis = analyzer.analyze_conflicts(conflicts, solution, entities)
    print_analysis_results(analysis)
    
    # Generate resolution suggestions
    print("\n🧠 Generating AI-powered resolution suggestions...")
    suggestions = analyzer.generate_resolution_suggestions(
        conflicts, solution, entities, max_suggestions=5
    )
    print_resolution_suggestions(suggestions)
    
    # Evaluate top suggestion in detail
    if suggestions:
        print("\n📊 Detailed evaluation of top suggestion...")
        top_suggestion = suggestions[0]
        evaluation = analyzer.evaluate_suggestion_quality(
            top_suggestion, conflicts, solution, entities
        )
        print_suggestion_evaluation(top_suggestion, evaluation)
    
    # Generate alternative paths
    print("\n🔀 Generating alternative resolution paths...")
    alternatives = analyzer.generate_multiple_alternatives(
        conflicts, solution, entities, num_alternatives=3
    )
    print_alternative_paths(alternatives)
    
    # Performance demonstration
    print_section_header("PERFORMANCE METRICS")
    import time
    
    start_time = time.time()
    for _ in range(10):
        analyzer.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=3)
    end_time = time.time()
    
    avg_time = (end_time - start_time) / 10
    print(f"Average suggestion generation time: {avg_time:.3f} seconds")
    print(f"Suggestions per second: {1/avg_time:.1f}")
    
    print_section_header("DEMO COMPLETE")
    print("The Conflict Resolution Suggestion Engine successfully:")
    print("✅ Analyzed complex scheduling conflicts")
    print("✅ Identified recurring patterns and root causes")
    print("✅ Generated intelligent resolution suggestions")
    print("✅ Ranked suggestions by quality and feasibility")
    print("✅ Provided detailed risk assessments")
    print("✅ Created multiple alternative resolution paths")
    print("✅ Demonstrated high-performance processing")


if __name__ == "__main__":
    main()