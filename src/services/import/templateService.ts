import { ImportTemplate } from '../../types/import';
import * as XLSX from 'xlsx';

export class TemplateService {
  private static readonly TEMPLATE_VERSION = '1.0.0';

  /**
   * Get all available import templates
   */
  public getAvailableTemplates(): ImportTemplate[] {
    return [
      this.getTimetableTemplate(),
      this.getVenuesTemplate(),
      this.getLecturersTemplate(),
      this.getCoursesTemplate(),
      this.getStudentGroupsTemplate()
    ];
  }

  /**
   * Get template by ID
   */
  public getTemplateById(templateId: string): ImportTemplate | null {
    const templates = this.getAvailableTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Generate CSV template file content
   */
  public generateCSVTemplate(templateId: string): string {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const headers = template.columns.map(col => col.name);
    
    // Create CSV content manually
    const csvRows: string[] = [];
    
    // Add header row
    csvRows.push(headers.map(header => this.escapeCsvValue(header)).join(','));
    
    // Add sample data rows
    template.sampleData.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header] || '';
        return this.escapeCsvValue(String(value));
      }).join(',');
      csvRows.push(csvRow);
    });

    return csvRows.join('\n') + '\n';
  }

  /**
   * Escape CSV values properly
   */
  private escapeCsvValue(value: string): string {
    // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate Excel template file buffer
   */
  public generateExcelTemplate(templateId: string): Buffer {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const workbook = XLSX.utils.book_new();
    
    // Create main data sheet
    const headers = template.columns.map(col => col.name);
    const worksheetData = [headers, ...template.sampleData.map(row => 
      headers.map(header => row[header] || '')
    )];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const columnWidths = headers.map(header => ({
      wch: Math.max(header.length, 15)
    }));
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Create instructions sheet
    const instructionsData = this.generateInstructionsSheet(template);
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Generate instructions sheet data for Excel templates
   */
  private generateInstructionsSheet(template: ImportTemplate): any[][] {
    const instructions = [
      ['Import Template Instructions', '', '', ''],
      ['', '', '', ''],
      ['Template:', template.name, 'Version:', template.version],
      ['Description:', template.description, '', ''],
      ['', '', '', ''],
      ['Column Definitions:', '', '', ''],
      ['Column Name', 'Description', 'Required', 'Format/Examples'],
      ['', '', '', '']
    ];

    template.columns.forEach(col => {
      instructions.push([
        col.name,
        col.description,
        col.required ? 'Yes' : 'No',
        col.examples.join(', ')
      ]);
    });

    instructions.push(['', '', '', '']);
    instructions.push(['Important Notes:', '', '', '']);
    instructions.push(['• Fill in the Data sheet with your information', '', '', '']);
    instructions.push(['• Required fields must not be empty', '', '', '']);
    instructions.push(['• Follow the format examples provided', '', '', '']);
    instructions.push(['• Remove sample data before importing', '', '', '']);

    return instructions;
  }

  /**
   * Get comprehensive timetable template
   */
  private getTimetableTemplate(): ImportTemplate {
    return {
      id: 'timetable-complete',
      name: 'Complete Timetable Import',
      description: 'Import complete timetable data including courses, lecturers, venues, and schedule sessions',
      fileType: 'excel',
      version: TemplateService.TEMPLATE_VERSION,
      createdAt: new Date(),
      columns: [
        {
          name: 'Course Code',
          description: 'Unique course identifier (e.g., CS101, MATH201)',
          required: true,
          dataType: 'string',
          examples: ['CS101', 'MATH201', 'ENG301']
        },
        {
          name: 'Course Name',
          description: 'Full name of the course',
          required: true,
          dataType: 'string',
          examples: ['Introduction to Computer Science', 'Calculus II', 'Advanced English Literature']
        },
        {
          name: 'Lecturer Name',
          description: 'Full name of the lecturer teaching the course',
          required: true,
          dataType: 'string',
          examples: ['Dr. John Smith', 'Prof. Sarah Johnson', 'Mr. Michael Brown']
        },
        {
          name: 'Lecturer Email',
          description: 'Email address of the lecturer',
          required: false,
          dataType: 'string',
          examples: ['john.smith@university.edu', 'sarah.johnson@university.edu']
        },
        {
          name: 'Venue Name',
          description: 'Name or identifier of the venue/room',
          required: true,
          dataType: 'string',
          examples: ['Room 101', 'Lecture Hall A', 'Lab 205']
        },
        {
          name: 'Student Group',
          description: 'Name of the student group attending',
          required: true,
          dataType: 'string',
          examples: ['CS Year 1 Group A', 'Math Year 2', 'Engineering Cohort 2024']
        },
        {
          name: 'Day of Week',
          description: 'Day when the session occurs',
          required: true,
          dataType: 'string',
          examples: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          validation: {
            allowedValues: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          }
        },
        {
          name: 'Start Time',
          description: 'Session start time in HH:MM format',
          required: true,
          dataType: 'string',
          format: 'HH:MM',
          examples: ['09:00', '14:30', '16:15']
        },
        {
          name: 'End Time',
          description: 'Session end time in HH:MM format',
          required: true,
          dataType: 'string',
          format: 'HH:MM',
          examples: ['10:30', '16:00', '17:45']
        },
        {
          name: 'Duration (minutes)',
          description: 'Session duration in minutes',
          required: false,
          dataType: 'number',
          examples: ['90', '120', '180']
        },
        {
          name: 'Week Number',
          description: 'Specific week number (optional, for recurring sessions)',
          required: false,
          dataType: 'string',
          examples: ['1', '2', '3-12']
        },
        {
          name: 'Department',
          description: 'Academic department',
          required: false,
          dataType: 'string',
          examples: ['Computer Science', 'Mathematics', 'Engineering']
        },
        {
          name: 'Venue Capacity',
          description: 'Maximum capacity of the venue',
          required: false,
          dataType: 'number',
          examples: ['30', '50', '100']
        },
        {
          name: 'Required Equipment',
          description: 'Equipment needed for the session (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['Projector', 'Computers, Projector', 'Whiteboard, Audio System']
        },
        {
          name: 'Notes',
          description: 'Additional notes or comments',
          required: false,
          dataType: 'string',
          examples: ['Lab session', 'Exam preparation', 'Guest lecturer']
        }
      ],
      sampleData: [
        {
          'Course Code': 'CS101',
          'Course Name': 'Introduction to Computer Science',
          'Lecturer Name': 'Dr. John Smith',
          'Lecturer Email': 'john.smith@university.edu',
          'Venue Name': 'Room 101',
          'Student Group': 'CS Year 1 Group A',
          'Day of Week': 'Monday',
          'Start Time': '09:00',
          'End Time': '10:30',
          'Duration (minutes)': '90',
          'Week Number': '',
          'Department': 'Computer Science',
          'Venue Capacity': '30',
          'Required Equipment': 'Projector, Computers',
          'Notes': 'Introduction lecture'
        },
        {
          'Course Code': 'MATH201',
          'Course Name': 'Calculus II',
          'Lecturer Name': 'Prof. Sarah Johnson',
          'Lecturer Email': 'sarah.johnson@university.edu',
          'Venue Name': 'Lecture Hall A',
          'Student Group': 'Math Year 2',
          'Day of Week': 'Tuesday',
          'Start Time': '14:00',
          'End Time': '15:30',
          'Duration (minutes)': '90',
          'Week Number': '',
          'Department': 'Mathematics',
          'Venue Capacity': '100',
          'Required Equipment': 'Whiteboard, Projector',
          'Notes': 'Theory session'
        }
      ]
    };
  }

  /**
   * Get venues-only template
   */
  private getVenuesTemplate(): ImportTemplate {
    return {
      id: 'venues-only',
      name: 'Venues Import',
      description: 'Import venue/room information only',
      fileType: 'csv',
      version: TemplateService.TEMPLATE_VERSION,
      createdAt: new Date(),
      columns: [
        {
          name: 'Venue Name',
          description: 'Name or identifier of the venue/room',
          required: true,
          dataType: 'string',
          examples: ['Room 101', 'Lecture Hall A', 'Lab 205']
        },
        {
          name: 'Capacity',
          description: 'Maximum number of people the venue can accommodate',
          required: true,
          dataType: 'number',
          examples: ['30', '50', '100', '200']
        },
        {
          name: 'Location',
          description: 'Physical location or address of the venue',
          required: true,
          dataType: 'string',
          examples: ['Building A, Floor 1', 'Main Campus, Block B', 'Science Building']
        },
        {
          name: 'Building',
          description: 'Building name or identifier',
          required: false,
          dataType: 'string',
          examples: ['Science Building', 'Engineering Block', 'Main Building']
        },
        {
          name: 'Floor',
          description: 'Floor number',
          required: false,
          dataType: 'number',
          examples: ['1', '2', '3']
        },
        {
          name: 'Room Number',
          description: 'Specific room number',
          required: false,
          dataType: 'string',
          examples: ['101', '205A', 'Lab-3']
        },
        {
          name: 'Equipment',
          description: 'Available equipment (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['Projector', 'Computers, Projector', 'Whiteboard, Audio System, Air Conditioning']
        },
        {
          name: 'Accessibility Features',
          description: 'Accessibility features available (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['Wheelchair Access', 'Hearing Loop, Wheelchair Access', 'Elevator Access']
        },
        {
          name: 'Description',
          description: 'Additional description or notes about the venue',
          required: false,
          dataType: 'string',
          examples: ['Computer lab with 30 workstations', 'Large lecture hall with tiered seating', 'Small seminar room']
        }
      ],
      sampleData: [
        {
          'Venue Name': 'Room 101',
          'Capacity': '30',
          'Location': 'Building A, Floor 1',
          'Building': 'Building A',
          'Floor': '1',
          'Room Number': '101',
          'Equipment': 'Projector, Whiteboard',
          'Accessibility Features': 'Wheelchair Access',
          'Description': 'Standard classroom with modern facilities'
        },
        {
          'Venue Name': 'Computer Lab 205',
          'Capacity': '25',
          'Location': 'Science Building, Floor 2',
          'Building': 'Science Building',
          'Floor': '2',
          'Room Number': '205',
          'Equipment': 'Computers, Projector, Air Conditioning',
          'Accessibility Features': 'Wheelchair Access, Hearing Loop',
          'Description': 'Computer lab with 25 workstations'
        }
      ]
    };
  }

  /**
   * Get lecturers-only template
   */
  private getLecturersTemplate(): ImportTemplate {
    return {
      id: 'lecturers-only',
      name: 'Lecturers Import',
      description: 'Import lecturer information only',
      fileType: 'csv',
      version: TemplateService.TEMPLATE_VERSION,
      createdAt: new Date(),
      columns: [
        {
          name: 'Name',
          description: 'Full name of the lecturer',
          required: true,
          dataType: 'string',
          examples: ['Dr. John Smith', 'Prof. Sarah Johnson', 'Mr. Michael Brown']
        },
        {
          name: 'Email',
          description: 'Email address of the lecturer',
          required: true,
          dataType: 'string',
          examples: ['john.smith@university.edu', 'sarah.johnson@university.edu']
        },
        {
          name: 'Department',
          description: 'Academic department',
          required: true,
          dataType: 'string',
          examples: ['Computer Science', 'Mathematics', 'Engineering', 'Physics']
        },
        {
          name: 'Employee ID',
          description: 'Unique employee identifier',
          required: false,
          dataType: 'string',
          examples: ['EMP001', 'STAFF123', 'FAC456']
        },
        {
          name: 'Title',
          description: 'Academic title or position',
          required: false,
          dataType: 'string',
          examples: ['Professor', 'Associate Professor', 'Lecturer', 'Senior Lecturer']
        },
        {
          name: 'Phone',
          description: 'Contact phone number',
          required: false,
          dataType: 'string',
          examples: ['+1-555-0123', '(555) 123-4567']
        },
        {
          name: 'Subjects',
          description: 'Subjects the lecturer can teach (comma-separated)',
          required: true,
          dataType: 'array',
          examples: ['Computer Science, Programming', 'Mathematics, Statistics', 'Physics, Chemistry']
        },
        {
          name: 'Max Hours Per Day',
          description: 'Maximum teaching hours per day',
          required: false,
          dataType: 'number',
          examples: ['6', '8', '4']
        },
        {
          name: 'Max Hours Per Week',
          description: 'Maximum teaching hours per week',
          required: false,
          dataType: 'number',
          examples: ['20', '25', '15']
        },
        {
          name: 'Preferred Days',
          description: 'Preferred teaching days (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['Monday, Wednesday, Friday', 'Tuesday, Thursday', 'Monday, Tuesday, Wednesday']
        }
      ],
      sampleData: [
        {
          'Name': 'Dr. John Smith',
          'Email': 'john.smith@university.edu',
          'Department': 'Computer Science',
          'Employee ID': 'CS001',
          'Title': 'Professor',
          'Phone': '+1-555-0123',
          'Subjects': 'Computer Science, Programming, Software Engineering',
          'Max Hours Per Day': '6',
          'Max Hours Per Week': '20',
          'Preferred Days': 'Monday, Wednesday, Friday'
        },
        {
          'Name': 'Prof. Sarah Johnson',
          'Email': 'sarah.johnson@university.edu',
          'Department': 'Mathematics',
          'Employee ID': 'MATH002',
          'Title': 'Associate Professor',
          'Phone': '+1-555-0124',
          'Subjects': 'Mathematics, Statistics, Calculus',
          'Max Hours Per Day': '8',
          'Max Hours Per Week': '25',
          'Preferred Days': 'Tuesday, Thursday'
        }
      ]
    };
  }

  /**
   * Get courses-only template
   */
  private getCoursesTemplate(): ImportTemplate {
    return {
      id: 'courses-only',
      name: 'Courses Import',
      description: 'Import course information only',
      fileType: 'csv',
      version: TemplateService.TEMPLATE_VERSION,
      createdAt: new Date(),
      columns: [
        {
          name: 'Course Code',
          description: 'Unique course identifier',
          required: true,
          dataType: 'string',
          examples: ['CS101', 'MATH201', 'ENG301', 'PHYS150']
        },
        {
          name: 'Course Name',
          description: 'Full name of the course',
          required: true,
          dataType: 'string',
          examples: ['Introduction to Computer Science', 'Calculus II', 'Advanced English Literature']
        },
        {
          name: 'Department',
          description: 'Academic department offering the course',
          required: true,
          dataType: 'string',
          examples: ['Computer Science', 'Mathematics', 'English', 'Physics']
        },
        {
          name: 'Credits',
          description: 'Number of credit hours',
          required: true,
          dataType: 'number',
          examples: ['3', '4', '2', '6']
        },
        {
          name: 'Duration (minutes)',
          description: 'Duration of each session in minutes',
          required: true,
          dataType: 'number',
          examples: ['90', '120', '180', '60']
        },
        {
          name: 'Lecturer Name',
          description: 'Name of the primary lecturer',
          required: false,
          dataType: 'string',
          examples: ['Dr. John Smith', 'Prof. Sarah Johnson']
        },
        {
          name: 'Required Equipment',
          description: 'Equipment required for the course (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['Projector', 'Computers, Projector', 'Laboratory Equipment, Safety Gear']
        },
        {
          name: 'Prerequisites',
          description: 'Prerequisite course codes (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['CS100', 'MATH101, MATH102', 'ENG200']
        },
        {
          name: 'Description',
          description: 'Course description',
          required: false,
          dataType: 'string',
          examples: ['Introduction to programming concepts', 'Advanced calculus topics', 'Literary analysis and criticism']
        }
      ],
      sampleData: [
        {
          'Course Code': 'CS101',
          'Course Name': 'Introduction to Computer Science',
          'Department': 'Computer Science',
          'Credits': '3',
          'Duration (minutes)': '90',
          'Lecturer Name': 'Dr. John Smith',
          'Required Equipment': 'Computers, Projector',
          'Prerequisites': '',
          'Description': 'Introduction to programming concepts and computer science fundamentals'
        },
        {
          'Course Code': 'MATH201',
          'Course Name': 'Calculus II',
          'Department': 'Mathematics',
          'Credits': '4',
          'Duration (minutes)': '90',
          'Lecturer Name': 'Prof. Sarah Johnson',
          'Required Equipment': 'Whiteboard, Projector',
          'Prerequisites': 'MATH101',
          'Description': 'Advanced calculus including integration techniques and series'
        }
      ]
    };
  }

  /**
   * Get student groups template
   */
  private getStudentGroupsTemplate(): ImportTemplate {
    return {
      id: 'student-groups-only',
      name: 'Student Groups Import',
      description: 'Import student group information only',
      fileType: 'csv',
      version: TemplateService.TEMPLATE_VERSION,
      createdAt: new Date(),
      columns: [
        {
          name: 'Group Name',
          description: 'Name of the student group',
          required: true,
          dataType: 'string',
          examples: ['CS Year 1 Group A', 'Math Year 2', 'Engineering Cohort 2024']
        },
        {
          name: 'Size',
          description: 'Number of students in the group',
          required: true,
          dataType: 'number',
          examples: ['25', '30', '45', '20']
        },
        {
          name: 'Department',
          description: 'Academic department',
          required: true,
          dataType: 'string',
          examples: ['Computer Science', 'Mathematics', 'Engineering', 'Physics']
        },
        {
          name: 'Year Level',
          description: 'Academic year level',
          required: true,
          dataType: 'number',
          examples: ['1', '2', '3', '4']
        },
        {
          name: 'Program',
          description: 'Academic program or degree',
          required: false,
          dataType: 'string',
          examples: ['Bachelor of Computer Science', 'Bachelor of Mathematics', 'Bachelor of Engineering']
        },
        {
          name: 'Semester',
          description: 'Current semester',
          required: false,
          dataType: 'number',
          examples: ['1', '2']
        },
        {
          name: 'Academic Year',
          description: 'Academic year',
          required: false,
          dataType: 'string',
          examples: ['2024', '2024-2025', '2023-2024']
        },
        {
          name: 'Courses',
          description: 'Course codes the group is enrolled in (comma-separated)',
          required: false,
          dataType: 'array',
          examples: ['CS101, CS102', 'MATH201, MATH202, PHYS101', 'ENG301, ENG302']
        }
      ],
      sampleData: [
        {
          'Group Name': 'CS Year 1 Group A',
          'Size': '25',
          'Department': 'Computer Science',
          'Year Level': '1',
          'Program': 'Bachelor of Computer Science',
          'Semester': '1',
          'Academic Year': '2024',
          'Courses': 'CS101, CS102, MATH101'
        },
        {
          'Group Name': 'Math Year 2',
          'Size': '30',
          'Department': 'Mathematics',
          'Year Level': '2',
          'Program': 'Bachelor of Mathematics',
          'Semester': '1',
          'Academic Year': '2024',
          'Courses': 'MATH201, MATH202, STAT201'
        }
      ]
    };
  }
}