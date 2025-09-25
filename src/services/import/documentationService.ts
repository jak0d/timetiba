export interface ImportDocumentation {
  id: string;
  title: string;
  description: string;
  sections: DocumentationSection[];
  lastUpdated: Date;
  version: string;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  subsections?: DocumentationSection[];
  examples?: CodeExample[];
  tips?: string[];
  warnings?: string[];
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: 'csv' | 'json' | 'text';
}

export interface ValidationRule {
  field: string;
  rule: string;
  description: string;
  example: string;
  errorMessage: string;
}

export interface ImportStep {
  step: number;
  title: string;
  description: string;
  actions: string[];
  tips?: string[];
  commonIssues?: string[];
}

export class DocumentationService {
  private static readonly DOCUMENTATION_VERSION = '1.0.0';

  /**
   * Get comprehensive import documentation
   */
  public getImportDocumentation(): ImportDocumentation {
    return {
      id: 'timetable-import-guide',
      title: 'Timetable Import Guide',
      description: 'Complete guide for importing timetable data into the system',
      version: DocumentationService.DOCUMENTATION_VERSION,
      lastUpdated: new Date(),
      sections: [
        this.getOverviewSection(),
        this.getPreparationSection(),
        this.getTemplatesSection(),
        this.getImportProcessSection(),
        this.getValidationSection(),
        this.getTroubleshootingSection(),
        this.getBestPracticesSection()
      ]
    };
  }

  /**
   * Get contextual help for specific import steps
   */
  public getContextualHelp(step: string): DocumentationSection | null {
    const documentation = this.getImportDocumentation();
    
    const findSection = (sections: DocumentationSection[], stepId: string): DocumentationSection | null => {
      for (const section of sections) {
        if (section.id === stepId) {
          return section;
        }
        if (section.subsections) {
          const found = findSection(section.subsections, stepId);
          if (found) return found;
        }
      }
      return null;
    };

    return findSection(documentation.sections, step);
  }

  /**
   * Get validation rules documentation
   */
  public getValidationRules(): ValidationRule[] {
    return [
      {
        field: 'Course Code',
        rule: 'Required, unique, alphanumeric',
        description: 'Must be a unique identifier for the course',
        example: 'CS101, MATH201, ENG301',
        errorMessage: 'Course code is required and must be unique'
      },
      {
        field: 'Course Name',
        rule: 'Required, max 255 characters',
        description: 'Full descriptive name of the course',
        example: 'Introduction to Computer Science',
        errorMessage: 'Course name is required and cannot exceed 255 characters'
      },
      {
        field: 'Lecturer Name',
        rule: 'Required, max 100 characters',
        description: 'Full name of the lecturer teaching the course',
        example: 'Dr. John Smith, Prof. Sarah Johnson',
        errorMessage: 'Lecturer name is required and cannot exceed 100 characters'
      },
      {
        field: 'Lecturer Email',
        rule: 'Valid email format',
        description: 'Valid email address for the lecturer',
        example: 'john.smith@university.edu',
        errorMessage: 'Must be a valid email address'
      },
      {
        field: 'Venue Name',
        rule: 'Required, max 100 characters',
        description: 'Name or identifier of the venue/room',
        example: 'Room 101, Lecture Hall A, Lab 205',
        errorMessage: 'Venue name is required and cannot exceed 100 characters'
      },
      {
        field: 'Student Group',
        rule: 'Required, max 100 characters',
        description: 'Name of the student group attending',
        example: 'CS Year 1 Group A, Math Year 2',
        errorMessage: 'Student group name is required and cannot exceed 100 characters'
      },
      {
        field: 'Day of Week',
        rule: 'Must be valid day name',
        description: 'Day when the session occurs',
        example: 'Monday, Tuesday, Wednesday, Thursday, Friday',
        errorMessage: 'Must be a valid day of the week'
      },
      {
        field: 'Start Time',
        rule: 'HH:MM format, 24-hour',
        description: 'Session start time in 24-hour format',
        example: '09:00, 14:30, 16:15',
        errorMessage: 'Must be in HH:MM format (24-hour)'
      },
      {
        field: 'End Time',
        rule: 'HH:MM format, after start time',
        description: 'Session end time, must be after start time',
        example: '10:30, 16:00, 17:45',
        errorMessage: 'Must be in HH:MM format and after start time'
      },
      {
        field: 'Venue Capacity',
        rule: 'Positive integer',
        description: 'Maximum capacity of the venue',
        example: '30, 50, 100, 200',
        errorMessage: 'Must be a positive integer'
      }
    ];
  }

