import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { TimetableContainer } from '../components/timetable/TimetableContainer';
import { 
  Schedule, 
  Clash, 
  Lecturer, 
  Venue, 
  StudentGroup, 
  DayOfWeek 
} from '../types/entities';
import {
  OptimizationParameters,
  OptimizationResult,
  OptimizationStatus,
  ConflictResolutionSuggestion,
} from '../types/ai';

const Timetables: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule | undefined>();
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | undefined>();

  // Mock data for demonstration - in real app, this would come from API
  useEffect(() => {
    // Load mock data
    const mockSchedule: Schedule = {
      id: '1',
      name: 'Fall 2024 Schedule',
      academicPeriod: 'Fall 2024',
      status: 'draft' as any,
      createdAt: new Date(),
      lastModified: new Date(),
      timeSlots: [
        {
          id: 'session-1',
          courseId: 'CS101',
          lecturerId: 'lecturer-1',
          venueId: 'venue-1',
          studentGroups: ['group-1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY,
        },
        {
          id: 'session-2',
          courseId: 'MATH201',
          lecturerId: 'lecturer-2',
          venueId: 'venue-2',
          studentGroups: ['group-2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.TUESDAY,
        },
        {
          id: 'session-3',
          courseId: 'PHY301',
          lecturerId: 'lecturer-1',
          venueId: 'venue-1',
          studentGroups: ['group-1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.WEDNESDAY,
        },
      ],
    };

    const mockClashes: Clash[] = [
      {
        id: 'clash-1',
        type: 'venue_double_booking' as any,
        severity: 'high' as any,
        affectedEntities: ['session-1', 'session-3'],
        description: 'Venue Room A is double-booked on Monday at 9:00 AM',
        suggestedResolutions: [
          {
            id: 'resolution-1',
            description: 'Move PHY301 to Room B',
            impact: 'Minimal impact on schedule',
            confidence: 0.9,
            changes: [],
          },
        ],
      },
    ];

    const mockLecturers: Lecturer[] = [
      {
        id: 'lecturer-1',
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        subjects: ['CS101', 'PHY301'],
        availability: {
          monday: [{ startTime: '09:00', endTime: '17:00' }],
          tuesday: [{ startTime: '09:00', endTime: '17:00' }],
          wednesday: [{ startTime: '09:00', endTime: '17:00' }],
          thursday: [{ startTime: '09:00', endTime: '17:00' }],
          friday: [{ startTime: '09:00', endTime: '17:00' }],
          saturday: [],
          sunday: [],
        },
        preferences: {
          preferredTimeSlots: [],
          avoidTimeSlots: [],
          maxConsecutiveHours: 4,
          preferredBreakDuration: 15,
          preferredVenues: [],
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'lecturer-2',
        name: 'Prof. Jane Doe',
        email: 'jane.doe@university.edu',
        department: 'Mathematics',
        subjects: ['MATH201'],
        availability: {
          monday: [{ startTime: '09:00', endTime: '17:00' }],
          tuesday: [{ startTime: '09:00', endTime: '17:00' }],
          wednesday: [{ startTime: '09:00', endTime: '17:00' }],
          thursday: [{ startTime: '09:00', endTime: '17:00' }],
          friday: [{ startTime: '09:00', endTime: '17:00' }],
          saturday: [],
          sunday: [],
        },
        preferences: {
          preferredTimeSlots: [],
          avoidTimeSlots: [],
          maxConsecutiveHours: 4,
          preferredBreakDuration: 15,
          preferredVenues: [],
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockVenues: Venue[] = [
      {
        id: 'venue-1',
        name: 'Room A',
        capacity: 30,
        equipment: [],
        location: 'Building 1, Floor 2',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'venue-2',
        name: 'Room B',
        capacity: 50,
        equipment: [],
        location: 'Building 2, Floor 1',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockStudentGroups: StudentGroup[] = [
      {
        id: 'group-1',
        name: 'CS Year 1',
        size: 25,
        courses: ['CS101', 'PHY301'],
        yearLevel: 1,
        department: 'Computer Science',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'group-2',
        name: 'Math Year 2',
        size: 30,
        courses: ['MATH201'],
        yearLevel: 2,
        department: 'Mathematics',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    setSchedule(mockSchedule);
    setClashes(mockClashes);
    setLecturers(mockLecturers);
    setVenues(mockVenues);
    setStudentGroups(mockStudentGroups);
  }, []);

  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setSchedule(updatedSchedule);
    // In real app, this would make an API call to save the schedule
    console.log('Schedule updated:', updatedSchedule);
  };

  const handleSessionMove = (sessionId: string, newDay: DayOfWeek, newTime: string) => {
    if (!schedule) return;

    const updatedTimeSlots = schedule.timeSlots.map(session => {
      if (session.id === sessionId) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newStartTime = new Date(session.startTime);
        newStartTime.setHours(hours, minutes, 0, 0);
        
        const duration = session.endTime.getTime() - session.startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);

        return {
          ...session,
          dayOfWeek: newDay,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }
      return session;
    });

    const updatedSchedule = {
      ...schedule,
      timeSlots: updatedTimeSlots,
      lastModified: new Date(),
    };

    setSchedule(updatedSchedule);
    // In real app, this would trigger clash detection
  };

  const handleGenerateSchedule = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // In real app, this would call the AI service to generate a new schedule
      console.log('Generate new schedule');
    }, 2000);
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setLoading(false);
      console.log('Refresh timetable data');
    }, 1000);
  };

  const handleStartOptimization = async (parameters: OptimizationParameters) => {
    setLoading(true);
    
    // Create initial optimization result
    const optimizationId = `opt-${Date.now()}`;
    const initialResult: OptimizationResult = {
      id: optimizationId,
      status: OptimizationStatus.RUNNING,
      progress: 0,
      startTime: new Date(),
      metrics: {
        totalClashes: clashes.length,
        resolvedClashes: 0,
        improvementScore: 0,
        executionTime: 0,
        iterationsCompleted: 0,
        constraintsSatisfied: 0,
        constraintsTotal: 10,
      },
      suggestions: [],
    };

    setOptimizationResult(initialResult);

    // Simulate AI optimization process
    setTimeout(() => {
      const mockSuggestions: ConflictResolutionSuggestion[] = [
        {
          id: 'suggestion-1',
          clashId: 'clash-1',
          title: 'Resolve Venue Double Booking',
          description: 'Move PHY301 session from Room A to Room B to resolve the venue conflict',
          impact: 'Minimal disruption - Room B has similar capacity and equipment',
          confidence: 0.92,
          priority: 8,
          estimatedEffort: 'low' as any,
          affectedEntities: ['session-3', 'venue-1', 'venue-2'],
          changes: [
            {
              entityType: 'session',
              entityId: 'session-3',
              changeType: 'reassign',
              currentValue: 'venue-1',
              proposedValue: 'venue-2',
              reason: 'Resolve venue double booking conflict',
            },
          ],
          pros: [
            'Eliminates venue double booking',
            'Room B has adequate capacity',
            'No impact on lecturer or student schedules',
          ],
          cons: [
            'Students need to go to different building',
            'Room B lacks some specialized equipment',
          ],
        },
        {
          id: 'suggestion-2',
          clashId: 'clash-1',
          title: 'Reschedule PHY301 to Different Time',
          description: 'Move PHY301 session to 11:00 AM to avoid venue conflict',
          impact: 'Moderate impact - affects student group schedule',
          confidence: 0.75,
          priority: 6,
          estimatedEffort: 'medium' as any,
          affectedEntities: ['session-3', 'group-1'],
          changes: [
            {
              entityType: 'session',
              entityId: 'session-3',
              changeType: 'reschedule',
              currentValue: '09:00',
              proposedValue: '11:00',
              reason: 'Avoid venue conflict by changing time slot',
            },
          ],
          pros: [
            'Keeps session in preferred venue',
            'Maintains equipment availability',
          ],
          cons: [
            'Creates gap in student schedule',
            'May conflict with other courses',
          ],
        },
      ];

      const completedResult: OptimizationResult = {
        ...initialResult,
        status: OptimizationStatus.COMPLETED,
        progress: 100,
        endTime: new Date(),
        metrics: {
          ...initialResult.metrics,
          resolvedClashes: 1,
          improvementScore: 0.85,
          executionTime: 3.2,
          iterationsCompleted: 150,
          constraintsSatisfied: 9,
        },
        suggestions: mockSuggestions,
      };

      setOptimizationResult(completedResult);
      setLoading(false);
    }, 3000);
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    setLoading(true);
    
    // Find the suggestion
    const suggestion = optimizationResult?.suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !schedule) {
      setLoading(false);
      return;
    }

    // Apply the suggestion changes to the schedule
    let updatedSchedule = { ...schedule };
    
    suggestion.changes.forEach(change => {
      if (change.entityType === 'session') {
        updatedSchedule.timeSlots = updatedSchedule.timeSlots.map(session => {
          if (session.id === change.entityId) {
            if (change.changeType === 'reassign' && change.entityType === 'session') {
              // Reassign venue
              return { ...session, venueId: change.proposedValue };
            } else if (change.changeType === 'reschedule') {
              // Reschedule time
              const [hours, minutes] = change.proposedValue.split(':').map(Number);
              const newStartTime = new Date(session.startTime);
              newStartTime.setHours(hours, minutes, 0, 0);
              
              const duration = session.endTime.getTime() - session.startTime.getTime();
              const newEndTime = new Date(newStartTime.getTime() + duration);

              return {
                ...session,
                startTime: newStartTime,
                endTime: newEndTime,
              };
            }
          }
          return session;
        });
      }
    });

    updatedSchedule.lastModified = new Date();
    setSchedule(updatedSchedule);

    // Remove resolved clashes
    const updatedClashes = clashes.filter(clash => clash.id !== suggestion.clashId);
    setClashes(updatedClashes);

    // Update optimization result to remove applied suggestion
    if (optimizationResult) {
      const updatedSuggestions = optimizationResult.suggestions.filter(s => s.id !== suggestionId);
      setOptimizationResult({
        ...optimizationResult,
        suggestions: updatedSuggestions,
      });
    }

    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (optimizationResult) {
      const updatedSuggestions = optimizationResult.suggestions.filter(s => s.id !== suggestionId);
      setOptimizationResult({
        ...optimizationResult,
        suggestions: updatedSuggestions,
      });
    }
  };

  const handleCancelOptimization = async () => {
    if (optimizationResult) {
      setOptimizationResult({
        ...optimizationResult,
        status: OptimizationStatus.CANCELLED,
      });
    }
    setLoading(false);
  };

  return (
    <Box>
      <TimetableContainer
        schedule={schedule}
        clashes={clashes}
        lecturers={lecturers}
        venues={venues}
        studentGroups={studentGroups}
        loading={loading}
        onScheduleUpdate={handleScheduleUpdate}
        onSessionMove={handleSessionMove}
        onGenerateSchedule={handleGenerateSchedule}
        onRefresh={handleRefresh}
        onStartOptimization={handleStartOptimization}
        onApplySuggestion={handleApplySuggestion}
        onRejectSuggestion={handleRejectSuggestion}
        onCancelOptimization={handleCancelOptimization}
        optimizationResult={optimizationResult}
      />
    </Box>
  );
};

export default Timetables;