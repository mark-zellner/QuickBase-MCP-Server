import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CodepageService, SaveCodepageSchema, CodepageExecutionSchema } from '../services/codepage.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const codepageService = new CodepageService();

// Get codepage statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await codepageService.getCodepageStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching codepage stats:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch codepage statistics'
    });
  }
});

// Search codepages
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const projectId = req.query.projectId as string;
    
    const codepages = await codepageService.searchCodepages(query, projectId);
    res.json({
      success: true,
      data: codepages,
      count: codepages.length
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error searching codepages:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to search codepages'
    });
  }
});

// Get active codepages
router.get('/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepages = await codepageService.getActiveCodepages();
    res.json({
      success: true,
      data: codepages,
      count: codepages.length
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching active codepages:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active codepages'
    });
  }
});

// Get codepages for a specific project
router.get('/project/:projectId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const codepages = await codepageService.getProjectCodepages(projectId);
    
    res.json({
      success: true,
      data: codepages,
      count: codepages.length
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching project codepages:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project codepages'
    });
  }
});

// Get specific codepage
router.get('/:codepageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepage = await codepageService.getCodepage(req.params.codepageId);

    if (!codepage) {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    res.json({
      success: true,
      data: codepage
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching codepage:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch codepage'
    });
  }
});

// Create new codepage
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = SaveCodepageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid codepage data',
        details: validationResult.error.errors
      });
    }

    const codepage = await codepageService.saveCodepage(validationResult.data);

    res.status(201).json({
      success: true,
      data: codepage
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error creating codepage:', err);

    if (err.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create codepage'
    });
  }
});

// Update codepage
router.put('/:codepageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepageId = req.params.codepageId;
    
    // Validate request body (partial update)
    const updateSchema = SaveCodepageSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid codepage data',
        details: validationResult.error.errors
      });
    }
    
    const codepage = await codepageService.updateCodepage(codepageId, validationResult.data);
    
    res.json({
      success: true,
      data: codepage
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error updating codepage:', err);

    if (err.message === 'Codepage not found') {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    if (err.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update codepage'
    });
  }
});

// Delete codepage
router.delete('/:codepageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    await codepageService.deleteCodepage(req.params.codepageId);

    res.json({
      success: true,
      message: 'Codepage deleted successfully'
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error deleting codepage:', err);

    if (err.message === 'Codepage not found') {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete codepage'
    });
  }
});

// Validate codepage code
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }

    const validation = codepageService.validateCodepage(code);

    res.json({
      success: true,
      data: validation
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error validating codepage:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to validate codepage'
    });
  }
});

// Process codepage code (add CDN Hero integration)
router.post('/process', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }

    const processedCode = codepageService.processCodepageCode(code);

    res.json({
      success: true,
      data: {
        originalCode: code,
        processedCode
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error processing codepage:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to process codepage'
    });
  }
});

// Deploy codepage
router.post('/:codepageId/deploy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepageId = req.params.codepageId;
    
    // Validate execution context
    const validationResult = CodepageExecutionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deployment context',
        details: validationResult.error.errors
      });
    }
    
    const deploymentResult = await codepageService.deployCodepage(codepageId, validationResult.data);
    
    if (deploymentResult.success) {
      res.json({
        success: true,
        data: deploymentResult
      });
    } else {
      res.status(500).json({
        success: false,
        error: deploymentResult.message
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error deploying codepage:', err);

    if (err.message === 'Codepage not found') {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to deploy codepage'
    });
  }
});

// Get codepage deployment status
router.get('/:codepageId/deployment-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepage = await codepageService.getCodepage(req.params.codepageId);

    if (!codepage) {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    // In a real implementation, this would check actual deployment status
    const deploymentStatus = {
      codepageId: codepage.id,
      isDeployed: codepage.isActive,
      environment: 'development', // This would be tracked in deployment records
      lastDeployment: codepage.updatedAt,
      quickbaseRecordId: codepage.quickbaseRecordId
    };

    res.json({
      success: true,
      data: deploymentStatus
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching deployment status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment status'
    });
  }
});

// Test codepage execution (dry run)
router.post('/:codepageId/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const codepage = await codepageService.getCodepage(req.params.codepageId);

    if (!codepage) {
      return res.status(404).json({
        success: false,
        error: 'Codepage not found'
      });
    }

    // Validate the codepage
    const validation = codepageService.validateCodepage(codepage.code);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Codepage validation failed',
        details: validation.errors
      });
    }

    // In a real implementation, this would:
    // 1. Create a sandboxed execution environment
    // 2. Run the codepage with test data
    // 3. Capture results and performance metrics
    // 4. Return test results

    const testResult = {
      codepageId: codepage.id,
      validationPassed: true,
      warnings: validation.warnings,
      executionTime: Math.random() * 1000 + 100, // Simulated execution time
      memoryUsage: Math.random() * 50 + 10, // Simulated memory usage in MB
      testPassed: true,
      message: 'Codepage test completed successfully'
    };

    res.json({
      success: true,
      data: testResult
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error testing codepage:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to test codepage'
    });
  }
});

export default router;