  /**
   * Get step-by-step import process
   */
  public getImportSteps(): ImportStep[] {
    return [
      {
        step: 1,
        title: 'Prepare Your Data',
        description: 'Organize your timetable data according to the required format',
        actions: [
          'Download the appropriate template from the Templates section',
          'Fill in your data following the column definitions',
          'Ensure all required fields are completed',
          'Validate data formats (dates, times, numbers)',
          'Remove any sample data from the template'
        ],
        tips: [
          'Use consistent naming conventions for venues, lecturers, and courses',
          'Double-check time formats (24-hour HH:MM)',
          'Ensure venue capacities match student group sizes'
        ],
        commonIssues: [
          'Missing required fields',
          'Incorrect time formats',
          'Duplicate course codes',
          'Invalid email addresses'
        ]
      },
      {
        step: 2,
        title: 'Upload Your File',
        description: 'Upload your prepared CSV or Excel file to the system',
        actions: [
          'Click the "Upload File" button',
          'Select your prepared file (CSV or Excel)',
          'Wait for the file to upload and be processed',
          'Review the file preview and detected columns'
        ],
        tips: [
          'Supported formats: CSV, XLSX, XLS',
          'Maximum file size: 10MB',
          'Ensure your file is not corrupted'
        ],
        commonIssues: [
          'File too large (over 10MB)',
          'Unsupported file format',
          'Corrupted or empty files',
          'Files with special characters in names'
        ]
      },
      {
        step: 3,
        title: 'Map Your Columns',
        description: 'Map your file columns to system fields',
        actions: [
          'Review the automatic column mapping suggestions',
          'Adjust mappings using the dropdown menus',
          'Ensure all required fields are mapped',
          'Configure data transformations if needed',
          'Save your mapping configuration for future use'
        ],
        tips: [
          'The system will suggest mappings based on column headers',
          'You can save mapping configurations for reuse',
          'Required fields must be mapped to proceed'
        ],
        commonIssues: [
          'Column headers not recognized',
          'Required fields not mapped',
          'Incorrect field mappings',
          'Data transformation issues'
        ]
      },
      {
        step: 4,
        title: 'Review Entity Matches',
        description: 'Review and confirm matches for existing entities',
        actions: [
          'Review suggested matches for venues, lecturers, and courses',
          'Confirm matches with high confidence scores',
          'Manually resolve ambiguous matches',
          'Choose to create new entities or use existing ones',
          'Review the match summary'
        ],
        tips: [
          'High confidence matches (>90%) are usually accurate',
          'Review medium confidence matches (50-90%) carefully',
          'Low confidence matches (<50%) often need manual review'
        ],
        commonIssues: [
          'Multiple potential matches for the same entity',
          'No matches found for existing entities',
          'Incorrect automatic matches',
          'Duplicate entity creation'
        ]
      },
      {
        step: 5,
        title: 'Validate Your Data',
        description: 'Review validation results and fix any issues',
        actions: [
          'Review the validation report',
          'Fix any errors highlighted in red',
          'Address warnings shown in yellow',
          'Check for scheduling conflicts',
          'Verify entity counts and relationships'
        ],
        tips: [
          'All errors must be fixed before import',
          'Warnings can be ignored but should be reviewed',
          'Check for venue capacity vs. student group size mismatches'
        ],
        commonIssues: [
          'Scheduling conflicts (double bookings)',
          'Venue capacity insufficient for student groups',
          'Invalid data formats',
          'Missing relationships between entities'
        ]
      },
      {
        step: 6,
        title: 'Execute Import',
        description: 'Run the final import process',
        actions: [
          'Review the import summary',
          'Click "Start Import" to begin the process',
          'Monitor the import progress',
          'Wait for completion notification',
          'Review the final import report'
        ],
        tips: [
          'Large imports may take several minutes',
          'You can continue using other parts of the system during import',
          'You\'ll receive a notification when import completes'
        ],
        commonIssues: [
          'Import process interrupted',
          'Partial import completion',
          'System errors during import',
          'Network connectivity issues'
        ]
      }
    ];
  }

