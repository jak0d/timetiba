"""
Conflict Resolution Suggestion Engine
Analyzes scheduling clashes and generates intelligent resolution suggestions
"""

from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import itertools

from models.optimization_models import (
    SolutionModel,
    ScheduledSessionModel,
    VenueModel,
    LecturerModel,
    CourseModel,
    StudentGroupModel,
    OptimizationParameters
)

logger = logging.getLogger(__name__)

class ConflictPattern:
    """Represents a pattern of conflicts for analysis"""
    
    def __init__(self, conflict_type: str, frequency: int, entities: List[str]):
        self.conflict_type = conflict_type
        self.frequency = frequency
        self.entities = entities
        self.severity_score = self._calculate_severity()
    
    def _calculate_severity(self) -> float:
        """Calculate severity score based on frequency and impact"""
        base_score = min(self.frequency / 10.0, 1.0)  # Normalize frequency
        entity_impact = len(self.entities) / 20.0  # More entities = higher impact
        return min(base_score + entity_impact, 1.0)

class ResolutionSuggestion:
    """Represents a suggested resolution for conflicts"""
    
    def __init__(self, 
                 resolution_id: str,
                 description: str,
                 resolution_type: str,
                 affected_sessions: List[str],
                 parameters: Dict[str, Any],
                 score: float,
                 effort_level: str,
                 impact_description: str):
        self.resolution_id = resolution_id
        self.description = description
        self.resolution_type = resolution_type
        self.affected_sessions = affected_sessions
        self.parameters = parameters
        self.score = score
        self.effort_level = effort_level
        self.impact_description = impact_description
        self.confidence = self._calculate_confidence()
    
    def _calculate_confidence(self) -> float:
        """Calculate confidence in this resolution"""
        # Higher score and lower effort = higher confidence
        effort_penalty = {'low': 0.0, 'medium': 0.1, 'high': 0.2}.get(self.effort_level, 0.2)
        return max(0.0, min(1.0, self.score - effort_penalty))

