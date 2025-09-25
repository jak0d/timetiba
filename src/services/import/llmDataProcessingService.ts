import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedData, ColumnMapping, MappedImportData } from '../../types/import';
import { logger } from '../../utils/logger';
import { Venue, CreateVenueRequest } from '../../models/venue';
import { Lecturer, CreateLecturerRequest } from '../../models/lecturer';
import { Course, CreateCourseRequest } from '../../models/course';
import { StudentGroup, CreateStudentGroupRequest } from '../../models/studentGroup';
import { ScheduledSession } from '../../models/schedule';

export interface LLMProcessingOptions {
  preserveOriginalNames: boolean;
  createMissingEntities: boolean;
  confidenceThreshold: number;
  maxRetries: number;
  enableContextualMapping: boolean;
}

export interface LLMAnalysisResult {
  detectedEntities: {
    venues: DetectedEntity[];
    lecturers: DetectedEntity[];
    courses: DetectedEntity[];
    studentGroups: DetectedEntity[];
    schedules: DetectedScheduleEntry[];
  };
  suggestedMappings: ColumnMapping[];
  dataStructure: DataStructureAnalysis;
  confidence: number;
  recommendations: string[];
}

export interface DetectedEntity {
  originalName: string;
  normalizedName: string;
  attributes: Record<string, any>;
  confidence: number;
  sourceRows: number[];
  suggestedFields: Record<string, any>;
}

export interface DetectedScheduleEntry {
  course: string;
  lecturer: string;
  venue: string;
  studentGroups: string[];
  timeSlot: {
    day: string;
    startTime: string;
    endTime: string;
    duration?: number;
  };
  originalRow: number;
  confidence: number;
}

export interface DataStructureAnalysis {
  format: 'timetable' | 'entity_list' | 'mixed';
  primaryEntityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule';
  relationships: EntityRelationship[];
  timeFormat: string;
  dateFormat?: string;
  namingConventions: NamingConvention[];
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  confidence: number;
}

export interface NamingConvention {
  pattern: string;
  entityType: string;
  examples: string[];
  confidence: number;
}

