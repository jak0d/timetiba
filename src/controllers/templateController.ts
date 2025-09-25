import { Request, Response } from 'express';
import { TemplateService } from '../services/import/templateService';

export class TemplateController {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Get list of available templates
   */
  public getAvailableTemplates = async (_req: Request, res: Response): Promise<void> => {
    try {
      const templates = this.templateService.getAvailableTemplates();
      
      // Return template metadata without sample data for listing
      const templateList = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        fileType: template.fileType,
        version: template.version,
        columnCount: template.columns.length,
        requiredColumns: template.columns.filter(col => col.required).length
      }));

      res.json({
        success: true,
        data: templateList
      });
    } catch (error) {
      console.error('Error getting available templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get detailed template information
   */
  public getTemplateDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
        return;
      }
      const template = this.templateService.getTemplateById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: `Template with ID ${templateId} not found`
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting template details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve template details',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Download CSV template
   */
  public downloadCSVTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
        return;
      }
      const template = this.templateService.getTemplateById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: `Template with ID ${templateId} not found`
        });
        return;
      }

      const csvContent = this.templateService.generateCSVTemplate(templateId);
      const filename = `${template.name.replace(/\s+/g, '_').toLowerCase()}_template.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(csvContent);
    } catch (error) {
      console.error('Error downloading CSV template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate CSV template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Download Excel template
   */
  public downloadExcelTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
        return;
      }
      const template = this.templateService.getTemplateById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: `Template with ID ${templateId} not found`
        });
        return;
      }

      const excelBuffer = this.templateService.generateExcelTemplate(templateId);
      const filename = `${template.name.replace(/\s+/g, '_').toLowerCase()}_template.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Length', excelBuffer.length.toString());
      
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error downloading Excel template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Excel template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get template column definitions for mapping assistance
   */
  public getTemplateColumns = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
        return;
      }
      const template = this.templateService.getTemplateById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: `Template with ID ${templateId} not found`
        });
        return;
      }

      res.json({
        success: true,
        data: {
          templateId: template.id,
          templateName: template.name,
          columns: template.columns
        }
      });
    } catch (error) {
      console.error('Error getting template columns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve template columns',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}