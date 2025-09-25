import { Request, Response } from 'express';
import { DocumentationService } from '../services/import/documentationService';

export class DocumentationController {
  private documentationService: DocumentationService;

  constructor() {
    this.documentationService = new DocumentationService();
  }

  /**
   * Get complete import documentation
   */
  public getImportDocumentation = async (_req: Request, res: Response): Promise<void> => {
    try {
      const documentation = this.documentationService.getImportDocumentation();
      res.json({
        success: true,
        data: documentation
      });
    } catch (error) {
      console.error('Error getting import documentation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve import documentation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get contextual help for a specific import step
   */
  public getContextualHelp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { step } = req.params;
      
      if (!step) {
        res.status(400).json({
          success: false,
          message: 'Step parameter is required'
        });
        return;
      }

      const help = this.documentationService.getContextualHelp(step);
      
      if (!help) {
        res.status(404).json({
          success: false,
          message: `No help found for step: ${step}`
        });
        return;
      }

      res.json({
        success: true,
        data: help
      });
    } catch (error) {
      console.error('Error getting contextual help:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve contextual help',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get validation rules documentation
   */
  public getValidationRules = async (_req: Request, res: Response): Promise<void> => {
    try {
      const rules = this.documentationService.getValidationRules();
      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Error getting validation rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve validation rules',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get step-by-step import process
   */
  public getImportSteps = async (_req: Request, res: Response): Promise<void> => {
    try {
      const steps = this.documentationService.getImportSteps();
      res.json({
        success: true,
        data: steps
      });
    } catch (error) {
      console.error('Error getting import steps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve import steps',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get format requirements documentation
   */
  public getFormatRequirements = async (_req: Request, res: Response): Promise<void> => {
    try {
      const requirements = this.documentationService.getFormatRequirements();
      res.json({
        success: true,
        data: requirements
      });
    } catch (error) {
      console.error('Error getting format requirements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve format requirements',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Search documentation content
   */
  public searchDocumentation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const documentation = this.documentationService.getImportDocumentation();
      const searchResults = this.searchInDocumentation(documentation, query.toLowerCase());

      res.json({
        success: true,
        data: {
          query,
          results: searchResults,
          totalResults: searchResults.length
        }
      });
    } catch (error) {
      console.error('Error searching documentation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search documentation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get documentation section by ID
   */
  public getDocumentationSection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sectionId } = req.params;
      
      if (!sectionId) {
        res.status(400).json({
          success: false,
          message: 'Section ID is required'
        });
        return;
      }

      const documentation = this.documentationService.getImportDocumentation();
      const section = this.findSectionById(documentation.sections, sectionId);

      if (!section) {
        res.status(404).json({
          success: false,
          message: `Documentation section not found: ${sectionId}`
        });
        return;
      }

      res.json({
        success: true,
        data: section
      });
    } catch (error) {
      console.error('Error getting documentation section:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve documentation section',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Search within documentation content
   */
  private searchInDocumentation(documentation: any, query: string): any[] {
    const results: any[] = [];

    const searchInSection = (section: any, path: string[] = []) => {
      const currentPath = [...path, section.title];
      
      // Search in section content
      if (section.content && section.content.toLowerCase().includes(query)) {
        results.push({
          type: 'section',
          id: section.id,
          title: section.title,
          content: section.content,
          path: currentPath,
          relevance: this.calculateRelevance(section.content, query)
        });
      }

      // Search in tips
      if (section.tips) {
        section.tips.forEach((tip: string, index: number) => {
          if (tip.toLowerCase().includes(query)) {
            results.push({
              type: 'tip',
              id: `${section.id}-tip-${index}`,
              title: `${section.title} - Tip`,
              content: tip,
              path: currentPath,
              relevance: this.calculateRelevance(tip, query)
            });
          }
        });
      }

      // Search in warnings
      if (section.warnings) {
        section.warnings.forEach((warning: string, index: number) => {
          if (warning.toLowerCase().includes(query)) {
            results.push({
              type: 'warning',
              id: `${section.id}-warning-${index}`,
              title: `${section.title} - Warning`,
              content: warning,
              path: currentPath,
              relevance: this.calculateRelevance(warning, query)
            });
          }
        });
      }

      // Search in examples
      if (section.examples) {
        section.examples.forEach((example: any, index: number) => {
          if (example.title.toLowerCase().includes(query) || 
              example.description.toLowerCase().includes(query) ||
              example.code.toLowerCase().includes(query)) {
            results.push({
              type: 'example',
              id: `${section.id}-example-${index}`,
              title: `${section.title} - ${example.title}`,
              content: example.description,
              code: example.code,
              path: currentPath,
              relevance: this.calculateRelevance(
                `${example.title} ${example.description} ${example.code}`, 
                query
              )
            });
          }
        });
      }

      // Search in subsections
      if (section.subsections) {
        section.subsections.forEach((subsection: any) => {
          searchInSection(subsection, currentPath);
        });
      }
    };

    // Search in all sections
    documentation.sections.forEach((section: any) => {
      searchInSection(section);
    });

    // Sort by relevance (highest first)
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(content: string, query: string): number {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (lowerContent.includes(lowerQuery)) {
      score += 10;
    }
    
    // Count word matches
    const queryWords = lowerQuery.split(' ');
    const contentWords = lowerContent.split(' ');
    
    queryWords.forEach(queryWord => {
      contentWords.forEach(contentWord => {
        if (contentWord.includes(queryWord)) {
          score += 1;
        }
      });
    });
    
    // Boost score for shorter content (more focused results)
    if (content.length < 200) {
      score += 2;
    }
    
    return score;
  }

  /**
   * Find a documentation section by ID
   */
  private findSectionById(sections: any[], sectionId: string): any | null {
    for (const section of sections) {
      if (section.id === sectionId) {
        return section;
      }
      
      if (section.subsections) {
        const found = this.findSectionById(section.subsections, sectionId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }
}