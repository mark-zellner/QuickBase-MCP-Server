import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SchemaService } from '../services/schema.js';
import { AuthService } from '../services/auth.js';
import { TableDefinition, FieldDefinition, RelationshipDefinition, ApiResponse } from '../services/schema.js';

// Validation schemas
const TableDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(z.object({
    label: z.string().min(1),
    fieldType: z.string(),
    required: z.boolean().optional(),
    unique: z.boolean().optional(),
    choices: z.array(z.string()).optional(),
  })),
});

const FieldDefinitionSchema = z.object({
  label: z.string().min(1),
  fieldType: z.string(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  choices: z.array(z.string()).optional(),
});

const RelationshipDefinitionSchema = z.object({
  parentTableId: z.string(),
  childTableId: z.string(),
  foreignKeyFieldId: z.number(),
});

// Request validation schemas
const CreateTableRequestSchema = z.object({
  body: TableDefinitionSchema,
});

const UpdateTableRequestSchema = z.object({
  params: z.object({
    tableId: z.string(),
  }),
  body: TableDefinitionSchema.partial(),
});

type UpdateTableRequest = z.infer<typeof UpdateTableRequestSchema>;

const CreateFieldRequestSchema = z.object({
  params: z.object({
    tableId: z.string(),
  }),
  body: FieldDefinitionSchema,
});

type CreateFieldRequest = z.infer<typeof CreateFieldRequestSchema>;

const UpdateFieldRequestSchema = z.object({
  params: z.object({
    tableId: z.string(),
    fieldId: z.string().transform(val => parseInt(val, 10)),
  }),
  body: FieldDefinitionSchema.partial(),
});

type UpdateFieldRequest = z.infer<typeof UpdateFieldRequestSchema>;

const CreateRelationshipRequestSchema = z.object({
  body: RelationshipDefinitionSchema,
});

const GetChangeLogRequestSchema = z.object({
  query: z.object({
    tableId: z.string().optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

export function createSchemaRoutes(schemaService: SchemaService, authService: AuthService): Router {
  const router = Router();

  // Middleware to validate authentication and authorization
  const requireAuth = async (req: Request, res: Response, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const payload = authService.verifyToken(token);
      (req as any).user = payload;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  };

  // Middleware to require admin or manager role for schema modifications
  const requireSchemaPermission = (req: Request, res: Response, next: any) => {
    const user = req.user as any;
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Schema modification requires admin or manager role',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
    next();
  };

  // Table Management Routes

  // GET /api/v1/schema/tables - Get all tables
  router.get('/tables', requireAuth, async (req: Request, res: Response) => {
    try {
      // This would call the MCP server to get all tables
      // For now, return a placeholder response
      const response: ApiResponse<any[]> = {
        success: true,
        data: [],
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get tables',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // GET /api/v1/schema/tables/:tableId - Get table info
  router.get('/tables/:tableId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const result = await schemaService.getTableInfo(tableId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table info',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/tables - Create table
  router.post('/tables', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const validation = CreateTableRequestSchema.safeParse({ body: req.body });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid table definition',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const result = await schemaService.createTable(validation.data.body, (req.user as any).userId);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // PUT /api/v1/schema/tables/:tableId - Update table
  router.put('/tables/:tableId', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const validation = UpdateTableRequestSchema.safeParse({ 
        params: req.params, 
        body: req.body 
      });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid table update data',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const params = validation.data.params as { tableId: string };
      const body = validation.data.body;
      const result = await schemaService.updateTable(
        params.tableId,
        body,
        (req.user as any).userId
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // DELETE /api/v1/schema/tables/:tableId - Delete table
  router.delete('/tables/:tableId', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const result = await schemaService.deleteTable(tableId, (req.user as any).userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Field Management Routes

  // GET /api/v1/schema/tables/:tableId/fields - Get table fields
  router.get('/tables/:tableId/fields', requireAuth, async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const result = await schemaService.getTableFields(tableId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table fields',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/tables/:tableId/fields - Create field
  router.post('/tables/:tableId/fields', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const validation = CreateFieldRequestSchema.safeParse({ 
        params: req.params, 
        body: req.body 
      });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid field definition',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const params = validation.data.params as { tableId: string };
      const body = validation.data.body;
      const result = await schemaService.createField(
        params.tableId,
        body,
        (req.user as any).userId
      );
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // PUT /api/v1/schema/tables/:tableId/fields/:fieldId - Update field
  router.put('/tables/:tableId/fields/:fieldId', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const validation = UpdateFieldRequestSchema.safeParse({ 
        params: req.params, 
        body: req.body 
      });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid field update data',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const params = validation.data.params as { tableId: string; fieldId: number };
      const body = validation.data.body;
      const result = await schemaService.updateField(
        params.tableId,
        params.fieldId,
        body,
        (req.user as any).userId
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // DELETE /api/v1/schema/tables/:tableId/fields/:fieldId - Delete field
  router.delete('/tables/:tableId/fields/:fieldId', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const { tableId, fieldId } = req.params;
      const fieldIdNum = parseInt(fieldId, 10);
      
      if (isNaN(fieldIdNum)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid field ID',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const result = await schemaService.deleteField(tableId, fieldIdNum, (req.user as any).userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Relationship Management Routes

  // GET /api/v1/schema/tables/:tableId/relationships - Get table relationships
  router.get('/tables/:tableId/relationships', requireAuth, async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const result = await schemaService.getRelationships(tableId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get relationships',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/relationships - Create relationship
  router.post('/relationships', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const validation = CreateRelationshipRequestSchema.safeParse({ body: req.body });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid relationship definition',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const result = await schemaService.createRelationship(validation.data.body, (req.user as any).userId);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create relationship',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Schema Validation and Integrity Routes

  // POST /api/v1/schema/tables/:tableId/validate - Validate schema integrity
  router.post('/tables/:tableId/validate', requireAuth, async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const result = await schemaService.validateSchemaIntegrity(tableId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate schema integrity',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/validate-changes - Detect schema change conflicts
  router.post('/validate-changes', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const { changes } = req.body;
      
      if (!Array.isArray(changes)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Changes must be an array',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const result = await schemaService.detectSchemaConflicts(changes);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate schema changes',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/rollback/:changeId - Rollback schema change
  router.post('/rollback/:changeId', requireAuth, requireSchemaPermission, async (req: Request, res: Response) => {
    try {
      const { changeId } = req.params;
      const result = await schemaService.rollbackSchemaChange(changeId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rollback schema change',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Approval Workflow Routes

  // GET /api/v1/schema/approvals/pending - Get pending approvals
  router.get('/approvals/pending', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get pending schema changes that require approval
      const result = await schemaService.getChangeLog(undefined, 100);
      
      if (result.success) {
        // Filter for pending changes only
        const pendingChanges = result.data.filter((change: any) => 
          change.status === 'pending'
        );
        
        res.json({
          success: true,
          data: pendingChanges,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get pending approvals',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // GET /api/v1/schema/approvals/:changeId - Get approvals for a change
  router.get('/approvals/:changeId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { changeId } = req.params;
      
      // This would get approval records from the database
      // For now, return empty array as placeholder
      res.json({
        success: true,
        data: [],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get approvals',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // POST /api/v1/schema/approvals/:changeId - Submit approval/rejection
  router.post('/approvals/:changeId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { changeId } = req.params;
      const { action, comments } = req.body;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Action must be either "approve" or "reject"',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      // This would record the approval/rejection in the database
      // For now, return success as placeholder
      res.json({
        success: true,
        data: {
          changeId,
          action,
          approverId: (req.user as any).userId,
          comments,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit approval',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Change Log Routes

  // GET /api/v1/schema/changelog - Get schema change log
  router.get('/changelog', requireAuth, async (req: Request, res: Response) => {
    try {
      const validation = GetChangeLogRequestSchema.safeParse({ query: req.query });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const result = await schemaService.getChangeLog(
        validation.data.query.tableId,
        validation.data.query.limit
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get change log',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  return router;
}

export default createSchemaRoutes;