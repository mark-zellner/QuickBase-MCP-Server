import { SchemaService } from '../../services/schema.js';

// Mock the MCP server calls
jest.mock('axios');

describe('SchemaService', () => {
  let schemaService: SchemaService;

  beforeEach(() => {
    schemaService = new SchemaService();
    // Clear any existing change logs
    (schemaService as any).changeLog.clear();
  });

  describe('createTable', () => {
    it('should create a table successfully', async () => {
      const definition = {
        name: 'Test Table',
        description: 'A test table',
        fields: [
          {
            label: 'Name',
            fieldType: 'text',
            required: true
          },
          {
            label: 'Email',
            fieldType: 'email',
            required: true,
            unique: true
          }
        ]
      };

      // Mock successful MCP response
      const mockMCPResponse = {
        success: true,
        data: { tableId: 'table-123' }
      };

      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue(mockMCPResponse);
      jest.spyOn(schemaService, 'createField').mockResolvedValue({
        success: true,
        data: { fieldId: 123 }
      });

      const result = await schemaService.createTable(definition, 'user-001');

      expect(result.success).toBe(true);
      expect(result.data?.tableId).toBe('table-123');
    });

    it('should fail validation for invalid table definition', async () => {
      const invalidDefinition = {
        name: '', // Empty name should fail validation
        description: 'Invalid table',
        fields: []
      };

      const result = await schemaService.createTable(invalidDefinition, 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle MCP server errors', async () => {
      const definition = {
        name: 'Test Table',
        description: 'A test table',
        fields: []
      };

      // Mock MCP server error
      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: 'MCP server error'
        }
      });

      const result = await schemaService.createTable(definition, 'user-001');

      expect(result.success).toBe(false);
    });

    it('should rollback on field creation failure', async () => {
      const definition = {
        name: 'Test Table',
        description: 'A test table',
        fields: [
          {
            label: 'Invalid Field',
            fieldType: 'invalid_type'
          }
        ]
      };

      // Mock successful table creation but failed field creation
      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: { tableId: 'table-123' }
      });

      jest.spyOn(schemaService, 'createField').mockResolvedValue({
        success: false,
        error: { code: 'FIELD_ERROR', message: 'Invalid field type' }
      });

      const rollbackSpy = jest.spyOn(schemaService as any, 'rollbackTableCreation').mockResolvedValue(undefined);

      const result = await schemaService.createTable(definition, 'user-001');

      expect(result.success).toBe(false);
      expect(rollbackSpy).toHaveBeenCalledWith('table-123');
    });
  });

  describe('createField', () => {
    it('should create a field successfully', async () => {
      const fieldDefinition = {
        label: 'Test Field',
        fieldType: 'text',
        required: true,
        unique: false
      };

      // Mock successful MCP response
      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: { fieldId: 456 }
      });

      const result = await schemaService.createField('table-123', fieldDefinition, 'user-001');

      expect(result.success).toBe(true);
      expect(result.data?.fieldId).toBe(456);
    });

    it('should validate field definition', async () => {
      const invalidFieldDefinition = {
        label: '', // Empty label should fail validation
        fieldType: 'text'
      };

      const result = await schemaService.createField('table-123', invalidFieldDefinition, 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle choice fields correctly', async () => {
      const choiceFieldDefinition = {
        label: 'Status',
        fieldType: 'text_choice',
        choices: ['Active', 'Inactive', 'Pending']
      };

      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: { fieldId: 789 }
      });

      const result = await schemaService.createField('table-123', choiceFieldDefinition, 'user-001');

      expect(result.success).toBe(true);
    });
  });

  describe('updateField', () => {
    it('should update a field successfully', async () => {
      const updates = {
        label: 'Updated Field Name',
        required: false
      };

      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: { fieldId: 456 }
      });

      const result = await schemaService.updateField('table-123', 456, updates, 'user-001');

      expect(result.success).toBe(true);
    });

    it('should validate field updates', async () => {
      const invalidUpdates = {
        label: '', // Empty label should fail validation
        fieldType: 'invalid_type'
      };

      const result = await schemaService.updateField('table-123', 456, invalidUpdates, 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteField', () => {
    it('should delete a field successfully', async () => {
      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: {}
      });

      const result = await schemaService.deleteField('table-123', 456, 'user-001');

      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: false,
        error: {
          code: 'FIELD_IN_USE',
          message: 'Field is referenced by other tables'
        }
      });

      const result = await schemaService.deleteField('table-123', 456, 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FIELD_IN_USE');
    });
  });

  describe('createRelationship', () => {
    it('should create a relationship successfully', async () => {
      const relationshipDef = {
        parentTableId: 'parent-table',
        childTableId: 'child-table',
        foreignKeyFieldId: 123
      };

      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: { relationshipId: 'rel-123' }
      });

      const result = await schemaService.createRelationship(relationshipDef, 'user-001');

      expect(result.success).toBe(true);
    });

    it('should validate relationship definition', async () => {
      const invalidRelationshipDef = {
        parentTableId: '', // Empty parent table ID
        childTableId: 'child-table',
        foreignKeyFieldId: 123
      };

      const result = await schemaService.createRelationship(invalidRelationshipDef, 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('validateTableDefinition', () => {
    it('should validate correct table definition', async () => {
      const validDefinition = {
        name: 'Valid Table',
        description: 'A valid table definition',
        fields: [
          {
            label: 'Name',
            fieldType: 'text',
            required: true
          }
        ]
      };

      const result = await (schemaService as any).validateTableDefinition(validDefinition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid table name', async () => {
      const invalidDefinition = {
        name: '', // Empty name
        description: 'Invalid table',
        fields: []
      };

      const result = await (schemaService as any).validateTableDefinition(invalidDefinition);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: any) => e.message.includes('name'))).toBe(true);
    });

    it('should detect invalid field definitions', async () => {
      const invalidDefinition = {
        name: 'Valid Table',
        description: 'Table with invalid fields',
        fields: [
          {
            label: '', // Empty label
            fieldType: 'text'
          },
          {
            label: 'Valid Field',
            fieldType: 'invalid_type' // Invalid field type
          }
        ]
      };

      const result = await (schemaService as any).validateTableDefinition(invalidDefinition);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for best practices', async () => {
      const definitionWithWarnings = {
        name: 'table_with_underscores', // Should warn about naming convention
        description: 'A table that might have performance issues',
        fields: Array.from({ length: 100 }, (_, i) => ({ // Too many fields
          label: `Field ${i}`,
          fieldType: 'text'
        }))
      };

      const result = await (schemaService as any).validateTableDefinition(definitionWithWarnings);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFieldDefinition', () => {
    it('should validate correct field definition', async () => {
      const validField = {
        label: 'Valid Field',
        fieldType: 'text',
        required: true,
        unique: false
      };

      const result = await (schemaService as any).validateFieldDefinition('table-123', validField);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field label', async () => {
      const invalidField = {
        label: '', // Empty label
        fieldType: 'text'
      };

      const result = await (schemaService as any).validateFieldDefinition('table-123', invalidField);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.message.includes('label'))).toBe(true);
    });

    it('should detect invalid field type', async () => {
      const invalidField = {
        label: 'Valid Label',
        fieldType: 'invalid_type'
      };

      const result = await (schemaService as any).validateFieldDefinition('table-123', invalidField);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.message.includes('field type'))).toBe(true);
    });

    it('should validate choice fields', async () => {
      const choiceField = {
        label: 'Status',
        fieldType: 'text_choice',
        choices: [] // Empty choices should be invalid
      };

      const result = await (schemaService as any).validateFieldDefinition('table-123', choiceField);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.message.includes('choices'))).toBe(true);
    });
  });

  describe('getChangeLog', () => {
    it('should return change log entries', async () => {
      // Create some test change log entries
      const changeLog1 = {
        id: 'change-001',
        type: 'create' as const,
        tableId: 'table-123',
        changes: { name: 'Test Table' },
        authorId: 'user-001',
        timestamp: new Date(),
        status: 'applied' as const
      };

      (schemaService as any).changeLog.set('change-001', changeLog1);

      const result = await schemaService.getChangeLog();

      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.[0].id).toBe('change-001');
    });

    it('should filter change log by table ID', async () => {
      const changeLog1 = {
        id: 'change-001',
        type: 'create' as const,
        tableId: 'table-123',
        changes: {},
        authorId: 'user-001',
        timestamp: new Date(),
        status: 'applied' as const
      };

      const changeLog2 = {
        id: 'change-002',
        type: 'update' as const,
        tableId: 'table-456',
        changes: {},
        authorId: 'user-001',
        timestamp: new Date(),
        status: 'applied' as const
      };

      (schemaService as any).changeLog.set('change-001', changeLog1);
      (schemaService as any).changeLog.set('change-002', changeLog2);

      const result = await schemaService.getChangeLog('table-123');

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].tableId).toBe('table-123');
    });
  });

  describe('rollbackChange', () => {
    it('should rollback a change successfully', async () => {
      const changeLog = {
        id: 'change-001',
        type: 'create' as const,
        tableId: 'table-123',
        changes: { name: 'Test Table' },
        authorId: 'user-001',
        timestamp: new Date(),
        status: 'applied' as const,
        rollbackData: { tableId: 'table-123' }
      };

      (schemaService as any).changeLog.set('change-001', changeLog);

      jest.spyOn(schemaService as any, 'callMCPServer').mockResolvedValue({
        success: true,
        data: {}
      });

      const result = await (schemaService as any).rollbackChange('change-001', 'user-002');

      expect(result.success).toBe(true);
    });

    it('should handle rollback of non-existent change', async () => {
      const result = await (schemaService as any).rollbackChange('nonexistent-change', 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CHANGE_NOT_FOUND');
    });
  });

  describe('utility methods', () => {
    it('should generate unique change IDs', () => {
      const id1 = (schemaService as any).generateChangeId();
      const id2 = (schemaService as any).generateChangeId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate unique request IDs', () => {
      const id1 = (schemaService as any).generateRequestId();
      const id2 = (schemaService as any).generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });
});