export class LLMDataProcessingService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  /**
   * Intelligently analyze and process uploaded data using LLM
   */
  async processDataWithLLM(
    parsedData: ParsedData,
    options: LLMProcessingOptions = this.getDefaultOptions()
  ): Promise<LLMAnalysisResult> {
    try {
      logger.info('Starting LLM data analysis', { 
        rowCount: parsedData.rows.length,
        headers: parsedData.headers 
      });

      // Prepare data sample for LLM analysis
      const dataSample = this.prepareLLMInput(parsedData);
      
      // Analyze data structure and entities
      const analysisResult = await this.analyzeDataStructure(dataSample, options);
      
      // Generate entity mappings
      const entityMappings = await this.generateEntityMappings(
        parsedData, 
        analysisResult, 
        options
      );
      
      // Create comprehensive result
      const result: LLMAnalysisResult = {
        detectedEntities: entityMappings,
        suggestedMappings: await this.generateColumnMappings(parsedData, analysisResult),
        dataStructure: analysisResult,
        confidence: this.calculateOverallConfidence(analysisResult, entityMappings),
        recommendations: await this.generateRecommendations(analysisResult, entityMappings)
      };

      logger.info('LLM analysis completed', { 
        confidence: result.confidence,
        entitiesDetected: Object.keys(result.detectedEntities).length 
      });

      return result;
    } catch (error) {
      logger.error('LLM processing failed', error);
      throw new Error(`LLM processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create entities in database preserving original names and structure
   */
  async createEntitiesFromLLMAnalysis(
    analysisResult: LLMAnalysisResult,
    options: LLMProcessingOptions
  ): Promise<MappedImportData> {
    const mappedData: MappedImportData = {
      venues: [],
      lecturers: [],
      courses: [],
      studentGroups: [],
      schedules: [],
      metadata: {
        sourceFile: 'llm-processed',
        mappingConfig: 'ai-generated',
        importedAt: new Date(),
        importedBy: 'llm-service'
      }
    };

    try {
      // Create venues preserving original names
      mappedData.venues = await this.createVenuesFromDetection(
        analysisResult.detectedEntities.venues,
        options
      );

      // Create lecturers preserving original names
      mappedData.lecturers = await this.createLecturersFromDetection(
        analysisResult.detectedEntities.lecturers,
        options
      );

      // Create courses preserving original names
      mappedData.courses = await this.createCoursesFromDetection(
        analysisResult.detectedEntities.courses,
        options
      );

      // Create student groups preserving original names
      mappedData.studentGroups = await this.createStudentGroupsFromDetection(
        analysisResult.detectedEntities.studentGroups,
        options
      );

      // Create schedule entries
      mappedData.schedules = await this.createSchedulesFromDetection(
        analysisResult.detectedEntities.schedules,
        options
      );

      logger.info('Entities created from LLM analysis', {
        venues: mappedData.venues.length,
        lecturers: mappedData.lecturers.length,
        courses: mappedData.courses.length,
        studentGroups: mappedData.studentGroups.length,
        schedules: mappedData.schedules.length
      });

      return mappedData;
    } catch (error) {
      logger.error('Entity creation from LLM analysis failed', error);
      throw error;
    }
  }

  private async analyzeDataStructure(
    dataSample: string,
    options: LLMProcessingOptions
  ): Promise<DataStructureAnalysis> {
    const prompt = `
Analyze this timetable/schedule data and provide a comprehensive structure analysis:

${dataSample}

Please analyze and return a JSON response with:
1. format: "timetable", "entity_list", or "mixed"
2. primaryEntityType: main entity type being described
3. relationships: detected relationships between entities
4. timeFormat: detected time format pattern
5. dateFormat: detected date format (if any)
6. namingConventions: patterns in how entities are named

Focus on preserving the original naming conventions and structure that users are familiar with.
Return only valid JSON.
`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    
    try {
      return JSON.parse(response.text());
    } catch (error) {
      logger.warn('Failed to parse LLM structure analysis, using fallback');
      return this.getFallbackStructureAnalysis();
    }
  }

  private async generateEntityMappings(
    parsedData: ParsedData,
    structureAnalysis: DataStructureAnalysis,
    options: LLMProcessingOptions
  ): Promise<LLMAnalysisResult['detectedEntities']> {
    const dataSample = this.prepareLLMInput(parsedData, 20); // More rows for entity detection
    
    const prompt = `
Analyze this data and extract all unique entities while preserving their original names:

${dataSample}

Data structure context: ${JSON.stringify(structureAnalysis)}

Extract and return JSON with:
{
  "venues": [{"originalName": "exact name from data", "normalizedName": "cleaned version", "attributes": {...}, "confidence": 0-1, "sourceRows": [row numbers], "suggestedFields": {...}}],
  "lecturers": [...],
  "courses": [...],
  "studentGroups": [...],
  "schedules": [{"course": "name", "lecturer": "name", "venue": "name", "studentGroups": ["names"], "timeSlot": {...}, "originalRow": number, "confidence": 0-1}]
}

CRITICAL: Preserve exact original names as they appear in the data. Users want to see the same names they used in their original files.
Return only valid JSON.
`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    
    try {
      return JSON.parse(response.text());
    } catch (error) {
      logger.warn('Failed to parse LLM entity mappings, using fallback');
      return this.getFallbackEntityMappings();
    }
  }

  private async generateColumnMappings(
    parsedData: ParsedData,
    structureAnalysis: DataStructureAnalysis
  ): Promise<ColumnMapping[]> {
    const prompt = `
Generate column mappings for this data structure:

Headers: ${JSON.stringify(parsedData.headers)}
Structure: ${JSON.stringify(structureAnalysis)}
Sample row: ${JSON.stringify(parsedData.rows[0] || {})}

Return JSON array of mappings:
[{
  "sourceColumn": "original column name",
  "targetField": "database field name",
  "entityType": "venue|lecturer|course|studentGroup|schedule",
  "transformation": "none|uppercase|lowercase|trim|date_parse|number_parse",
  "required": boolean,
  "defaultValue": any
}]

Map to these entity fields:
- Venue: name, capacity, location, building, roomNumber, equipment, accessibility
- Lecturer: name, email, department, subjects, employeeId, phone, title
- Course: name, code, duration, department, credits, description
- StudentGroup: name, size, yearLevel, department, program, semester
- Schedule: courseId, lecturerId, venueId, studentGroups, startTime, endTime, dayOfWeek

Return only valid JSON.
`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    
    try {
      return JSON.parse(response.text());
    } catch (error) {
      logger.warn('Failed to parse column mappings, using fallback');
      return this.getFallbackColumnMappings(parsedData.headers);
    }
  }

  private async generateRecommendations(
    structureAnalysis: DataStructureAnalysis,
    entityMappings: LLMAnalysisResult['detectedEntities']
  ): Promise<string[]> {
    const entityCounts = {
      venues: entityMappings.venues?.length || 0,
      lecturers: entityMappings.lecturers?.length || 0,
      courses: entityMappings.courses?.length || 0,
      studentGroups: entityMappings.studentGroups?.length || 0,
      schedules: entityMappings.schedules?.length || 0
    };

    const recommendations: string[] = [];

    if (entityCounts.venues === 0) {
      recommendations.push('No venues detected. Consider adding venue information for better scheduling.');
    }

    if (entityCounts.lecturers === 0) {
      recommendations.push('No lecturers detected. Lecturer information is essential for timetable generation.');
    }

    if (structureAnalysis.format === 'mixed') {
      recommendations.push('Mixed data format detected. Consider separating entity data from schedule data for cleaner imports.');
    }

    if (structureAnalysis.timeFormat === 'unknown') {
      recommendations.push('Time format could not be determined. Please ensure consistent time formatting (e.g., HH:MM or H:MM AM/PM).');
    }

    return recommendations;
  }

  private async createVenuesFromDetection(
    detectedVenues: DetectedEntity[],
    options: LLMProcessingOptions
  ): Promise<Partial<CreateVenueRequest>[]> {
    return detectedVenues.map(venue => ({
      name: options.preserveOriginalNames ? venue.originalName : venue.normalizedName,
      capacity: venue.suggestedFields['capacity'] || venue.attributes['capacity'] || 30,
      location: venue.suggestedFields['location'] || venue.attributes['location'] || venue.originalName,
      building: venue.suggestedFields['building'] || venue.attributes['building'],
      roomNumber: venue.suggestedFields['roomNumber'] || venue.attributes['roomNumber'],
      equipment: venue.suggestedFields['equipment'] || venue.attributes['equipment'] || [],
      availability: venue.suggestedFields['availability'] || [],
      accessibility: venue.suggestedFields['accessibility'] || [],
      description: `Imported from original data: ${venue.originalName}`
    }));
  }

  private async createLecturersFromDetection(
    detectedLecturers: DetectedEntity[],
    options: LLMProcessingOptions
  ): Promise<Partial<CreateLecturerRequest>[]> {
    return detectedLecturers.map(lecturer => ({
      name: options.preserveOriginalNames ? lecturer.originalName : lecturer.normalizedName,
      email: lecturer.suggestedFields.email || lecturer.attributes.email || `${lecturer.normalizedName.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
      department: lecturer.suggestedFields.department || lecturer.attributes.department || 'General',
      subjects: lecturer.suggestedFields.subjects || lecturer.attributes.subjects || [],
      employeeId: lecturer.suggestedFields.employeeId || lecturer.attributes.employeeId,
      phone: lecturer.suggestedFields.phone || lecturer.attributes.phone,
      title: lecturer.suggestedFields.title || lecturer.attributes.title || 'Lecturer',
      maxHoursPerDay: lecturer.suggestedFields.maxHoursPerDay || 8,
      maxHoursPerWeek: lecturer.suggestedFields.maxHoursPerWeek || 40,
      availability: lecturer.suggestedFields.availability || {
        monday: [{ startTime: '09:00', endTime: '17:00' }],
        tuesday: [{ startTime: '09:00', endTime: '17:00' }],
        wednesday: [{ startTime: '09:00', endTime: '17:00' }],
        thursday: [{ startTime: '09:00', endTime: '17:00' }],
        friday: [{ startTime: '09:00', endTime: '17:00' }],
        saturday: [],
        sunday: []
      },
      preferences: lecturer.suggestedFields.preferences || {
        preferredTimeSlots: [],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minimumBreakBetweenClasses: 15,
        preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        avoidBackToBackClasses: false
      }
    }));
  }

  private async createCoursesFromDetection(
    detectedCourses: DetectedEntity[],
    options: LLMProcessingOptions
  ): Promise<Partial<CreateCourseRequest>[]> {
    return detectedCourses.map(course => ({
      name: options.preserveOriginalNames ? course.originalName : course.normalizedName,
      code: course.suggestedFields.code || course.attributes.code || this.generateCourseCode(course.originalName),
      duration: course.suggestedFields.duration || course.attributes.duration || 60,
      department: course.suggestedFields.department || course.attributes.department || 'General',
      credits: course.suggestedFields.credits || course.attributes.credits || 3,
      description: course.suggestedFields.description || `Imported course: ${course.originalName}`,
      requiredEquipment: course.suggestedFields.requiredEquipment || course.attributes.requiredEquipment || [],
      constraints: course.suggestedFields.constraints || [],
      frequency: course.suggestedFields.frequency || { type: 'weekly', value: 1 },
      studentGroups: course.suggestedFields.studentGroups || [],
      lecturerId: course.suggestedFields.lecturerId || '',
      prerequisites: course.suggestedFields.prerequisites || []
    }));
  }

  private async createStudentGroupsFromDetection(
    detectedGroups: DetectedEntity[],
    options: LLMProcessingOptions
  ): Promise<Partial<CreateStudentGroupRequest>[]> {
    return detectedGroups.map(group => ({
      name: options.preserveOriginalNames ? group.originalName : group.normalizedName,
      size: group.suggestedFields.size || group.attributes.size || 25,
      yearLevel: group.suggestedFields.yearLevel || group.attributes.yearLevel || 1,
      department: group.suggestedFields.department || group.attributes.department || 'General',
      program: group.suggestedFields.program || group.attributes.program,
      semester: group.suggestedFields.semester || group.attributes.semester || 1,
      academicYear: group.suggestedFields.academicYear || group.attributes.academicYear || new Date().getFullYear().toString(),
      courses: group.suggestedFields.courses || []
    }));
  }

  private async createSchedulesFromDetection(
    detectedSchedules: DetectedScheduleEntry[],
    options: LLMProcessingOptions
  ): Promise<Partial<ScheduledSession>[]> {
    return detectedSchedules.map(schedule => ({
      courseId: schedule.course, // Will need to be resolved to actual IDs
      lecturerId: schedule.lecturer,
      venueId: schedule.venue,
      studentGroups: schedule.studentGroups,
      startTime: this.parseTimeSlot(schedule.timeSlot.startTime),
      endTime: this.parseTimeSlot(schedule.timeSlot.endTime),
      dayOfWeek: this.parseDayOfWeek(schedule.timeSlot.day),
      notes: `Imported from row ${schedule.originalRow}`
    }));
  }

  private prepareLLMInput(parsedData: ParsedData, maxRows: number = 10): string {
    const headers = parsedData.headers.join('\t');
    const sampleRows = parsedData.rows
      .slice(0, maxRows)
      .map(row => parsedData.headers.map(header => row[header] || '').join('\t'))
      .join('\n');
    
    return `Headers:\n${headers}\n\nData:\n${sampleRows}\n\nMetadata:\n${JSON.stringify(parsedData.metadata, null, 2)}`;
  }

  private calculateOverallConfidence(
    structureAnalysis: DataStructureAnalysis,
    entityMappings: LLMAnalysisResult['detectedEntities']
  ): number {
    const entityConfidences = [
      ...(entityMappings.venues?.map(v => v.confidence) || []),
      ...(entityMappings.lecturers?.map(l => l.confidence) || []),
      ...(entityMappings.courses?.map(c => c.confidence) || []),
      ...(entityMappings.studentGroups?.map(sg => sg.confidence) || []),
      ...(entityMappings.schedules?.map(s => s.confidence) || [])
    ];

    if (entityConfidences.length === 0) return 0.5;

    const avgEntityConfidence = entityConfidences.reduce((sum, conf) => sum + conf, 0) / entityConfidences.length;
    const structureConfidence = structureAnalysis.relationships?.length > 0 ? 0.8 : 0.6;

    return (avgEntityConfidence + structureConfidence) / 2;
  }

  private generateCourseCode(courseName: string): string {
    return courseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + '101';
  }

  private parseTimeSlot(timeString: string): Date {
    // Simple time parsing - can be enhanced based on detected format
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private parseDayOfWeek(dayString: string): string {
    const dayMap: Record<string, string> = {
      'monday': 'monday', 'mon': 'monday', 'm': 'monday',
      'tuesday': 'tuesday', 'tue': 'tuesday', 't': 'tuesday',
      'wednesday': 'wednesday', 'wed': 'wednesday', 'w': 'wednesday',
      'thursday': 'thursday', 'thu': 'thursday', 'th': 'thursday',
      'friday': 'friday', 'fri': 'friday', 'f': 'friday',
      'saturday': 'saturday', 'sat': 'saturday', 's': 'saturday',
      'sunday': 'sunday', 'sun': 'sunday', 'su': 'sunday'
    };

    return dayMap[dayString.toLowerCase()] || 'monday';
  }

  private getDefaultOptions(): LLMProcessingOptions {
    return {
      preserveOriginalNames: true,
      createMissingEntities: true,
      confidenceThreshold: 0.7,
      maxRetries: 3,
      enableContextualMapping: true
    };
  }

  private getFallbackStructureAnalysis(): DataStructureAnalysis {
    return {
      format: 'mixed',
      primaryEntityType: 'schedule',
      relationships: [],
      timeFormat: 'HH:MM',
      namingConventions: []
    };
  }

  private getFallbackEntityMappings(): LLMAnalysisResult['detectedEntities'] {
    return {
      venues: [],
      lecturers: [],
      courses: [],
      studentGroups: [],
      schedules: []
    };
  }

  private getFallbackColumnMappings(headers: string[]): ColumnMapping[] {
    return headers.map(header => ({
      sourceColumn: header,
      targetField: header.toLowerCase().replace(/\s+/g, '_'),
      entityType: 'schedule' as const,
      transformation: 'trim' as const,
      required: false
    }));
  }
}