class ConflictAnalyzer:
    """
    Analyzes scheduling conflicts and generates intelligent resolution suggestions
    """
    
    def __init__(self):
        self.conflict_patterns = []
        self.resolution_history = []
        self.entity_preferences = {}
    
    def analyze_conflicts(self, 
                         conflicts: List[Dict[str, Any]], 
                         solution: SolutionModel,
                         entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Analyze conflicts and identify patterns
        
        Args:
            conflicts: List of detected conflicts
            solution: Current solution with conflicts
            entities: All scheduling entities
            
        Returns:
            Analysis results with patterns and insights
        """
        logger.info(f"Analyzing {len(conflicts)} conflicts")
        
        # Identify conflict patterns
        patterns = self._identify_conflict_patterns(conflicts)
        
        # Analyze entity involvement
        entity_analysis = self._analyze_entity_involvement(conflicts, entities)
        
        # Identify root causes
        root_causes = self._identify_root_causes(conflicts, solution, entities)
        
        # Calculate conflict severity distribution
        severity_distribution = self._calculate_severity_distribution(conflicts)
        
        analysis_result = {
            'total_conflicts': len(conflicts),
            'patterns': [self._pattern_to_dict(p) for p in patterns],
            'entity_analysis': entity_analysis,
            'root_causes': root_causes,
            'severity_distribution': severity_distribution,
            'recommendations': self._generate_analysis_recommendations(patterns, root_causes)
        }
        
        logger.info(f"Analysis complete: {len(patterns)} patterns identified")
        return analysis_result
    
    def generate_resolution_suggestions(self,
                                      conflicts: List[Dict[str, Any]],
                                      solution: SolutionModel,
                                      entities: Dict[str, List[Dict[str, Any]]],
                                      max_suggestions: int = 5) -> List[ResolutionSuggestion]:
        """
        Generate ranked resolution suggestions for conflicts
        
        Args:
            conflicts: List of conflicts to resolve
            solution: Current solution
            entities: All scheduling entities
            max_suggestions: Maximum number of suggestions to return
            
        Returns:
            List of ranked resolution suggestions
        """
        logger.info(f"Generating resolution suggestions for {len(conflicts)} conflicts")
        
        all_suggestions = []
        
        # Group conflicts by type for more efficient resolution
        conflicts_by_type = self._group_conflicts_by_type(conflicts)
        
        for conflict_type, type_conflicts in conflicts_by_type.items():
            if conflict_type == 'venue_double_booking':
                suggestions = self._generate_venue_conflict_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'lecturer_conflict':
                suggestions = self._generate_lecturer_conflict_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'student_group_overlap':
                suggestions = self._generate_student_group_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'capacity_exceeded':
                suggestions = self._generate_capacity_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'equipment_conflict':
                suggestions = self._generate_equipment_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'availability_violation':
                suggestions = self._generate_availability_resolutions(type_conflicts, solution, entities)
            else:
                suggestions = self._generate_generic_resolutions(type_conflicts, solution, entities)
            
            all_suggestions.extend(suggestions)
        
        # Rank and filter suggestions
        ranked_suggestions = self._rank_suggestions(all_suggestions, conflicts, solution)
        
        # Return top suggestions
        top_suggestions = ranked_suggestions[:max_suggestions]
        
        logger.info(f"Generated {len(top_suggestions)} top-ranked suggestions")
        return top_suggestions
    
    def _identify_conflict_patterns(self, conflicts: List[Dict[str, Any]]) -> List[ConflictPattern]:
        """Identify recurring patterns in conflicts"""
        patterns = []
        
        # Group conflicts by type
        type_counts = Counter(conflict.get('type', 'unknown') for conflict in conflicts)
        
        # Group conflicts by entities
        entity_conflicts = defaultdict(list)
        for conflict in conflicts:
            for entity in conflict.get('affected_entities', []):
                entity_conflicts[entity].append(conflict)
        
        # Create patterns for frequent conflict types
        for conflict_type, count in type_counts.items():
            if count >= 2:  # Pattern threshold
                involved_entities = []
                for conflict in conflicts:
                    if conflict.get('type') == conflict_type:
                        involved_entities.extend(conflict.get('affected_entities', []))
                
                pattern = ConflictPattern(conflict_type, count, list(set(involved_entities)))
                patterns.append(pattern)
        
        # Create patterns for entities with multiple conflicts
        for entity, entity_conflict_list in entity_conflicts.items():
            if len(entity_conflict_list) >= 3:  # Entity pattern threshold
                conflict_types = [c.get('type', 'unknown') for c in entity_conflict_list]
                pattern = ConflictPattern(f"entity_hotspot_{entity}", len(entity_conflict_list), [entity])
                patterns.append(pattern)
        
        return sorted(patterns, key=lambda p: p.severity_score, reverse=True)
    
    def _analyze_entity_involvement(self, conflicts: List[Dict[str, Any]], entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze which entities are most involved in conflicts"""
        entity_conflict_counts = defaultdict(int)
        entity_conflict_types = defaultdict(set)
        
        for conflict in conflicts:
            for entity in conflict.get('affected_entities', []):
                entity_conflict_counts[entity] += 1
                entity_conflict_types[entity].add(conflict.get('type', 'unknown'))
        
        # Find most problematic entities
        problematic_entities = sorted(
            entity_conflict_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]  # Top 10 most problematic
        
        # Analyze entity types
        entity_type_analysis = {}
        for entity_type, entity_list in entities.items():
            type_conflicts = sum(
                entity_conflict_counts.get(entity.get('id', ''), 0)
                for entity in entity_list
            )
            entity_type_analysis[entity_type] = {
                'total_conflicts': type_conflicts,
                'entities_with_conflicts': sum(
                    1 for entity in entity_list
                    if entity_conflict_counts.get(entity.get('id', ''), 0) > 0
                ),
                'total_entities': len(entity_list)
            }
        
        return {
            'most_problematic_entities': [
                {
                    'entity_id': entity_id,
                    'conflict_count': count,
                    'conflict_types': list(entity_conflict_types[entity_id])
                }
                for entity_id, count in problematic_entities
            ],
            'entity_type_analysis': entity_type_analysis
        }
    
    def _identify_root_causes(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Identify potential root causes of conflicts"""
        root_causes = []
        
        # Analyze resource scarcity
        venues = entities.get('venues', [])
        lecturers = entities.get('lecturers', [])
        sessions = solution.sessions
        
        # Check venue utilization
        venue_usage = defaultdict(int)
        for session in sessions:
            venue_usage[session.venue_id] += 1
        
        if venues:
            avg_venue_usage = sum(venue_usage.values()) / len(venues)
            high_usage_venues = [v_id for v_id, usage in venue_usage.items() if usage > avg_venue_usage * 1.5]
            
            if high_usage_venues:
                root_causes.append({
                    'type': 'venue_scarcity',
                    'description': f'{len(high_usage_venues)} venues are overutilized',
                    'severity': 'high' if len(high_usage_venues) > len(venues) * 0.3 else 'medium',
                    'affected_entities': high_usage_venues,
                    'recommendation': 'Consider adding more venues or redistributing sessions'
                })
        
        # Check lecturer workload
        lecturer_usage = defaultdict(int)
        for session in sessions:
            lecturer_usage[session.lecturer_id] += 1
        
        if lecturers:
            avg_lecturer_usage = sum(lecturer_usage.values()) / len(lecturers)
            overloaded_lecturers = [l_id for l_id, usage in lecturer_usage.items() if usage > avg_lecturer_usage * 1.5]
            
            if overloaded_lecturers:
                root_causes.append({
                    'type': 'lecturer_overload',
                    'description': f'{len(overloaded_lecturers)} lecturers are overloaded',
                    'severity': 'high' if len(overloaded_lecturers) > len(lecturers) * 0.2 else 'medium',
                    'affected_entities': overloaded_lecturers,
                    'recommendation': 'Balance lecturer workload or hire additional staff'
                })
        
        # Check time slot distribution
        time_slot_usage = defaultdict(int)
        for session in sessions:
            time_key = f"{session.day_of_week}_{session.start_time.hour}"
            time_slot_usage[time_key] += 1
        
        if time_slot_usage:
            avg_time_usage = sum(time_slot_usage.values()) / len(time_slot_usage)
            peak_times = [time for time, usage in time_slot_usage.items() if usage > avg_time_usage * 2]
            
            if peak_times:
                root_causes.append({
                    'type': 'time_slot_congestion',
                    'description': f'{len(peak_times)} time slots are heavily congested',
                    'severity': 'medium',
                    'affected_entities': peak_times,
                    'recommendation': 'Spread sessions across more time slots'
                })
        
        return root_causes
    
    def _calculate_severity_distribution(self, conflicts: List[Dict[str, Any]]) -> Dict[str, int]:
        """Calculate distribution of conflict severities"""
        severity_counts = Counter(conflict.get('severity', 'unknown') for conflict in conflicts)
        return dict(severity_counts)
    
    def _generate_analysis_recommendations(self, patterns: List[ConflictPattern], root_causes: List[Dict[str, Any]]) -> List[str]:
        """Generate high-level recommendations based on analysis"""
        recommendations = []
        
        # Pattern-based recommendations
        for pattern in patterns[:3]:  # Top 3 patterns
            if pattern.conflict_type == 'venue_double_booking':
                recommendations.append("Consider adding more venues or extending operating hours")
            elif pattern.conflict_type == 'lecturer_conflict':
                recommendations.append("Review lecturer availability and consider hiring additional staff")
            elif pattern.conflict_type.startswith('entity_hotspot'):
                entity_id = pattern.entities[0] if pattern.entities else 'unknown'
                recommendations.append(f"Entity {entity_id} is involved in many conflicts - review its constraints")
        
        # Root cause recommendations
        for cause in root_causes:
            if cause['severity'] == 'high':
                recommendations.append(cause['recommendation'])
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def _group_conflicts_by_type(self, conflicts: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group conflicts by their type"""
        grouped = defaultdict(list)
        for conflict in conflicts:
            conflict_type = conflict.get('type', 'unknown')
            grouped[conflict_type].append(conflict)
        return dict(grouped)
    
    def _generate_venue_conflict_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for venue conflicts"""
        suggestions = []
        venues = {v['id']: v for v in entities.get('venues', [])}
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if len(affected_sessions) >= 2:
                session1, session2 = affected_sessions[0], affected_sessions[1]
                
                # Suggestion 1: Move one session to different venue
                alternative_venues = self._find_alternative_venues(session1, venues, entities)
                if alternative_venues:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"venue_move_{session1.id}",
                        description=f"Move session {session1.course_id} to {alternative_venues[0]['name']}",
                        resolution_type="reassign_venue",
                        affected_sessions=[session1.id],
                        parameters={
                            'session_id': session1.id,
                            'new_venue_id': alternative_venues[0]['id'],
                            'alternative_venues': [v['id'] for v in alternative_venues[:3]]
                        },
                        score=0.8,
                        effort_level="low",
                        impact_description="Changes venue location for one session"
                    ))
                
                # Suggestion 2: Reschedule one session
                alternative_times = self._find_alternative_times(session1, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"reschedule_{session1.id}",
                        description=f"Reschedule session {session1.course_id} to {alternative_times[0]}",
                        resolution_type="reschedule",
                        affected_sessions=[session1.id],
                        parameters={
                            'session_id': session1.id,
                            'new_time': alternative_times[0],
                            'alternative_times': alternative_times[:3]
                        },
                        score=0.7,
                        effort_level="medium",
                        impact_description="Changes session timing"
                    ))
        
        return suggestions
    
    def _generate_lecturer_conflict_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for lecturer conflicts"""
        suggestions = []
        lecturers = {l['id']: l for l in entities.get('lecturers', [])}
        courses = {c['id']: c for c in entities.get('courses', [])}
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                course = courses.get(session.course_id)
                
                # Suggestion 1: Reschedule session
                alternative_times = self._find_alternative_times(session, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"lecturer_reschedule_{session.id}",
                        description=f"Reschedule {session.course_id} to avoid lecturer conflict",
                        resolution_type="reschedule",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_time': alternative_times[0]
                        },
                        score=0.8,
                        effort_level="medium",
                        impact_description="Changes session timing"
                    ))
                
                # Suggestion 2: Assign different lecturer
                if course:
                    alternative_lecturers = self._find_alternative_lecturers(course, lecturers, solution.sessions)
                    if alternative_lecturers:
                        suggestions.append(ResolutionSuggestion(
                            resolution_id=f"lecturer_reassign_{session.id}",
                            description=f"Assign {alternative_lecturers[0]['name']} to {session.course_id}",
                            resolution_type="reassign_lecturer",
                            affected_sessions=[session.id],
                            parameters={
                                'session_id': session.id,
                                'new_lecturer_id': alternative_lecturers[0]['id']
                            },
                            score=0.6,
                            effort_level="high",
                            impact_description="Changes course instructor"
                        ))
        
        return suggestions
    
    def _generate_student_group_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for student group conflicts"""
        suggestions = []
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                
                # Suggestion 1: Reschedule session
                alternative_times = self._find_alternative_times(session, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"group_reschedule_{session.id}",
                        description=f"Reschedule {session.course_id} to avoid student group overlap",
                        resolution_type="reschedule",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_time': alternative_times[0]
                        },
                        score=0.8,
                        effort_level="medium",
                        impact_description="Changes session timing for affected groups"
                    ))
                
                # Suggestion 2: Split student groups
                if len(session.student_groups) > 1:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"split_groups_{session.id}",
                        description=f"Split student groups for {session.course_id} into separate sessions",
                        resolution_type="split_group",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'split_strategy': 'parallel_sessions'
                        },
                        score=0.6,
                        effort_level="high",
                        impact_description="Creates multiple parallel sessions"
                    ))
        
        return suggestions
    
    def _generate_capacity_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for capacity conflicts"""
        suggestions = []
        venues = {v['id']: v for v in entities.get('venues', [])}
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                current_venue = venues.get(session.venue_id)
                
                # Calculate required capacity
                student_groups = {g['id']: g for g in entities.get('student_groups', [])}
                required_capacity = sum(
                    student_groups.get(group_id, {}).get('size', 0)
                    for group_id in session.student_groups
                )
                
                # Suggestion 1: Move to larger venue
                larger_venues = [
                    v for v in venues.values()
                    if v.get('capacity', 0) >= required_capacity and v['id'] != session.venue_id
                ]
                
                if larger_venues:
                    best_venue = min(larger_venues, key=lambda v: v.get('capacity', 0))
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"capacity_move_{session.id}",
                        description=f"Move {session.course_id} to larger venue {best_venue['name']} (capacity: {best_venue.get('capacity', 0)})",
                        resolution_type="reassign_venue",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_venue_id': best_venue['id'],
                            'required_capacity': required_capacity
                        },
                        score=0.9,
                        effort_level="low",
                        impact_description="Changes venue to accommodate all students"
                    ))
                
                # Suggestion 2: Split into multiple sessions
                if current_venue and required_capacity > current_venue.get('capacity', 0):
                    sessions_needed = (required_capacity + current_venue.get('capacity', 1) - 1) // current_venue.get('capacity', 1)
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"capacity_split_{session.id}",
                        description=f"Split {session.course_id} into {sessions_needed} smaller sessions",
                        resolution_type="split_group",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'sessions_needed': sessions_needed,
                            'max_capacity': current_venue.get('capacity', 0)
                        },
                        score=0.7,
                        effort_level="high",
                        impact_description=f"Creates {sessions_needed} parallel sessions"
                    ))
        
        return suggestions
    
    def _generate_equipment_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for equipment conflicts"""
        suggestions = []
        venues = {v['id']: v for v in entities.get('venues', [])}
        courses = {c['id']: c for c in entities.get('courses', [])}
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                course = courses.get(session.course_id)
                
                if course:
                    required_equipment = course.get('required_equipment', [])
                    
                    # Find venues with required equipment
                    suitable_venues = [
                        v for v in venues.values()
                        if all(eq in v.get('equipment', []) for eq in required_equipment)
                        and v['id'] != session.venue_id
                    ]
                    
                    if suitable_venues:
                        best_venue = suitable_venues[0]
                        suggestions.append(ResolutionSuggestion(
                            resolution_id=f"equipment_move_{session.id}",
                            description=f"Move {session.course_id} to {best_venue['name']} with required equipment",
                            resolution_type="reassign_venue",
                            affected_sessions=[session.id],
                            parameters={
                                'session_id': session.id,
                                'new_venue_id': best_venue['id'],
                                'required_equipment': required_equipment
                            },
                            score=0.9,
                            effort_level="low",
                            impact_description="Changes venue to one with required equipment"
                        ))
        
        return suggestions
    
    def _generate_availability_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate resolutions for availability conflicts"""
        suggestions = []
        lecturers = {l['id']: l for l in entities.get('lecturers', [])}
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                lecturer = lecturers.get(session.lecturer_id)
                
                # Suggestion 1: Reschedule to available time
                if lecturer:
                    available_times = self._find_lecturer_available_times(lecturer, solution.sessions)
                    if available_times:
                        suggestions.append(ResolutionSuggestion(
                            resolution_id=f"availability_reschedule_{session.id}",
                            description=f"Reschedule {session.course_id} to lecturer's available time",
                            resolution_type="reschedule",
                            affected_sessions=[session.id],
                            parameters={
                                'session_id': session.id,
                                'new_time': available_times[0],
                                'lecturer_id': session.lecturer_id
                            },
                            score=0.8,
                            effort_level="medium",
                            impact_description="Changes session timing to match lecturer availability"
                        ))
        
        return suggestions
    
    def _generate_generic_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate generic resolutions for unknown conflict types"""
        suggestions = []
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                
                # Generic suggestion: Reschedule session
                alternative_times = self._find_alternative_times(session, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"generic_reschedule_{session.id}",
                        description=f"Reschedule {session.course_id} to resolve conflict",
                        resolution_type="reschedule",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_time': alternative_times[0]
                        },
                        score=0.5,
                        effort_level="medium",
                        impact_description="Changes session timing"
                    ))
        
                
                # Suggestion 1: Reschedule to available time
                if lecturer:
                    available_times = self._find_lecturer_available_times(lecturer, solution.sessions)
                    if available_times:
                        suggestions.append(ResolutionSuggestion(
                            resolution_id=f"availability_reschedule_{session.id}",
                            description=f"Reschedule {session.course_id} to lecturer's available time",
                            resolution_type="reschedule",
                            affected_sessions=[session.id],
                            parameters={
                                'session_id': session.id,
                                'new_time': available_times[0],
                                'lecturer_id': session.lecturer_id
                            },
                            score=0.8,
                            effort_level="medium",
                            impact_description="Changes session timing to match lecturer availability"
                        ))
                
                # Suggestion 2: Assign different lecturer
                courses = {c['id']: c for c in entities.get('courses', [])}
                course = courses.get(session.course_id)
                if course:
                    alternative_lecturers = self._find_alternative_lecturers(course, lecturers, solution.sessions)
                    if alternative_lecturers:
                        suggestions.append(ResolutionSuggestion(
                            resolution_id=f"availability_reassign_{session.id}",
                            description=f"Assign available lecturer {alternative_lecturers[0]['name']} to {session.course_id}",
                            resolution_type="reassign_lecturer",
                            affected_sessions=[session.id],
                            parameters={
                                'session_id': session.id,
                                'new_lecturer_id': alternative_lecturers[0]['id']
                            },
                            score=0.6,
                            effort_level="high",
                            impact_description="Changes course instructor"
                        ))
        
        return suggestions
    
    def _generate_generic_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate generic resolutions for unknown conflict types"""
        suggestions = []
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                
                # Generic suggestion: Reschedule session
                alternative_times = self._find_alternative_times(session, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"generic_reschedule_{session.id}",
                        description=f"Reschedule {session.course_id} to resolve conflict",
                        resolution_type="reschedule",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_time': alternative_times[0]
                        },
                        score=0.5,
                        effort_level="medium",
                        impact_description="Changes session timing"
                    ))
        
        return suggestions
    
    def _generate_generic_resolutions(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> List[ResolutionSuggestion]:
        """Generate generic resolutions for unknown conflict types"""
        suggestions = []
        
        for conflict in conflicts:
            session_ids = conflict.get('session_ids', [])
            affected_sessions = [s for s in solution.sessions if s.id in session_ids]
            
            if affected_sessions:
                session = affected_sessions[0]
                
                # Generic suggestion: reschedule
                alternative_times = self._find_alternative_times(session, solution.sessions)
                if alternative_times:
                    suggestions.append(ResolutionSuggestion(
                        resolution_id=f"generic_reschedule_{session.id}",
                        description=f"Reschedule {session.course_id} to resolve conflict",
                        resolution_type="reschedule",
                        affected_sessions=[session.id],
                        parameters={
                            'session_id': session.id,
                            'new_time': alternative_times[0]
                        },
                        score=0.5,
                        effort_level="medium",
                        impact_description="Generic rescheduling solution"
                    ))
        
        return suggestions
    
    def _rank_suggestions(self, suggestions: List[ResolutionSuggestion], conflicts: List[Dict[str, Any]], solution: SolutionModel) -> List[ResolutionSuggestion]:
        """Rank suggestions by effectiveness and feasibility"""
        
        # Calculate enhanced scores for each suggestion
        for suggestion in suggestions:
            enhanced_score = self._calculate_enhanced_score(suggestion, conflicts, solution)
            suggestion.score = enhanced_score
        
        # Sort by score (descending) and confidence (descending)
        return sorted(suggestions, key=lambda s: (s.score, s.confidence), reverse=True)
    
    def _calculate_enhanced_score(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]], solution: SolutionModel) -> float:
        """Calculate enhanced score considering multiple factors"""
        base_score = suggestion.score
        
        # Factor 1: Number of conflicts resolved
        conflicts_resolved = len(suggestion.affected_sessions)
        conflict_factor = min(conflicts_resolved / 5.0, 1.0)  # Normalize to max 5 conflicts
        
        # Factor 2: Effort level penalty
        effort_penalties = {'low': 0.0, 'medium': 0.1, 'high': 0.2}
        effort_penalty = effort_penalties.get(suggestion.effort_level, 0.2)
        
        # Factor 3: Resolution type preference
        type_bonuses = {
            'reschedule': 0.1,
            'reassign_venue': 0.15,
            'reassign_lecturer': 0.05,
            'split_group': -0.05
        }
        type_bonus = type_bonuses.get(suggestion.resolution_type, 0.0)
        
        # Factor 4: Impact assessment
        impact_penalty = 0.05 if 'multiple' in suggestion.impact_description.lower() else 0.0
        
        # Calculate final score
        enhanced_score = base_score + conflict_factor + type_bonus - effort_penalty - impact_penalty
        return max(0.0, min(1.0, enhanced_score))
    
    def _find_alternative_venues(self, session: ScheduledSessionModel, venues: Dict[str, Dict[str, Any]], entities: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Find alternative venues for a session"""
        courses = {c['id']: c for c in entities.get('courses', [])}
        student_groups = {g['id']: g for g in entities.get('student_groups', [])}
        
        course = courses.get(session.course_id)
        if not course:
            return []
        
        required_equipment = course.get('required_equipment', [])
        required_capacity = sum(
            student_groups.get(group_id, {}).get('size', 0)
            for group_id in session.student_groups
        )
        
        suitable_venues = []
        for venue in venues.values():
            if venue['id'] == session.venue_id:
                continue
                
            # Check capacity
            if venue.get('capacity', 0) < required_capacity:
                continue
                
            # Check equipment
            venue_equipment = venue.get('equipment', [])
            if not all(eq in venue_equipment for eq in required_equipment):
                continue
                
            suitable_venues.append(venue)
        
        # Sort by capacity (prefer smaller suitable venues)
        return sorted(suitable_venues, key=lambda v: v.get('capacity', 0))
    
    def _find_alternative_times(self, session: ScheduledSessionModel, all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find alternative time slots for a session"""
        alternative_times = []
        
        # Generate possible time slots (simplified)
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]  # Skip lunch hour (12)
        
        current_time_key = f"{session.day_of_week}_{session.start_time.hour}"
        
        for day_idx, day in enumerate(days):
            for hour in hours:
                time_key = f"{day_idx}_{hour}"
                if time_key == current_time_key:
                    continue
                
                # Check if this time slot is available
                conflicts = [
                    s for s in all_sessions
                    if (s.day_of_week == day_idx and 
                        s.start_time.hour == hour and
                        (s.venue_id == session.venue_id or 
                         s.lecturer_id == session.lecturer_id or
                         any(g in s.student_groups for g in session.student_groups)))
                ]
                
                if not conflicts:
                    alternative_times.append(f"{day} {hour:02d}:00")
        
        return alternative_times[:5]  # Return top 5 alternatives
    
    def _find_alternative_lecturers(self, course: Dict[str, Any], lecturers: Dict[str, Dict[str, Any]], all_sessions: List[ScheduledSessionModel]) -> List[Dict[str, Any]]:
        """Find alternative lecturers for a course"""
        course_subjects = course.get('subjects', [])
        if not course_subjects:
            return []
        
        suitable_lecturers = []
        for lecturer in lecturers.values():
            if lecturer['id'] == course.get('lecturer_id'):
                continue
                
            # Check if lecturer can teach this subject
            lecturer_subjects = lecturer.get('subjects', [])
            if not any(subject in lecturer_subjects for subject in course_subjects):
                continue
                
            # Check workload (simplified)
            lecturer_sessions = [s for s in all_sessions if s.lecturer_id == lecturer['id']]
            if len(lecturer_sessions) >= lecturer.get('max_hours_per_week', 40) // 2:  # Rough estimate
                continue
                
            suitable_lecturers.append(lecturer)
        
        return suitable_lecturers[:3]  # Return top 3 alternatives
    
    def _find_lecturer_available_times(self, lecturer: Dict[str, Any], all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find available time slots for a lecturer"""
        availability = lecturer.get('availability', {})
        lecturer_sessions = [s for s in all_sessions if s.lecturer_id == lecturer['id']]
        
        available_times = []
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]
        
        for day_idx, day in enumerate(days):
            day_availability = availability.get(day.lower(), {})
            if not day_availability.get('available', True):
                continue
                
            for hour in hours:
                # Check if lecturer is already scheduled
                conflicts = [
                    s for s in lecturer_sessions
                    if s.day_of_week == day_idx and s.start_time.hour == hour
                ]
                
                if not conflicts:
                    available_times.append(f"{day} {hour:02d}:00")
        
        return available_times[:5]
    
    def _pattern_to_dict(self, pattern: ConflictPattern) -> Dict[str, Any]:
        """Convert ConflictPattern to dictionary"""
        return {
            'conflict_type': pattern.conflict_type,
            'frequency': pattern.frequency,
            'entities': pattern.entities,
            'severity_score': pattern.severity_score
        }
    
    def generate_multiple_alternatives(self, 
                                    conflicts: List[Dict[str, Any]],
                                    solution: SolutionModel,
                                    entities: Dict[str, List[Dict[str, Any]]],
                                    num_alternatives: int = 3) -> List[List[ResolutionSuggestion]]:
        """
        Generate multiple alternative resolution paths
        
        Args:
            conflicts: List of conflicts to resolve
            solution: Current solution
            entities: All scheduling entities
            num_alternatives: Number of alternative paths to generate
            
        Returns:
            List of alternative resolution paths
        """
        logger.info(f"Generating {num_alternatives} alternative resolution paths")
        
        # Get all possible suggestions
        all_suggestions = self.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=20)
        
        alternatives = []
        
        # Generate different combination strategies
        for i in range(num_alternatives):
            if i == 0:
                # Strategy 1: Highest scoring suggestions
                alternative = all_suggestions[:min(5, len(all_suggestions))]
            elif i == 1:
                # Strategy 2: Lowest effort suggestions
                low_effort_suggestions = [s for s in all_suggestions if s.effort_level == 'low']
                alternative = low_effort_suggestions[:min(5, len(low_effort_suggestions))]
            else:
                # Strategy 3: Balanced approach
                balanced_suggestions = [s for s in all_suggestions if s.effort_level == 'medium']
                alternative = balanced_suggestions[:min(5, len(balanced_suggestions))]
            
            if alternative:
                alternatives.append(alternative)
        
        logger.info(f"Generated {len(alternatives)} alternative paths")
        return alternatives
    
    def evaluate_suggestion_quality(self, 
                                  suggestion: ResolutionSuggestion,
                                  conflicts: List[Dict[str, Any]],
                                  solution: SolutionModel,
                                  entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Evaluate the quality of a resolution suggestion
        
        Args:
            suggestion: The suggestion to evaluate
            conflicts: Original conflicts
            solution: Current solution
            entities: All scheduling entities
            
        Returns:
            Quality evaluation metrics
        """
        evaluation = {
            'overall_score': suggestion.score,
            'confidence': suggestion.confidence,
            'feasibility_score': self._calculate_feasibility_score(suggestion, entities),
            'impact_score': self._calculate_impact_score(suggestion, solution),
            'effort_score': self._calculate_effort_score(suggestion),
            'risk_assessment': self._assess_suggestion_risk(suggestion, conflicts),
            'recommendation': 'approve' if suggestion.score > 0.7 else 'review'
        }
        
        return evaluation
    
    def _calculate_feasibility_score(self, suggestion: ResolutionSuggestion, entities: Dict[str, List[Dict[str, Any]]]) -> float:
        """Calculate how feasible a suggestion is to implement"""
        base_feasibility = 0.8
        
        # Check if required entities exist
        if suggestion.resolution_type == 'reassign_venue':
            new_venue_id = suggestion.parameters.get('new_venue_id')
            venues = {v['id']: v for v in entities.get('venues', [])}
            if new_venue_id not in venues:
                base_feasibility -= 0.3
        
        elif suggestion.resolution_type == 'reassign_lecturer':
            new_lecturer_id = suggestion.parameters.get('new_lecturer_id')
            lecturers = {l['id']: l for l in entities.get('lecturers', [])}
            if new_lecturer_id not in lecturers:
                base_feasibility -= 0.3
        
        return max(0.0, base_feasibility)
    
    def _calculate_impact_score(self, suggestion: ResolutionSuggestion, solution: SolutionModel) -> float:
        """Calculate the impact score of implementing a suggestion"""
        # Lower impact is better
        base_impact = 0.8
        
        # More affected sessions = higher impact
        num_affected = len(suggestion.affected_sessions)
        impact_penalty = min(num_affected * 0.1, 0.4)
        
        # Certain resolution types have higher impact
        high_impact_types = ['split_group', 'reassign_lecturer']
        if suggestion.resolution_type in high_impact_types:
            impact_penalty += 0.2
        
        return max(0.0, base_impact - impact_penalty)
    
    def _calculate_effort_score(self, suggestion: ResolutionSuggestion) -> float:
        """Calculate effort score (higher is better - less effort)"""
        effort_scores = {'low': 0.9, 'medium': 0.6, 'high': 0.3}
        return effort_scores.get(suggestion.effort_level, 0.5)
    
    def _assess_suggestion_risk(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess risks associated with implementing a suggestion"""
        risks = []
        risk_level = 'low'
        
        # High effort suggestions are riskier
        if suggestion.effort_level == 'high':
            risks.append("High implementation effort required")
            risk_level = 'medium'
        
        # Multiple affected sessions increase risk
        if len(suggestion.affected_sessions) > 3:
            risks.append("Multiple sessions affected")
            risk_level = 'medium'
        
        # Certain resolution types are riskier
        if suggestion.resolution_type in ['split_group', 'reassign_lecturer']:
            risks.append("Significant schedule changes required")
            risk_level = 'high'
        
        return {
            'level': risk_level,
            'factors': risks,
            'mitigation_suggestions': self._generate_risk_mitigation(risks)
        }
    
    def _generate_risk_mitigation(self, risks: List[str]) -> List[str]:
        """Generate risk mitigation suggestions"""
        mitigations = []
        
        for risk in risks:
            if "effort" in risk.lower():
                mitigations.append("Plan implementation in phases")
            elif "multiple sessions" in risk.lower():
                mitigations.append("Notify all affected parties in advance")
            elif "schedule changes" in risk.lower():
                mitigations.append("Provide alternative options to stakeholders")
        
        return mitigations
    
    def generate_multiple_alternatives(self, 
                                    conflicts: List[Dict[str, Any]],
                                    solution: SolutionModel,
                                    entities: Dict[str, List[Dict[str, Any]]],
                                    num_alternatives: int = 3) -> List[List[ResolutionSuggestion]]:
        """
        Generate multiple alternative resolution paths
        
        Args:
            conflicts: List of conflicts to resolve
            solution: Current solution
            entities: All scheduling entities
            num_alternatives: Number of alternative paths to generate
            
        Returns:
            List of alternative resolution paths
        """
        logger.info(f"Generating {num_alternatives} alternative resolution paths")
        
        # Get all possible suggestions
        all_suggestions = self.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=20)
        
        alternatives = []
        
        # Generate different combination strategies
        for i in range(num_alternatives):
            if i == 0:
                # Strategy 1: Highest scoring suggestions
                alternative = all_suggestions[:min(5, len(all_suggestions))]
            elif i == 1:
                # Strategy 2: Lowest effort suggestions
                low_effort_suggestions = [s for s in all_suggestions if s.effort_level == 'low']
                alternative = low_effort_suggestions[:min(5, len(low_effort_suggestions))]
            else:
                # Strategy 3: Balanced approach
                balanced_suggestions = [s for s in all_suggestions if s.effort_level == 'medium']
                alternative = balanced_suggestions[:min(5, len(balanced_suggestions))]
            
            if alternative:
                alternatives.append(alternative)
        
        logger.info(f"Generated {len(alternatives)} alternative paths")
        return alternatives
    
    def evaluate_suggestion_quality(self, 
                                  suggestion: ResolutionSuggestion,
                                  conflicts: List[Dict[str, Any]],
                                  solution: SolutionModel,
                                  entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Evaluate the quality of a resolution suggestion
        
        Args:
            suggestion: The suggestion to evaluate
            conflicts: Original conflicts
            solution: Current solution
            entities: All scheduling entities
            
        Returns:
            Quality evaluation metrics
        """
        evaluation = {
            'overall_score': suggestion.score,
            'confidence': suggestion.confidence,
            'feasibility_score': self._calculate_feasibility_score(suggestion, entities),
            'impact_score': self._calculate_impact_score(suggestion, solution),
            'effort_score': self._calculate_effort_score(suggestion),
            'risk_assessment': self._assess_suggestion_risk(suggestion, conflicts),
            'recommendation': 'approve' if suggestion.score > 0.7 else 'review'
        }
        
        return evaluation
    
    def _calculate_feasibility_score(self, suggestion: ResolutionSuggestion, entities: Dict[str, List[Dict[str, Any]]]) -> float:
        """Calculate how feasible a suggestion is to implement"""
        base_feasibility = 0.8
        
        # Check if required entities exist
        if suggestion.resolution_type == 'reassign_venue':
            new_venue_id = suggestion.parameters.get('new_venue_id')
            venues = {v['id']: v for v in entities.get('venues', [])}
            if new_venue_id not in venues:
                base_feasibility -= 0.3
        
        elif suggestion.resolution_type == 'reassign_lecturer':
            new_lecturer_id = suggestion.parameters.get('new_lecturer_id')
            lecturers = {l['id']: l for l in entities.get('lecturers', [])}
            if new_lecturer_id not in lecturers:
                base_feasibility -= 0.3
        
        return max(0.0, base_feasibility)
    
    def _calculate_impact_score(self, suggestion: ResolutionSuggestion, solution: SolutionModel) -> float:
        """Calculate the impact score of implementing a suggestion"""
        # Lower impact is better
        base_impact = 0.8
        
        # More affected sessions = higher impact
        num_affected = len(suggestion.affected_sessions)
        impact_penalty = min(num_affected * 0.1, 0.4)
        
        # Certain resolution types have higher impact
        high_impact_types = ['split_group', 'reassign_lecturer']
        if suggestion.resolution_type in high_impact_types:
            impact_penalty += 0.2
        
        return max(0.0, base_impact - impact_penalty)
    
    def _calculate_effort_score(self, suggestion: ResolutionSuggestion) -> float:
        """Calculate effort score (higher is better - less effort)"""
        effort_scores = {'low': 0.9, 'medium': 0.6, 'high': 0.3}
        return effort_scores.get(suggestion.effort_level, 0.5)
    
    def _assess_suggestion_risk(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess risks associated with implementing a suggestion"""
        risks = []
        risk_level = 'low'
        
        # High effort suggestions are riskier
        if suggestion.effort_level == 'high':
            risks.append("High implementation effort required")
            risk_level = 'medium'
        
        # Multiple affected sessions increase risk
        if len(suggestion.affected_sessions) > 3:
            risks.append("Multiple sessions affected")
            risk_level = 'medium'
        
        # Certain resolution types are riskier
        if suggestion.resolution_type in ['split_group', 'reassign_lecturer']:
            risks.append("Significant schedule changes required")
            risk_level = 'high'
        
        return {
            'level': risk_level,
            'factors': risks,
            'mitigation_suggestions': self._generate_risk_mitigation(risks)
        }
    
    def _find_alternative_venues(self, session: ScheduledSessionModel, venues: Dict[str, Dict[str, Any]], entities: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Find alternative venues for a session"""
        courses = {c['id']: c for c in entities.get('courses', [])}
        student_groups = {g['id']: g for g in entities.get('student_groups', [])}
        
        course = courses.get(session.course_id)
        if not course:
            return []
        
        required_equipment = course.get('required_equipment', [])
        required_capacity = sum(
            student_groups.get(group_id, {}).get('size', 0)
            for group_id in session.student_groups
        )
        
        suitable_venues = []
        for venue in venues.values():
            if venue['id'] == session.venue_id:
                continue
                
            # Check capacity
            if venue.get('capacity', 0) < required_capacity:
                continue
                
            # Check equipment
            venue_equipment = venue.get('equipment', [])
            if not all(eq in venue_equipment for eq in required_equipment):
                continue
                
            suitable_venues.append(venue)
        
        # Sort by capacity (prefer smaller suitable venues)
        return sorted(suitable_venues, key=lambda v: v.get('capacity', 0))
    
    def _find_alternative_times(self, session: ScheduledSessionModel, all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find alternative time slots for a session"""
        alternative_times = []
        
        # Generate possible time slots (simplified)
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]  # Skip lunch hour (12)
        
        current_time_key = f"{session.day_of_week}_{session.start_time.hour}"
        
        for day_idx, day in enumerate(days):
            for hour in hours:
                time_key = f"{day_idx}_{hour}"
                if time_key == current_time_key:
                    continue
                
                # Check if this time slot is available
                conflicts = [
                    s for s in all_sessions
                    if (s.day_of_week == day_idx and 
                        s.start_time.hour == hour and
                        (s.venue_id == session.venue_id or 
                         s.lecturer_id == session.lecturer_id or
                         any(g in s.student_groups for g in session.student_groups)))
                ]
                
                if not conflicts:
                    alternative_times.append(f"{day} {hour:02d}:00")
        
        return alternative_times[:5]  # Return top 5 alternatives
    
    def _find_alternative_lecturers(self, course: Dict[str, Any], lecturers: Dict[str, Dict[str, Any]], all_sessions: List[ScheduledSessionModel]) -> List[Dict[str, Any]]:
        """Find alternative lecturers for a course"""
        course_subjects = course.get('subjects', [])
        if not course_subjects:
            return []
        
        suitable_lecturers = []
        for lecturer in lecturers.values():
            if lecturer['id'] == course.get('lecturer_id'):
                continue
                
            # Check if lecturer can teach this subject
            lecturer_subjects = lecturer.get('subjects', [])
            if not any(subject in lecturer_subjects for subject in course_subjects):
                continue
                
            # Check workload (simplified)
            lecturer_sessions = [s for s in all_sessions if s.lecturer_id == lecturer['id']]
            if len(lecturer_sessions) >= lecturer.get('max_hours_per_week', 40) // 2:  # Rough estimate
                continue
                
            suitable_lecturers.append(lecturer)
        
        return suitable_lecturers[:3]  # Return top 3 alternatives
    
    def _find_lecturer_available_times(self, lecturer: Dict[str, Any], all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find available time slots for a lecturer"""
        availability = lecturer.get('availability', {})
        lecturer_sessions = [s for s in all_sessions if s.lecturer_id == lecturer['id']]
        
        available_times = []
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]
        
        for day_idx, day in enumerate(days):
            day_availability = availability.get(day.lower(), {})
            if not day_availability.get('available', True):
                continue
                
            for hour in hours:
                # Check if lecturer is already scheduled
                conflicts = [
                    s for s in lecturer_sessions
                    if s.day_of_week == day_idx and s.start_time.hour == hour
                ]
                
                if not conflicts:
                    available_times.append(f"{day} {hour:02d}:00")
        
        return available_times[:5] 
   
    def _find_alternative_venues(self, session: ScheduledSessionModel, venues: Dict[str, Dict[str, Any]], entities: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Find alternative venues for a session"""
        courses = {c['id']: c for c in entities.get('courses', [])}
        student_groups = {g['id']: g for g in entities.get('student_groups', [])}
        
        course = courses.get(session.course_id)
        required_equipment = course.get('required_equipment', []) if course else []
        
        # Calculate required capacity
        required_capacity = sum(
            student_groups.get(group_id, {}).get('size', 0)
            for group_id in session.student_groups
        )
        
        # Find suitable venues
        suitable_venues = []
        for venue in venues.values():
            if venue['id'] == session.venue_id:
                continue
                
            # Check capacity
            if venue.get('capacity', 0) < required_capacity:
                continue
                
            # Check equipment
            venue_equipment = venue.get('equipment', [])
            if not all(eq in venue_equipment for eq in required_equipment):
                continue
                
            suitable_venues.append(venue)
        
        # Sort by capacity (prefer smaller suitable venues)
        suitable_venues.sort(key=lambda v: v.get('capacity', 0))
        
        return suitable_venues[:5]  # Return top 5 alternatives
    
    def _find_alternative_times(self, session: ScheduledSessionModel, all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find alternative time slots for a session"""
        alternative_times = []
        
        # Generate possible time slots (9 AM to 5 PM, hourly)
        possible_hours = list(range(9, 17))
        possible_days = list(range(5))  # Monday to Friday
        
        # Check each possible time slot
        for day in possible_days:
            for hour in possible_hours:
                # Skip current time slot
                if day == session.day_of_week and hour == session.start_time.hour:
                    continue
                
                # Check if time slot is free
                is_free = True
                for other_session in all_sessions:
                    if (other_session.id != session.id and
                        other_session.day_of_week == day and
                        other_session.start_time.hour == hour and
                        (other_session.lecturer_id == session.lecturer_id or
                         other_session.venue_id == session.venue_id or
                         any(group in other_session.student_groups for group in session.student_groups))):
                        is_free = False
                        break
                
                if is_free:
                    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                    time_str = f"{day_names[day]} {hour:02d}:00"
                    alternative_times.append(time_str)
        
        return alternative_times[:5]  # Return top 5 alternatives
    
    def _find_alternative_lecturers(self, course: Dict[str, Any], lecturers: Dict[str, Dict[str, Any]], all_sessions: List[ScheduledSessionModel]) -> List[Dict[str, Any]]:
        """Find alternative lecturers for a course"""
        course_subjects = course.get('subjects', [])
        current_lecturer_id = course.get('lecturer_id')
        
        suitable_lecturers = []
        for lecturer in lecturers.values():
            if lecturer['id'] == current_lecturer_id:
                continue
                
            # Check if lecturer can teach the subject
            lecturer_subjects = lecturer.get('subjects', [])
            if not any(subject in lecturer_subjects for subject in course_subjects):
                continue
                
            # Check workload
            current_sessions = sum(1 for s in all_sessions if s.lecturer_id == lecturer['id'])
            max_sessions = lecturer.get('max_hours_per_week', 20)  # Assume 1 hour per session
            
            if current_sessions >= max_sessions:
                continue
                
            suitable_lecturers.append(lecturer)
        
        # Sort by current workload (prefer less loaded lecturers)
        suitable_lecturers.sort(key=lambda l: sum(1 for s in all_sessions if s.lecturer_id == l['id']))
        
        return suitable_lecturers[:3]  # Return top 3 alternatives
    
    def _find_lecturer_available_times(self, lecturer: Dict[str, Any], all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find available time slots for a lecturer"""
        availability = lecturer.get('availability', {})
        available_times = []
        
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        day_display = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        
        for day_idx, day_name in enumerate(day_names):
            day_availability = availability.get(day_name, {})
            if not day_availability.get('available', False):
                continue
                
            # Check each hour
            for hour in range(9, 17):
                # Check if lecturer is free at this time
                is_free = True
                for session in all_sessions:
                    if (session.lecturer_id == lecturer['id'] and
                        session.day_of_week == day_idx and
                        session.start_time.hour == hour):
                        is_free = False
                        break
                
                if is_free:
                    time_str = f"{day_display[day_idx]} {hour:02d}:00"
                    available_times.append(time_str)
        
        return available_times[:5]  # Return top 5 available times
    
    def _rank_suggestions(self, suggestions: List[ResolutionSuggestion], conflicts: List[Dict[str, Any]], solution: SolutionModel) -> List[ResolutionSuggestion]:
        """Rank suggestions by score and other factors"""
        # Calculate additional ranking factors
        for suggestion in suggestions:
            # Boost score for suggestions that resolve multiple conflicts
            conflicts_resolved = len([c for c in conflicts if any(sid in c.get('session_ids', []) for sid in suggestion.affected_sessions)])
            if conflicts_resolved > 1:
                suggestion.score += 0.1 * (conflicts_resolved - 1)
            
            # Penalize suggestions affecting many sessions
            if len(suggestion.affected_sessions) > 2:
                suggestion.score -= 0.05 * (len(suggestion.affected_sessions) - 2)
            
            # Ensure score stays in valid range
            suggestion.score = max(0.0, min(1.0, suggestion.score))
        
        # Sort by score (descending) and then by effort level (ascending)
        effort_order = {'low': 0, 'medium': 1, 'high': 2}
        return sorted(suggestions, key=lambda s: (-s.score, effort_order.get(s.effort_level, 1)))
    
    def _pattern_to_dict(self, pattern: ConflictPattern) -> Dict[str, Any]:
        """Convert ConflictPattern to dictionary"""
        return {
            'conflict_type': pattern.conflict_type,
            'frequency': pattern.frequency,
            'entities': pattern.entities,
            'severity_score': pattern.severity_score
        }
    
    def generate_multiple_alternatives(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]], num_alternatives: int = 3) -> List[List[ResolutionSuggestion]]:
        """Generate multiple alternative resolution paths"""
        logger.info(f"Generating {num_alternatives} alternative resolution paths")
        
        alternatives = []
        
        # Generate base suggestions
        all_suggestions = []
        conflicts_by_type = self._group_conflicts_by_type(conflicts)
        
        for conflict_type, type_conflicts in conflicts_by_type.items():
            if conflict_type == 'venue_double_booking':
                suggestions = self._generate_venue_conflict_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'lecturer_conflict':
                suggestions = self._generate_lecturer_conflict_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'student_group_overlap':
                suggestions = self._generate_student_group_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'capacity_exceeded':
                suggestions = self._generate_capacity_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'equipment_conflict':
                suggestions = self._generate_equipment_resolutions(type_conflicts, solution, entities)
            elif conflict_type == 'availability_violation':
                suggestions = self._generate_availability_resolutions(type_conflicts, solution, entities)
            else:
                suggestions = self._generate_generic_resolutions(type_conflicts, solution, entities)
            
            all_suggestions.extend(suggestions)
        
        # Group suggestions by resolution type
        suggestions_by_type = defaultdict(list)
        for suggestion in all_suggestions:
            suggestions_by_type[suggestion.resolution_type].append(suggestion)
        
        # Create alternative paths
        for i in range(num_alternatives):
            alternative_path = []
            used_sessions = set()
            
            # For each conflict, try to find a different resolution approach
            for conflict in conflicts:
                session_ids = conflict.get('session_ids', [])
                
                # Skip if sessions already handled in this alternative
                if any(sid in used_sessions for sid in session_ids):
                    continue
                
                # Find suitable suggestions for this conflict
                suitable_suggestions = [
                    s for s in all_suggestions
                    if any(sid in session_ids for sid in s.affected_sessions)
                    and not any(sid in used_sessions for sid in s.affected_sessions)
                ]
                
                if suitable_suggestions:
                    # For different alternatives, prefer different resolution types
                    if i == 0:
                        # First alternative: prefer high-score, low-effort solutions
                        suggestion = max(suitable_suggestions, key=lambda s: s.score - (0.1 if s.effort_level == 'high' else 0))
                    elif i == 1:
                        # Second alternative: prefer rescheduling solutions
                        reschedule_suggestions = [s for s in suitable_suggestions if s.resolution_type == 'reschedule']
                        suggestion = reschedule_suggestions[0] if reschedule_suggestions else suitable_suggestions[0]
                    else:
                        # Third alternative: prefer venue/lecturer reassignment
                        reassign_suggestions = [s for s in suitable_suggestions if 'reassign' in s.resolution_type]
                        suggestion = reassign_suggestions[0] if reassign_suggestions else suitable_suggestions[0]
                    
                    alternative_path.append(suggestion)
                    used_sessions.update(suggestion.affected_sessions)
            
            if alternative_path:
                alternatives.append(alternative_path)
        
        logger.info(f"Generated {len(alternatives)} alternative paths")
        return alternatives
    
    def evaluate_suggestion_quality(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Evaluate the quality of a resolution suggestion"""
        logger.info(f"Evaluating suggestion quality for {suggestion.resolution_id}")
        
        # Calculate feasibility score
        feasibility_score = self._calculate_feasibility_score(suggestion, solution, entities)
        
        # Calculate impact score
        impact_score = self._calculate_impact_score(suggestion, conflicts, solution)
        
        # Calculate effort score (inverse of effort level)
        effort_scores = {'low': 0.9, 'medium': 0.6, 'high': 0.3}
        effort_score = effort_scores.get(suggestion.effort_level, 0.5)
        
        # Calculate risk assessment
        risk_assessment = self._assess_suggestion_risk(suggestion, conflicts)
        
        # Calculate overall score
        overall_score = (
            suggestion.score * 0.4 +
            feasibility_score * 0.3 +
            impact_score * 0.2 +
            effort_score * 0.1
        )
        
        # Determine recommendation
        recommendation = 'approve' if overall_score >= 0.7 and risk_assessment['level'] != 'high' else 'review'
        
        evaluation = {
            'overall_score': round(overall_score, 3),
            'confidence': round(suggestion.confidence, 3),
            'feasibility_score': round(feasibility_score, 3),
            'impact_score': round(impact_score, 3),
            'effort_score': round(effort_score, 3),
            'risk_assessment': risk_assessment,
            'recommendation': recommendation,
            'evaluation_details': {
                'conflicts_resolved': len([c for c in conflicts if any(sid in c.get('session_ids', []) for sid in suggestion.affected_sessions)]),
                'sessions_affected': len(suggestion.affected_sessions),
                'resolution_complexity': suggestion.effort_level
            }
        }
        
        logger.info(f"Suggestion evaluation complete: {recommendation} (score: {overall_score:.3f})")
        return evaluation
    
    def _calculate_feasibility_score(self, suggestion: ResolutionSuggestion, solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> float:
        """Calculate how feasible a suggestion is to implement"""
        feasibility_score = 1.0
        
        # Check if suggested resources exist and are available
        if suggestion.resolution_type == 'reassign_venue':
            new_venue_id = suggestion.parameters.get('new_venue_id')
            venues = {v['id']: v for v in entities.get('venues', [])}
            if new_venue_id not in venues:
                feasibility_score -= 0.5
        
        elif suggestion.resolution_type == 'reassign_lecturer':
            new_lecturer_id = suggestion.parameters.get('new_lecturer_id')
            lecturers = {l['id']: l for l in entities.get('lecturers', [])}
            if new_lecturer_id not in lecturers:
                feasibility_score -= 0.5
        
        elif suggestion.resolution_type == 'reschedule':
            # Check if the new time is actually available
            new_time = suggestion.parameters.get('new_time')
            if not new_time:
                feasibility_score -= 0.3
        
        # Penalize suggestions affecting many sessions
        if len(suggestion.affected_sessions) > 3:
            feasibility_score -= 0.1 * (len(suggestion.affected_sessions) - 3)
        
        return max(0.0, min(1.0, feasibility_score))
    
    def _calculate_impact_score(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]], solution: SolutionModel) -> float:
        """Calculate the positive impact of implementing a suggestion"""
        # Count how many conflicts this suggestion resolves
        conflicts_resolved = len([
            c for c in conflicts 
            if any(sid in c.get('session_ids', []) for sid in suggestion.affected_sessions)
        ])
        
        # Base impact score
        impact_score = min(1.0, conflicts_resolved / len(conflicts)) if conflicts else 0.0
        
        # Bonus for resolving high-severity conflicts
        high_severity_resolved = len([
            c for c in conflicts 
            if c.get('severity') == 'high' and any(sid in c.get('session_ids', []) for sid in suggestion.affected_sessions)
        ])
        
        if high_severity_resolved > 0:
            impact_score += 0.2 * high_severity_resolved
        
        return min(1.0, impact_score)
    
    def _assess_suggestion_risk(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess the risk of implementing a suggestion"""
        risk_factors = []
        risk_level = 'low'
        
        # High effort suggestions are riskier
        if suggestion.effort_level == 'high':
            risk_factors.append('High implementation effort required')
            risk_level = 'medium'
        
        # Suggestions affecting many sessions are riskier
        if len(suggestion.affected_sessions) > 3:
            risk_factors.append(f'Affects {len(suggestion.affected_sessions)} sessions')
            risk_level = 'high' if risk_level != 'high' else 'high'
        
        # Certain resolution types are inherently riskier
        if suggestion.resolution_type in ['split_group', 'reassign_lecturer']:
            risk_factors.append(f'Complex resolution type: {suggestion.resolution_type}')
            risk_level = 'medium' if risk_level == 'low' else 'high'
        
        # Low confidence suggestions are riskier
        if suggestion.confidence < 0.5:
            risk_factors.append('Low confidence in suggestion quality')
            risk_level = 'high'
        
        # Generate mitigation suggestions
        mitigation_suggestions = []
        if 'High implementation effort' in str(risk_factors):
            mitigation_suggestions.append('Plan implementation in phases')
        if 'Affects' in str(risk_factors) and 'sessions' in str(risk_factors):
            mitigation_suggestions.append('Notify all affected parties in advance')
        if 'Complex resolution type' in str(risk_factors):
            mitigation_suggestions.append('Test changes in a staging environment first')
        
        return {
            'level': risk_level,
            'factors': risk_factors,
            'mitigation_suggestions': mitigation_suggestions
        } 
   
    def _rank_suggestions(self, suggestions: List[ResolutionSuggestion], conflicts: List[Dict[str, Any]], solution: SolutionModel) -> List[ResolutionSuggestion]:
        """Rank suggestions by score and other factors"""
        # Sort by score (descending), then by effort level (ascending)
        effort_order = {'low': 1, 'medium': 2, 'high': 3}
        
        return sorted(suggestions, key=lambda s: (-s.score, effort_order.get(s.effort_level, 2)))
    
    def _find_alternative_venues(self, session: ScheduledSessionModel, venues: Dict[str, Dict[str, Any]], entities: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Find alternative venues for a session"""
        courses = {c['id']: c for c in entities.get('courses', [])}
        student_groups = {g['id']: g for g in entities.get('student_groups', [])}
        
        course = courses.get(session.course_id)
        required_equipment = course.get('required_equipment', []) if course else []
        
        # Calculate required capacity
        required_capacity = sum(
            student_groups.get(group_id, {}).get('size', 0)
            for group_id in session.student_groups
        )
        
        # Find suitable venues
        suitable_venues = []
        for venue in venues.values():
            if venue['id'] == session.venue_id:
                continue
                
            # Check capacity
            if venue.get('capacity', 0) < required_capacity:
                continue
                
            # Check equipment
            venue_equipment = venue.get('equipment', [])
            if not all(eq in venue_equipment for eq in required_equipment):
                continue
                
            suitable_venues.append(venue)
        
        # Sort by capacity (ascending - prefer smaller suitable venues)
        return sorted(suitable_venues, key=lambda v: v.get('capacity', 0))
    
    def _find_alternative_times(self, session: ScheduledSessionModel, all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find alternative time slots for a session"""
        alternative_times = []
        
        # Generate possible time slots (9 AM to 5 PM, hourly)
        possible_hours = list(range(9, 17))
        possible_days = list(range(5))  # Monday to Friday
        
        # Check each possible time slot
        for day in possible_days:
            for hour in possible_hours:
                # Skip current time slot
                if day == session.day_of_week and hour == session.start_time.hour:
                    continue
                
                # Check if time slot is free
                time_slot_free = True
                for other_session in all_sessions:
                    if (other_session.day_of_week == day and 
                        other_session.start_time.hour == hour and
                        (other_session.venue_id == session.venue_id or 
                         other_session.lecturer_id == session.lecturer_id or
                         any(group in other_session.student_groups for group in session.student_groups))):
                        time_slot_free = False
                        break
                
                if time_slot_free:
                    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                    time_str = f"{day_names[day]} {hour:02d}:00"
                    alternative_times.append(time_str)
                    
                    if len(alternative_times) >= 5:  # Limit to 5 alternatives
                        break
            
            if len(alternative_times) >= 5:
                break
        
        return alternative_times
    
    def _find_alternative_lecturers(self, course: Dict[str, Any], lecturers: Dict[str, Dict[str, Any]], all_sessions: List[ScheduledSessionModel]) -> List[Dict[str, Any]]:
        """Find alternative lecturers for a course"""
        course_subjects = course.get('subjects', [])
        suitable_lecturers = []
        
        for lecturer in lecturers.values():
            # Skip current lecturer
            if lecturer['id'] == course.get('lecturer_id'):
                continue
                
            # Check if lecturer can teach the subject
            lecturer_subjects = lecturer.get('subjects', [])
            if not any(subject in lecturer_subjects for subject in course_subjects):
                continue
                
            # Check workload (simple check)
            lecturer_sessions = [s for s in all_sessions if s.lecturer_id == lecturer['id']]
            max_hours = lecturer.get('max_hours_per_week', 40)
            current_hours = len(lecturer_sessions)  # Simplified - assume 1 hour per session
            
            if current_hours < max_hours:
                suitable_lecturers.append(lecturer)
        
        return suitable_lecturers
    
    def _find_lecturer_available_times(self, lecturer: Dict[str, Any], all_sessions: List[ScheduledSessionModel]) -> List[str]:
        """Find available time slots for a lecturer"""
        availability = lecturer.get('availability', {})
        available_times = []
        
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        day_display = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        
        for day_idx, day_name in enumerate(day_names):
            day_availability = availability.get(day_name, {})
            if day_availability.get('available', False):
                # Check each hour of the day
                for hour in range(9, 17):
                    # Check if lecturer is free at this time
                    lecturer_free = True
                    for session in all_sessions:
                        if (session.lecturer_id == lecturer['id'] and
                            session.day_of_week == day_idx and
                            session.start_time.hour == hour):
                            lecturer_free = False
                            break
                    
                    if lecturer_free:
                        time_str = f"{day_display[day_idx]} {hour:02d}:00"
                        available_times.append(time_str)
                        
                        if len(available_times) >= 5:
                            break
                
                if len(available_times) >= 5:
                    break
        
        return available_times
    
    def _pattern_to_dict(self, pattern: ConflictPattern) -> Dict[str, Any]:
        """Convert ConflictPattern to dictionary"""
        return {
            'conflict_type': pattern.conflict_type,
            'frequency': pattern.frequency,
            'entities': pattern.entities,
            'severity_score': pattern.severity_score
        }
    
    def generate_multiple_alternatives(self, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]], num_alternatives: int = 3) -> List[List[ResolutionSuggestion]]:
        """Generate multiple alternative resolution paths"""
        alternatives = []
        
        # Generate base suggestions
        all_suggestions = self.generate_resolution_suggestions(conflicts, solution, entities, max_suggestions=20)
        
        if not all_suggestions:
            return alternatives
        
        # Create different alternative paths
        for i in range(min(num_alternatives, len(all_suggestions))):
            # Each alternative focuses on different resolution strategies
            if i == 0:
                # Alternative 1: Prefer low-effort solutions
                alternative = [s for s in all_suggestions if s.effort_level == 'low'][:5]
            elif i == 1:
                # Alternative 2: Prefer high-score solutions regardless of effort
                alternative = sorted(all_suggestions, key=lambda s: s.score, reverse=True)[:5]
            else:
                # Alternative 3: Balanced approach
                alternative = all_suggestions[i*2:(i*2)+5]
            
            if alternative:
                alternatives.append(alternative)
        
        return alternatives
    
    def evaluate_suggestion_quality(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]], solution: SolutionModel, entities: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Evaluate the quality of a resolution suggestion"""
        
        # Calculate feasibility score
        feasibility_score = self._calculate_feasibility_score(suggestion, entities)
        
        # Calculate impact score
        impact_score = self._calculate_impact_score(suggestion, conflicts, solution)
        
        # Calculate effort score (inverse of effort level)
        effort_scores = {'low': 0.9, 'medium': 0.6, 'high': 0.3}
        effort_score = effort_scores.get(suggestion.effort_level, 0.5)
        
        # Risk assessment
        risk_assessment = self._assess_suggestion_risk(suggestion, conflicts)
        
        # Overall score calculation
        overall_score = (
            suggestion.score * 0.4 +
            feasibility_score * 0.3 +
            impact_score * 0.2 +
            effort_score * 0.1
        )
        
        # Recommendation based on overall score and risk
        recommendation = 'approve' if overall_score >= 0.7 and risk_assessment['level'] != 'high' else 'review'
        
        return {
            'overall_score': min(1.0, max(0.0, overall_score)),
            'confidence': suggestion.confidence,
            'feasibility_score': feasibility_score,
            'impact_score': impact_score,
            'effort_score': effort_score,
            'risk_assessment': risk_assessment,
            'recommendation': recommendation
        }
    
    def _calculate_feasibility_score(self, suggestion: ResolutionSuggestion, entities: Dict[str, List[Dict[str, Any]]]) -> float:
        """Calculate how feasible a suggestion is to implement"""
        base_score = 0.8
        
        # Check if required resources exist
        if suggestion.resolution_type == 'reassign_venue':
            new_venue_id = suggestion.parameters.get('new_venue_id')
            venues = {v['id']: v for v in entities.get('venues', [])}
            if new_venue_id not in venues:
                base_score -= 0.3
        
        elif suggestion.resolution_type == 'reassign_lecturer':
            new_lecturer_id = suggestion.parameters.get('new_lecturer_id')
            lecturers = {l['id']: l for l in entities.get('lecturers', [])}
            if new_lecturer_id not in lecturers:
                base_score -= 0.3
        
        # Adjust based on effort level
        effort_penalties = {'low': 0.0, 'medium': 0.1, 'high': 0.2}
        base_score -= effort_penalties.get(suggestion.effort_level, 0.1)
        
        return min(1.0, max(0.0, base_score))
    
    def _calculate_impact_score(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]], solution: SolutionModel) -> float:
        """Calculate the positive impact of implementing a suggestion"""
        base_score = 0.7
        
        # Higher score for suggestions that resolve multiple conflicts
        affected_sessions = set(suggestion.affected_sessions)
        conflicts_resolved = 0
        
        for conflict in conflicts:
            conflict_sessions = set(conflict.get('session_ids', []))
            if affected_sessions.intersection(conflict_sessions):
                conflicts_resolved += 1
        
        # Bonus for resolving multiple conflicts
        if conflicts_resolved > 1:
            base_score += min(0.3, conflicts_resolved * 0.1)
        
        # Penalty for high-effort solutions
        if suggestion.effort_level == 'high':
            base_score -= 0.1
        
        return min(1.0, max(0.0, base_score))
    
    def _assess_suggestion_risk(self, suggestion: ResolutionSuggestion, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess the risk of implementing a suggestion"""
        risk_factors = []
        risk_level = 'low'
        
        # High effort = higher risk
        if suggestion.effort_level == 'high':
            risk_factors.append('High implementation effort required')
            risk_level = 'medium'
        
        # Multiple affected sessions = higher risk
        if len(suggestion.affected_sessions) > 3:
            risk_factors.append('Multiple sessions affected')
            risk_level = 'high' if risk_level == 'medium' else 'medium'
        
        # Low confidence = higher risk
        if suggestion.confidence < 0.6:
            risk_factors.append('Low confidence in solution effectiveness')
            risk_level = 'high' if risk_level == 'medium' else 'medium'
        
        # Complex resolution types = higher risk
        complex_types = ['split_group', 'reassign_lecturer']
        if suggestion.resolution_type in complex_types:
            risk_factors.append('Complex resolution type with potential side effects')
            risk_level = 'medium' if risk_level == 'low' else risk_level
        
        # Mitigation suggestions
        mitigation_suggestions = []
        if 'High implementation effort' in str(risk_factors):
            mitigation_suggestions.append('Plan implementation in phases')
        if 'Multiple sessions affected' in str(risk_factors):
            mitigation_suggestions.append('Notify all affected parties in advance')
        if 'Low confidence' in str(risk_factors):
            mitigation_suggestions.append('Consider alternative solutions or seek additional input')
        
        return {
            'level': risk_level,
            'factors': risk_factors,
            'mitigation_suggestions': mitigation_suggestions
        }