  /**
   * Get format requirements documentation
   */
  public getFormatRequirements(): DocumentationSection {
    return {
      id: 'format-requirements',
      title: 'Format Requirements',
      content: 'Detailed requirements for data formats in import files',
      subsections: [
        {
          id: 'date-time-formats',
          title: 'Date and Time Formats',
          content: 'All date and time fields must follow specific formats for proper processing.',
          examples: [
            {
              title: 'Time Format',
              description: 'Use 24-hour format with colon separator',
              code: '09:00\n14:30\n16:15\n23:45',
              language: 'text'
            },
            {
              title: 'Invalid Time Examples',
              description: 'These formats will cause validation errors',
              code: '9:00 AM\n2:30 PM\n9:00\n25:00',
              language: 'text'
            }
          ],
          tips: [
            'Always use 24-hour format (00:00 to 23:59)',
            'Include leading zeros for single-digit hours',
            'Use colon (:) as the separator between hours and minutes'
          ],
          warnings: [
            'AM/PM formats are not supported',
            'Times outside 00:00-23:59 range will be rejected'
          ]
        },
        {
          id: 'text-formats',
          title: 'Text Field Requirements',
          content: 'Guidelines for text fields including names, codes, and descriptions.',
          examples: [
            {
              title: 'Course Codes',
              description: 'Alphanumeric codes with optional hyphens or underscores',
              code: 'CS101\nMATH-201\nENG_301\nPHYS150',
              language: 'text'
            },
            {
              title: 'Names and Titles',
              description: 'Proper formatting for names and titles',
              code: 'Dr. John Smith\nProf. Sarah Johnson\nMr. Michael Brown\nMs. Lisa Davis',
              language: 'text'
            }
          ],
          tips: [
            'Use consistent naming conventions throughout your file',
            'Avoid special characters that might cause parsing issues',
            'Keep names and descriptions concise but descriptive'
          ]
        },
        {
          id: 'numeric-formats',
          title: 'Numeric Field Requirements',
          content: 'Requirements for numeric fields like capacity, duration, and counts.',
          examples: [
            {
              title: 'Valid Numbers',
              description: 'Whole numbers without formatting',
              code: '30\n50\n100\n200',
              language: 'text'
            },
            {
              title: 'Invalid Numbers',
              description: 'These formats will cause errors',
              code: '30.5\n50,000\n100%\n$200',
              language: 'text'
            }
          ],
          tips: [
            'Use whole numbers only (no decimals)',
            'Do not include commas, currency symbols, or percentages',
            'Ensure numbers are within reasonable ranges'
          ]
        }
      ]
    };
  }

