import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedData, MappedImportData } from '../../types/import';
import { logger } from '../../utils/logger';

export interface LLMProcessingOptions {
  preserveOriginalNames: boolean;
  createMissingEntities: boolean;
  confidenceThreshold: number;
  maxRetries: number;
  enableContextualMapping: boolean;
}

export interface LLMAnalysisResult {
  detectedEntities: {
    venues: Array<{ originalName: string; normalizedName: string; confidence: number }>;
    lecturers: Array<{ originalName: string; normalizedName: string; confidence: number }>;
    courses: Array<{ originalName: string; normalizedName: string; confidence: number }>;
    studentGroups: Array<{ originalName: string; normalizedName: string; confidence: number }>;
    schedules: Array<{ course: string; lecturer: string; venue: string; confidence: number }>;
  };
  confidence: number;
  recommendations: string[];
}

export class SimpleLLMDataProcessingService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isAvailable: boolean = false;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        this.isAvailable = true;
        logger.info('Gemini AI service initialized successfully');
      } catch (error) {
        logger.warn('Failed to initialize Gemini AI service', error);
        this.isAvailable = false;
      }
    } else {
      logger.warn('GEMINI_API_KEY not provided - LLM features will use fallback analysis');
      this.isAvailable = false;
    }
  }

  async processDataWithLLM(
    parsedData: ParsedData,
    _options: LLMProcessingOptions = this.getDefaultOptions()
  ): Promise<LLMAnalysisResult> {
    try {
      logger.info('Starting LLM data analysis', { 
        rowCount: parsedData.rows.length,
        headers: parsedData.headers,
        usingAI: this.isAvailable
      });

      if (!this.isAvailable || !this.model) {
        logger.info('Using fallback analysis - Gemini AI not available');
        return this.createFallbackAnalysis(parsedData);
      }

      // Create a simple prompt for the AI
      const prompt = this.createAnalysisPrompt(parsedData);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        const analysisData = JSON.parse(response.text());
        return this.processAnalysisResponse(analysisData, parsedData);
      } catch (parseError) {
        logger.warn('Failed to parse LLM response, using fallback analysis');
        return this.createFallbackAnalysis(parsedData);
      }
    } catch (error) {
      logger.error('LLM processing failed, using fallback analysis', error);
      return this.createFallbackAnalysis(parsedData);
    }
  }

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
      // Create simple entity structures
      mappedData.venues = analysisResult.detectedEntities.venues.map(venue => ({
        name: options.preserveOriginalNames ? venue.originalName : venue.normalizedName,
        capacity: 30,
        location: venue.originalName,
        equipment: [],
        availability: [],
        accessibility: [],
        description: `Imported venue: ${venue.originalName}`
      }));

      mappedData.lecturers = analysisResult.detectedEntities.lecturers.map(lecturer => ({
        name: options.preserveOriginalNames ? lecturer.originalName : lecturer.normalizedName,
        email: `${lecturer.normalizedName.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
        department: 'General',
        subjects: [],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        availability: {
          monday: [{ startTime: '09:00', endTime: '17:00' }],
          tuesday: [{ startTime: '09:00', endTime: '17:00' }],
          wednesday: [{ startTime: '09:00', endTime: '17:00' }],
          thursday: [{ startTime: '09:00', endTime: '17:00' }],
          friday: [{ startTime: '09:00', endTime: '17:00' }],
          saturday: [],
          sunday: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          avoidBackToBackClasses: false
        }
      }));

      mappedData.courses = analysisResult.detectedEntities.courses.map(course => ({
        name: options.preserveOriginalNames ? course.originalName : course.normalizedName,
        code: this.generateCourseCode(course.originalName),
        duration: 60,
        department: 'General',
        credits: 3,
        description: `Imported course: ${course.originalName}`,
        requiredEquipment: [],
        constraints: [],
        frequency: { type: 'weekly', value: 1 },
        studentGroups: [],
        lecturerId: '',
        prerequisites: []
      }));

      mappedData.studentGroups = analysisResult.detectedEntities.studentGroups.map(group => ({
        name: options.preserveOriginalNames ? group.originalName : group.normalizedName,
        size: 25,
        yearLevel: 1,
        department: 'General',
        courses: []
      }));

      logger.info('Entities created from LLM analysis', {
        venues: mappedData.venues.length,
        lecturers: mappedData.lecturers.length,
        courses: mappedData.courses.length,
        studentGroups: mappedData.studentGroups.length
      });

      return mappedData;
    } catch (error) {
      logger.error('Entity creation from LLM analysis failed', error);
      throw error;
    }
  }

  private createAnalysisPrompt(parsedData: ParsedData): string {
    const headers = parsedData.headers.join(', ');
    const sampleRows = parsedData.rows.slice(0, 5).map(row => 
      parsedData.headers.map(header => row[header] || '').join(', ')
    ).join('\n');

    return `
Analyze this timetable data and extract entities. Return JSON only.

Headers: ${headers}
Sample data:
${sampleRows}

Return this exact JSON structure:
{
  "venues": [{"originalName": "name", "normalizedName": "name", "confidence": 0.9}],
  "lecturers": [{"originalName": "name", "normalizedName": "name", "confidence": 0.9}],
  "courses": [{"originalName": "name", "normalizedName": "name", "confidence": 0.9}],
  "studentGroups": [{"originalName": "name", "normalizedName": "name", "confidence": 0.9}],
  "schedules": [{"course": "name", "lecturer": "name", "venue": "name", "confidence": 0.9}]
}

Extract unique entities from the data. Preserve original names exactly as they appear.
`;
  }

  private processAnalysisResponse(analysisData: any, _parsedData: ParsedData): LLMAnalysisResult {
    return {
      detectedEntities: {
        venues: analysisData.venues || [],
        lecturers: analysisData.lecturers || [],
        courses: analysisData.courses || [],
        studentGroups: analysisData.studentGroups || [],
        schedules: analysisData.schedules || []
      },
      confidence: 0.85,
      recommendations: [
        'AI analysis completed successfully',
        'Original names preserved for user familiarity',
        'Entities ready for import'
      ]
    };
  }

  private createFallbackAnalysis(parsedData: ParsedData): LLMAnalysisResult {
    // Create a basic analysis from the data
    const venues = this.extractUniqueValues(parsedData, ['venue', 'room', 'location']);
    const lecturers = this.extractUniqueValues(parsedData, ['lecturer', 'teacher', 'instructor']);
    const courses = this.extractUniqueValues(parsedData, ['course', 'subject', 'class']);
    const studentGroups = this.extractUniqueValues(parsedData, ['group', 'class', 'students']);

    return {
      detectedEntities: {
        venues: venues.map(name => ({ originalName: name, normalizedName: name, confidence: 0.7 })),
        lecturers: lecturers.map(name => ({ originalName: name, normalizedName: name, confidence: 0.7 })),
        courses: courses.map(name => ({ originalName: name, normalizedName: name, confidence: 0.7 })),
        studentGroups: studentGroups.map(name => ({ originalName: name, normalizedName: name, confidence: 0.7 })),
        schedules: []
      },
      confidence: 0.7,
      recommendations: [
        'Fallback analysis used due to AI processing issues',
        'Manual review recommended for accuracy'
      ]
    };
  }

  private extractUniqueValues(parsedData: ParsedData, possibleHeaders: string[]): string[] {
    const values = new Set<string>();
    
    for (const header of parsedData.headers) {
      const normalizedHeader = header.toLowerCase();
      if (possibleHeaders.some(ph => normalizedHeader.includes(ph))) {
        for (const row of parsedData.rows) {
          const value = row[header];
          if (value && typeof value === 'string' && value.trim()) {
            values.add(value.trim());
          }
        }
      }
    }
    
    return Array.from(values);
  }

  private generateCourseCode(courseName: string): string {
    return courseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6) + '101';
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable;
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
}