import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TemplateService, CreateTemplateSchema, UpdateTemplateSchema, TemplateCategory } from '../services/template.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const templateService = new TemplateService();

// Get all public templates
router.get('/public', async (req: Request, res: Response) => {
  try {
    const templates = await templateService.getPublicTemplates();
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching public templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public templates'
    });
  }
});

// Get templates by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as TemplateCategory;
    
    // Validate category
    if (!Object.values(TemplateCategory).includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template category'
      });
    }
    
    const templates = await templateService.getTemplatesByCategory(category);
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates by category'
    });
  }
});

// Search templates
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const category = req.query.category as TemplateCategory;
    
    const templates = await templateService.searchTemplates(query, category);
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search templates'
    });
  }
});

// Get template stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = templateService.getTemplateStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template stats'
    });
  }
});

// Get specific template
router.get('/:templateId', async (req: Request, res: Response) => {
  try {
    const template = await templateService.getTemplate(req.params.templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Protected routes (require authentication)

// Get all templates (including private ones for authenticated users)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const templates = await templateService.getAllTemplates();
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching all templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// Get user's templates
router.get('/user/mine', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const templates = await templateService.getUserTemplates(userId);
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user templates'
    });
  }
});

// Create new template
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Validate request body
    const validationResult = CreateTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template data',
        details: validationResult.error.errors
      });
    }
    
    // Validate template code
    const codeValidation = templateService.validateTemplateCode(validationResult.data.code);
    if (!codeValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Template code validation failed',
        details: codeValidation.errors
      });
    }
    
    const template = await templateService.createTemplate(validationResult.data, userId);
    
    // Save to QuickBase if possible
    try {
      await templateService.saveTemplateToQuickBase(template.id);
    } catch (error) {
      console.warn('Failed to save template to QuickBase:', error);
      // Continue anyway - local storage is sufficient
    }
    
    res.status(201).json({
      success: true,
      data: template,
      warnings: codeValidation.warnings
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// Update template
router.put('/:templateId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Validate request body
    const validationResult = UpdateTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template data',
        details: validationResult.error.errors
      });
    }
    
    // Validate template code if provided
    let codeValidation = { isValid: true, errors: [], warnings: [] };
    if (validationResult.data.code) {
      codeValidation = templateService.validateTemplateCode(validationResult.data.code);
      if (!codeValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Template code validation failed',
          details: codeValidation.errors
        });
      }
    }
    
    const template = await templateService.updateTemplate(
      req.params.templateId,
      validationResult.data,
      userId
    );
    
    res.json({
      success: true,
      data: template,
      warnings: codeValidation.warnings
    });
  } catch (error) {
    console.error('Error updating template:', error);
    
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    if (error.message === 'Insufficient permissions to update template') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update template'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/:templateId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    await templateService.deleteTemplate(req.params.templateId, userId);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    if (error.message === 'Insufficient permissions to delete template') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete template'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// Validate template code
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }
    
    const validation = templateService.validateTemplateCode(code);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating template code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate template code'
    });
  }
});

// Process template code (add CDN Hero integration)
router.post('/process', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, config } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }
    
    const processedCode = templateService.processTemplateCode(code, config || {});
    
    res.json({
      success: true,
      data: {
        originalCode: code,
        processedCode,
        config: config || {}
      }
    });
  } catch (error) {
    console.error('Error processing template code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process template code'
    });
  }
});

export default router;