  private getOverviewSection(): DocumentationSection {
    return {
      id: 'overview',
      title: 'Overview',
      content: 'The Timetable Import system allows you to bulk import timetable data from CSV or Excel files. This process automatically creates or updates venues, lecturers, courses, student groups, and scheduled sessions.',
      subsections: [
        {
          id: 'supported-formats',
          title: 'Supported File Formats',
          content: 'The system supports the following file formats:',
          examples: [
            {
              title: 'Supported Formats',
              description: 'File formats accepted by the import system',
              code: 'CSV (.csv)\nExcel 2007+ (.xlsx)\nExcel 97-2003 (.xls)',
              language: 'text'
            }
          ],
          tips: [
            'CSV files should use UTF-8 encoding',
            'Excel files can contain multiple sheets (first sheet will be used)',
            'Maximum file size is 10MB'
          ]
        },
        {
          id: 'import-types',
          title: 'Import Types',
          content: 'Choose from different import templates based on your needs:',
          subsections: [
            {
              id: 'complete-timetable',
              title: 'Complete Timetable Import',
              content: 'Import all timetable data including courses, lecturers, venues, and schedules in one file.',
              tips: ['Best for comprehensive timetable imports', 'Includes all entity types and relationships']
            },
            {
              id: 'entity-specific',
              title: 'Entity-Specific Imports',
              content: 'Import specific types of data separately (venues only, lecturers only, etc.).',
              tips: ['Useful for updating specific entity types', 'Allows for incremental data updates']
            }
          ]
        }
      ]
    };
  }

  private getPreparationSection(): DocumentationSection {
    return {
      id: 'preparation',
      title: 'Data Preparation',
      content: 'Proper data preparation is crucial for a successful import. Follow these guidelines to ensure your data is ready.',
      subsections: [
        {
          id: 'data-collection',
          title: 'Data Collection',
          content: 'Gather all necessary information before starting the import process.',
          tips: [
            'Collect complete information for all entities',
            'Ensure data consistency across all records',
            'Verify accuracy of all information',
            'Have backup copies of your original data'
          ]
        },
        {
          id: 'data-cleaning',
          title: 'Data Cleaning',
          content: 'Clean your data to avoid import issues.',
          tips: [
            'Remove duplicate entries',
            'Standardize naming conventions',
            'Fix formatting inconsistencies',
            'Remove empty rows and columns',
            'Validate email addresses and other formatted fields'
          ],
          warnings: [
            'Inconsistent data formats can cause import failures',
            'Duplicate entries may create conflicts during import'
          ]
        }
      ]
    };
  }

  private getTemplatesSection(): DocumentationSection {
    return {
      id: 'templates',
      title: 'Import Templates',
      content: 'Use our pre-built templates to ensure your data is formatted correctly.',
      subsections: [
        {
          id: 'template-download',
          title: 'Downloading Templates',
          content: 'Templates are available for download from the Templates section of the import interface.',
          tips: [
            'Always use the latest template version',
            'Choose the template that matches your import needs',
            'Templates include sample data to guide you'
          ]
        },
        {
          id: 'template-usage',
          title: 'Using Templates',
          content: 'Follow these steps when using templates:',
          tips: [
            'Do not modify column headers',
            'Replace sample data with your actual data',
            'Follow the format examples provided',
            'Remove all sample data before importing'
          ],
          warnings: [
            'Modifying column headers may cause mapping issues',
            'Leaving sample data will import incorrect information'
          ]
        }
      ]
    };
  }

  private getImportProcessSection(): DocumentationSection {
    return {
      id: 'import-process',
      title: 'Import Process',
      content: 'The import process consists of several steps, each designed to ensure data accuracy and integrity.',
      subsections: this.getImportSteps().map(step => ({
        id: `step-${step.step}`,
        title: `Step ${step.step}: ${step.title}`,
        content: step.description,
        tips: step.tips || [],
        warnings: step.commonIssues?.map(issue => `Common issue: ${issue}`) || []
      }))
    };
  }

  private getValidationSection(): DocumentationSection {
    return {
      id: 'validation',
      title: 'Data Validation',
      content: 'The system performs comprehensive validation to ensure data quality and prevent conflicts.',
      subsections: [
        {
          id: 'validation-types',
          title: 'Types of Validation',
          content: 'The system performs several types of validation:',
          subsections: [
            {
              id: 'format-validation',
              title: 'Format Validation',
              content: 'Ensures all data follows the required formats (dates, times, emails, etc.)'
            },
            {
              id: 'business-rules',
              title: 'Business Rules Validation',
              content: 'Checks business logic constraints (capacity limits, time conflicts, etc.)'
            },
            {
              id: 'relationship-validation',
              title: 'Relationship Validation',
              content: 'Verifies that entity relationships are valid and consistent'
            }
          ]
        },
        {
          id: 'validation-results',
          title: 'Understanding Validation Results',
          content: 'Validation results are categorized by severity:',
          subsections: [
            {
              id: 'errors',
              title: 'Errors (Red)',
              content: 'Critical issues that must be fixed before import can proceed',
              warnings: ['Import cannot continue with unresolved errors']
            },
            {
              id: 'warnings',
              title: 'Warnings (Yellow)',
              content: 'Potential issues that should be reviewed but do not prevent import',
              tips: ['Review warnings carefully to avoid unexpected results']
            },
            {
              id: 'info',
              title: 'Information (Blue)',
              content: 'Informational messages about the import process'
            }
          ]
        }
      ]
    };
  }

  private getTroubleshootingSection(): DocumentationSection {
    return {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: 'Common issues and their solutions.',
      subsections: [
        {
          id: 'file-upload-issues',
          title: 'File Upload Issues',
          content: 'Solutions for common file upload problems:',
          subsections: [
            {
              id: 'file-too-large',
              title: 'File Too Large',
              content: 'If your file exceeds the 10MB limit:',
              tips: [
                'Split your data into smaller files',
                'Remove unnecessary columns',
                'Use CSV format instead of Excel',
                'Compress images or remove formatting from Excel files'
              ]
            },
            {
              id: 'unsupported-format',
              title: 'Unsupported File Format',
              content: 'If your file format is not supported:',
              tips: [
                'Convert to CSV, XLSX, or XLS format',
                'Ensure file extension matches the actual format',
                'Check that the file is not corrupted'
              ]
            }
          ]
        },
        {
          id: 'validation-errors',
          title: 'Validation Errors',
          content: 'How to resolve common validation errors:',
          subsections: [
            {
              id: 'format-errors',
              title: 'Format Errors',
              content: 'When data doesn\'t match required formats:',
              tips: [
                'Check time formats (use HH:MM, 24-hour)',
                'Verify email addresses are valid',
                'Ensure numbers don\'t contain formatting characters',
                'Check that required fields are not empty'
              ]
            },
            {
              id: 'conflict-errors',
              title: 'Scheduling Conflicts',
              content: 'When the system detects scheduling conflicts:',
              tips: [
                'Check for double-booked venues',
                'Verify lecturer availability',
                'Ensure student groups don\'t have overlapping sessions',
                'Review time slots for accuracy'
              ]
            }
          ]
        }
      ]
    };
  }

  private getBestPracticesSection(): DocumentationSection {
    return {
      id: 'best-practices',
      title: 'Best Practices',
      content: 'Follow these best practices for successful imports.',
      subsections: [
        {
          id: 'data-preparation-best-practices',
          title: 'Data Preparation',
          content: 'Best practices for preparing your data:',
          tips: [
            'Start with a small test file to verify the process',
            'Use consistent naming conventions throughout',
            'Validate your data before uploading',
            'Keep backup copies of your original data',
            'Document any data transformations you make'
          ]
        },
        {
          id: 'import-execution-best-practices',
          title: 'Import Execution',
          content: 'Best practices during the import process:',
          tips: [
            'Review all validation results carefully',
            'Test with a subset of data first',
            'Schedule imports during low-usage periods',
            'Monitor the import progress',
            'Verify results after import completion'
          ]
        },
        {
          id: 'post-import-best-practices',
          title: 'Post-Import',
          content: 'Best practices after completing an import:',
          tips: [
            'Review the import report thoroughly',
            'Verify that all data was imported correctly',
            'Check for any unexpected conflicts or issues',
            'Update any related configurations or settings',
            'Document the import process for future reference'
          ]
        }
      ]
    };
  }
}