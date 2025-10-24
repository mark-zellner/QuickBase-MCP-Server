// Local type definitions for schema functionality
export interface TableDefinition {
  name: string;
  description?: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  label: string;
  fieldType: string;
  required?: boolean;
  unique?: boolean;
  choices?: string[];
}

export interface RelationshipDefinition {
  parentTableId: string;
  childTableId: string;
  foreignKeyFieldId: number;
}

export interface SchemaChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'table' | 'field' | 'relationship';
  entityId: string;
  changes: any;
  userId: string;
  timestamp: Date;
}

export type QuickBaseFieldType = 'text' | 'numeric' | 'date' | 'checkbox' | 'email';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Schema validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'field_conflict' | 'relationship_invalid' | 'data_integrity' | 'permission_denied';
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'best_practice';
  message: string;
  details?: any;
}

// Schema change tracking interface
export interface SchemaChangeLog {
  id: string;
  type: SchemaChange['type'];
  tableId: string;
  fieldId?: number;
  relationshipId?: string;
  changes: Record<string, any>;
  authorId: string;
  timestamp: Date;
  rollbackData?: Record<string, any>;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
}

export class SchemaService {
  private changeLog: Map<string, SchemaChangeLog> = new Map();
  private mcpServerUrl: string;

  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3003';
  }

  // Table Management Methods
  async createTable(definition: TableDefinition, authorId: string): Promise<ApiResponse<{ tableId: string }>> {
    try {
      // Validate table definition
      const validation = await this.validateTableDefinition(definition);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Table definition validation failed',
            details: validation.errors,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'table_create',
        tableId: '', // Will be set after creation
        changes: { definition },
        authorId,
        timestamp: new Date(),
        status: 'pending',
      };

      // Call MCP server to create table
      const response = await this.callMCPServer('quickbase_create_table', {
        name: definition.name,
        description: definition.description,
      });

      if (!response.success) {
        changeLog.status = 'failed';
        this.changeLog.set(changeId, changeLog);
        return response;
      }

      const tableId = response.data.tableId;
      changeLog.tableId = tableId;

      // Create fields if specified
      if (definition.fields && definition.fields.length > 0) {
        for (const field of definition.fields) {
          const fieldResult = await this.createField(tableId, field, authorId);
          if (!fieldResult.success) {
            // Rollback table creation if field creation fails
            await this.rollbackTableCreation(tableId);
            changeLog.status = 'failed';
            this.changeLog.set(changeId, changeLog);
            return fieldResult;
          }
        }
      }

      // Create relationships if specified
      if (definition.relationships && definition.relationships.length > 0) {
        for (const relationship of definition.relationships) {
          const relationshipResult = await this.createRelationship(relationship, authorId);
          if (!relationshipResult.success) {
            console.warn('Relationship creation failed:', relationshipResult.error);
            // Continue with table creation even if relationships fail
          }
        }
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
        data: { tableId },
      };
    } catch (error) {
      console.error('Error creating table:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async updateTable(tableId: string, changes: Partial<TableDefinition>, authorId: string): Promise<ApiResponse<void>> {
    try {
      // Get current table info for rollback data
      const currentTable = await this.getTableInfo(tableId);
      if (!currentTable.success) {
        return currentTable;
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'table_update',
        tableId,
        changes,
        authorId,
        timestamp: new Date(),
        rollbackData: currentTable.data,
        status: 'pending',
      };

      // Apply changes (implementation depends on what can be updated)
      // For now, we'll focus on name and description updates
      if (changes.name || changes.description) {
        // Note: QuickBase API may not support table name/description updates
        // This would need to be implemented based on available MCP methods
        console.warn('Table name/description updates may not be supported by QuickBase API');
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating table:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async deleteTable(tableId: string, authorId: string): Promise<ApiResponse<void>> {
    try {
      // Get current table info for rollback data
      const currentTable = await this.getTableInfo(tableId);
      if (!currentTable.success) {
        return currentTable;
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'table_delete',
        tableId,
        changes: {},
        authorId,
        timestamp: new Date(),
        rollbackData: currentTable.data,
        status: 'pending',
      };

      // Call MCP server to delete table
      const response = await this.callMCPServer('quickbase_delete_table', {
        tableId,
      });

      if (!response.success) {
        changeLog.status = 'failed';
        this.changeLog.set(changeId, changeLog);
        return response;
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting table:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete table',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Field Management Methods
  async createField(tableId: string, field: FieldDefinition, authorId: string): Promise<ApiResponse<{ fieldId: number }>> {
    try {
      // Validate field definition
      const validation = await this.validateFieldDefinition(tableId, field);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field definition validation failed',
            details: validation.errors,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'field_create',
        tableId,
        changes: { field },
        authorId,
        timestamp: new Date(),
        status: 'pending',
      };

      // Prepare field creation parameters
      const fieldParams: any = {
        tableId,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required || false,
        unique: field.unique || false,
      };

      // Add type-specific parameters
      if (field.choices && field.fieldType === 'text_choice') {
        fieldParams.choices = field.choices;
      }

      if (field.formula && field.fieldType === 'formula') {
        fieldParams.formula = field.formula;
      }

      if (field.lookupTableId && field.lookupFieldId && field.fieldType === 'lookup') {
        fieldParams.lookupTableId = field.lookupTableId;
        fieldParams.lookupFieldId = field.lookupFieldId;
      }

      // Call MCP server to create field
      const response = await this.callMCPServer('quickbase_create_field', fieldParams);

      if (!response.success) {
        changeLog.status = 'failed';
        this.changeLog.set(changeId, changeLog);
        return response;
      }

      const fieldId = response.data.fieldId;
      changeLog.fieldId = fieldId;
      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
        data: { fieldId },
      };
    } catch (error) {
      console.error('Error creating field:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async updateField(tableId: string, fieldId: number, changes: Partial<FieldDefinition>, authorId: string): Promise<ApiResponse<void>> {
    try {
      // Get current field info for rollback data
      const currentFields = await this.getTableFields(tableId);
      if (!currentFields.success) {
        return currentFields;
      }

      const currentField = currentFields.data.find((f: any) => f.id === fieldId);
      if (!currentField) {
        return {
          success: false,
          error: {
            code: 'FIELD_NOT_FOUND',
            message: 'Field not found',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'field_update',
        tableId,
        fieldId,
        changes,
        authorId,
        timestamp: new Date(),
        rollbackData: currentField,
        status: 'pending',
      };

      // Call MCP server to update field
      const response = await this.callMCPServer('quickbase_update_field', {
        tableId,
        fieldId,
        ...changes,
      });

      if (!response.success) {
        changeLog.status = 'failed';
        this.changeLog.set(changeId, changeLog);
        return response;
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating field:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async deleteField(tableId: string, fieldId: number, authorId: string): Promise<ApiResponse<void>> {
    try {
      // Get current field info for rollback data
      const currentFields = await this.getTableFields(tableId);
      if (!currentFields.success) {
        return currentFields;
      }

      const currentField = currentFields.data.find((f: any) => f.id === fieldId);
      if (!currentField) {
        return {
          success: false,
          error: {
            code: 'FIELD_NOT_FOUND',
            message: 'Field not found',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'field_delete',
        tableId,
        fieldId,
        changes: {},
        authorId,
        timestamp: new Date(),
        rollbackData: currentField,
        status: 'pending',
      };

      // Call MCP server to delete field
      const response = await this.callMCPServer('quickbase_delete_field', {
        tableId,
        fieldId,
      });

      if (!response.success) {
        changeLog.status = 'failed';
        this.changeLog.set(changeId, changeLog);
        return response;
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting field:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete field',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Relationship Management Methods
  async createRelationship(relationship: RelationshipDefinition, authorId: string): Promise<ApiResponse<{ relationshipId: string }>> {
    try {
      // Validate relationship
      const validation = await this.validateRelationship(relationship);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Relationship validation failed',
            details: validation.errors,
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Create change log entry
      const changeId = this.generateChangeId();
      const relationshipId = this.generateRelationshipId();
      const changeLog: SchemaChangeLog = {
        id: changeId,
        type: 'relationship_create',
        tableId: relationship.childTableId,
        relationshipId,
        changes: { relationship },
        authorId,
        timestamp: new Date(),
        status: 'pending',
      };

      // Use advanced relationship creation if lookup fields are specified
      if (relationship.lookupFields && relationship.lookupFields.length > 0) {
        const response = await this.callMCPServer('quickbase_create_advanced_relationship', {
          parentTableId: relationship.parentTableId,
          childTableId: relationship.childTableId,
          referenceFieldLabel: `Related ${relationship.parentTableId}`,
          relationshipType: relationship.type || 'one-to-many',
          lookupFields: relationship.lookupFields,
        });

        if (!response.success) {
          changeLog.status = 'failed';
          this.changeLog.set(changeId, changeLog);
          return response;
        }
      } else {
        // Create basic relationship
        const response = await this.callMCPServer('quickbase_create_relationship', {
          parentTableId: relationship.parentTableId,
          childTableId: relationship.childTableId,
          foreignKeyFieldId: relationship.foreignKeyFieldId,
        });

        if (!response.success) {
          changeLog.status = 'failed';
          this.changeLog.set(changeId, changeLog);
          return response;
        }
      }

      changeLog.status = 'applied';
      this.changeLog.set(changeId, changeLog);

      return {
        success: true,
        data: { relationshipId },
      };
    } catch (error) {
      console.error('Error creating relationship:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create relationship',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Schema Information Methods
  async getTableInfo(tableId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.callMCPServer('quickbase_get_table_info', { tableId });
      return response;
    } catch (error) {
      console.error('Error getting table info:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table info',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async getTableFields(tableId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.callMCPServer('quickbase_get_table_fields', { tableId });
      return response;
    } catch (error) {
      console.error('Error getting table fields:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table fields',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  async getRelationships(tableId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.callMCPServer('quickbase_get_relationships', { tableId });
      return response;
    } catch (error) {
      console.error('Error getting relationships:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get relationships',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Change Log Methods
  async getChangeLog(tableId?: string, limit: number = 50): Promise<ApiResponse<SchemaChangeLog[]>> {
    try {
      let changes = Array.from(this.changeLog.values());
      
      if (tableId) {
        changes = changes.filter(change => change.tableId === tableId);
      }

      // Sort by timestamp (newest first)
      changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply limit
      changes = changes.slice(0, limit);

      return {
        success: true,
        data: changes,
      };
    } catch (error) {
      console.error('Error getting change log:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get change log',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Schema Validation and Integrity Checking Methods
  async validateSchemaIntegrity(tableId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Get table information
      const tableInfo = await this.getTableInfo(tableId);
      if (!tableInfo.success) {
        errors.push({
          type: 'data_integrity',
          message: 'Unable to retrieve table information',
          details: tableInfo.error,
        });
        return { isValid: false, errors, warnings };
      }

      // Get table fields
      const fieldsResult = await this.getTableFields(tableId);
      if (!fieldsResult.success) {
        errors.push({
          type: 'data_integrity',
          message: 'Unable to retrieve table fields',
          details: fieldsResult.error,
        });
        return { isValid: false, errors, warnings };
      }

      // Get relationships
      const relationshipsResult = await this.getRelationships(tableId);
      if (!relationshipsResult.success) {
        warnings.push({
          type: 'compatibility',
          message: 'Unable to retrieve relationships - continuing validation',
          details: relationshipsResult.error,
        });
      }

      // Validate field integrity
      const fieldValidation = await this.validateFieldIntegrity(fieldsResult.data);
      errors.push(...fieldValidation.errors);
      warnings.push(...fieldValidation.warnings);

      // Validate relationship integrity
      if (relationshipsResult.success) {
        const relationshipValidation = await this.validateRelationshipIntegrity(
          tableId,
          relationshipsResult.data
        );
        errors.push(...relationshipValidation.errors);
        warnings.push(...relationshipValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        type: 'data_integrity',
        message: 'Schema integrity validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      return { isValid: false, errors, warnings };
    }
  }

  async detectSchemaConflicts(changes: SchemaChange[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Group changes by table
      const changesByTable = new Map<string, SchemaChange[]>();
      for (const change of changes) {
        if (!changesByTable.has(change.tableId)) {
          changesByTable.set(change.tableId, []);
        }
        changesByTable.get(change.tableId)!.push(change);
      }

      // Check for conflicts within each table
      for (const [tableId, tableChanges] of changesByTable) {
        const tableConflicts = await this.detectTableConflicts(tableId, tableChanges);
        errors.push(...tableConflicts.errors);
        warnings.push(...tableConflicts.warnings);
      }

      // Check for cross-table conflicts
      const crossTableConflicts = await this.detectCrossTableConflicts(changes);
      errors.push(...crossTableConflicts.errors);
      warnings.push(...crossTableConflicts.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        type: 'data_integrity',
        message: 'Conflict detection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      return { isValid: false, errors, warnings };
    }
  }

  async rollbackSchemaChange(changeId: string): Promise<ApiResponse<void>> {
    try {
      const change = this.changeLog.get(changeId);
      if (!change) {
        return {
          success: false,
          error: {
            code: 'CHANGE_NOT_FOUND',
            message: 'Schema change not found',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      if (change.status !== 'applied') {
        return {
          success: false,
          error: {
            code: 'INVALID_ROLLBACK',
            message: 'Can only rollback applied changes',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
          },
        };
      }

      // Perform rollback based on change type
      let rollbackResult: ApiResponse<any>;

      switch (change.type) {
        case 'table_create':
          rollbackResult = await this.rollbackTableCreation(change.tableId);
          break;
        case 'table_delete':
          rollbackResult = await this.rollbackTableDeletion(change);
          break;
        case 'field_create':
          rollbackResult = await this.rollbackFieldCreation(change);
          break;
        case 'field_delete':
          rollbackResult = await this.rollbackFieldDeletion(change);
          break;
        case 'field_update':
          rollbackResult = await this.rollbackFieldUpdate(change);
          break;
        case 'relationship_create':
          rollbackResult = await this.rollbackRelationshipCreation(change);
          break;
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_ROLLBACK',
              message: `Rollback not supported for change type: ${change.type}`,
              timestamp: new Date().toISOString(),
              requestId: this.generateRequestId(),
            },
          };
      }

      if (rollbackResult.success) {
        change.status = 'rolled_back';
        this.changeLog.set(changeId, change);
      }

      return rollbackResult;
    } catch (error) {
      console.error('Error rolling back schema change:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rollback schema change',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }

  // Private validation methods
  private async validateTableDefinition(definition: TableDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!definition.name || definition.name.trim().length === 0) {
      errors.push({
        type: 'field_conflict',
        message: 'Table name is required',
      });
    }

    // Name length validation
    if (definition.name && definition.name.length > 100) {
      errors.push({
        type: 'field_conflict',
        message: 'Table name must be 100 characters or less',
      });
    }

    // Name format validation
    if (definition.name && !/^[a-zA-Z][a-zA-Z0-9_\s]*$/.test(definition.name)) {
      errors.push({
        type: 'field_conflict',
        message: 'Table name must start with a letter and contain only letters, numbers, underscores, and spaces',
      });
    }

    // Field validation
    if (definition.fields && definition.fields.length > 0) {
      const fieldLabels = new Set<string>();
      for (const field of definition.fields) {
        // Check for duplicate field labels
        if (fieldLabels.has(field.label)) {
          errors.push({
            type: 'field_conflict',
            message: `Duplicate field label: ${field.label}`,
          });
        }
        fieldLabels.add(field.label);

        // Validate individual field
        const fieldValidation = await this.validateFieldDefinition('', field);
        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);
      }

      // Check for too many fields
      if (definition.fields.length > 500) {
        warnings.push({
          type: 'performance',
          message: 'Tables with more than 500 fields may have performance issues',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async validateFieldDefinition(tableId: string, field: FieldDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!field.label || field.label.trim().length === 0) {
      errors.push({
        type: 'field_conflict',
        message: 'Field label is required',
      });
    }

    // Label length validation
    if (field.label && field.label.length > 255) {
      errors.push({
        type: 'field_conflict',
        message: 'Field label must be 255 characters or less',
      });
    }

    // Field type validation
    if (!field.fieldType) {
      errors.push({
        type: 'field_conflict',
        message: 'Field type is required',
      });
    }

    // Type-specific validation
    if (field.fieldType === 'text_choice' && (!field.choices || field.choices.length === 0)) {
      errors.push({
        type: 'field_conflict',
        message: 'Choice fields must have at least one choice option',
      });
    }

    if (field.fieldType === 'formula' && (!field.formula || field.formula.trim().length === 0)) {
      errors.push({
        type: 'field_conflict',
        message: 'Formula fields must have a formula',
      });
    }

    if (field.fieldType === 'lookup') {
      if (!field.lookupTableId) {
        errors.push({
          type: 'field_conflict',
          message: 'Lookup fields must specify a lookup table ID',
        });
      }
      if (!field.lookupFieldId) {
        errors.push({
          type: 'field_conflict',
          message: 'Lookup fields must specify a lookup field ID',
        });
      }
    }

    // Choice validation
    if (field.choices && field.choices.length > 1000) {
      warnings.push({
        type: 'performance',
        message: 'Fields with more than 1000 choices may have performance issues',
      });
    }

    // Formula validation
    if (field.formula && field.formula.length > 10000) {
      warnings.push({
        type: 'performance',
        message: 'Very long formulas may impact performance',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async validateRelationship(relationship: RelationshipDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!relationship.parentTableId || !relationship.childTableId) {
      errors.push({
        type: 'relationship_invalid',
        message: 'Parent and child table IDs are required',
      });
    }

    // Self-referencing relationship check
    if (relationship.parentTableId === relationship.childTableId) {
      warnings.push({
        type: 'best_practice',
        message: 'Self-referencing relationships should be used carefully',
      });
    }

    // Foreign key validation
    if (!relationship.foreignKeyFieldId && relationship.type === 'one-to-many') {
      errors.push({
        type: 'relationship_invalid',
        message: 'One-to-many relationships require a foreign key field ID',
      });
    }

    // Lookup fields validation
    if (relationship.lookupFields && relationship.lookupFields.length > 0) {
      for (const lookupField of relationship.lookupFields) {
        if (!lookupField.parentFieldId) {
          errors.push({
            type: 'relationship_invalid',
            message: 'Lookup field must specify parent field ID',
          });
        }
        if (!lookupField.childFieldLabel || lookupField.childFieldLabel.trim().length === 0) {
          errors.push({
            type: 'relationship_invalid',
            message: 'Lookup field must specify child field label',
          });
        }
      }

      // Too many lookup fields warning
      if (relationship.lookupFields.length > 20) {
        warnings.push({
          type: 'performance',
          message: 'Relationships with many lookup fields may impact performance',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async validateFieldIntegrity(fields: any[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for required system fields
    const hasRecordId = fields.some(f => f.fieldType === 'recordid' || f.id === 3);
    if (!hasRecordId) {
      warnings.push({
        type: 'compatibility',
        message: 'Table should have a Record ID field',
      });
    }

    // Check for duplicate field labels
    const labelCounts = new Map<string, number>();
    for (const field of fields) {
      const count = labelCounts.get(field.label) || 0;
      labelCounts.set(field.label, count + 1);
    }

    for (const [label, count] of labelCounts) {
      if (count > 1) {
        errors.push({
          type: 'field_conflict',
          message: `Duplicate field label found: ${label}`,
        });
      }
    }

    // Check for orphaned lookup fields
    for (const field of fields) {
      if (field.fieldType === 'lookup' && field.lookupTableId) {
        // This would need to verify the lookup table exists
        // For now, we'll add a warning
        warnings.push({
          type: 'compatibility',
          message: `Lookup field "${field.label}" references table ${field.lookupTableId} - verify table exists`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async validateRelationshipIntegrity(tableId: string, relationships: any[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const relationship of relationships) {
      // Check if related tables exist
      if (relationship.parentTableId && relationship.parentTableId !== tableId) {
        const parentTableResult = await this.getTableInfo(relationship.parentTableId);
        if (!parentTableResult.success) {
          errors.push({
            type: 'relationship_invalid',
            message: `Parent table ${relationship.parentTableId} not found`,
          });
        }
      }

      if (relationship.childTableId && relationship.childTableId !== tableId) {
        const childTableResult = await this.getTableInfo(relationship.childTableId);
        if (!childTableResult.success) {
          errors.push({
            type: 'relationship_invalid',
            message: `Child table ${relationship.childTableId} not found`,
          });
        }
      }

      // Check for circular relationships
      if (await this.hasCircularRelationship(tableId, relationship)) {
        warnings.push({
          type: 'best_practice',
          message: 'Potential circular relationship detected',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async detectTableConflicts(tableId: string, changes: SchemaChange[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for conflicting field operations
    const fieldOperations = new Map<number, SchemaChange[]>();
    for (const change of changes) {
      if (change.fieldId) {
        if (!fieldOperations.has(change.fieldId)) {
          fieldOperations.set(change.fieldId, []);
        }
        fieldOperations.get(change.fieldId)!.push(change);
      }
    }

    for (const [fieldId, operations] of fieldOperations) {
      if (operations.length > 1) {
        const hasDelete = operations.some(op => op.type === 'field_delete');
        const hasUpdate = operations.some(op => op.type === 'field_update');
        
        if (hasDelete && hasUpdate) {
          errors.push({
            type: 'field_conflict',
            message: `Conflicting operations on field ${fieldId}: cannot update and delete`,
          });
        }
      }
    }

    // Check for table-level conflicts
    const tableOperations = changes.filter(c => 
      c.type === 'table_delete' || c.type === 'table_update'
    );
    
    if (tableOperations.length > 1) {
      warnings.push({
        type: 'compatibility',
        message: 'Multiple table-level operations detected',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async detectCrossTableConflicts(changes: SchemaChange[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for relationship conflicts
    const relationshipChanges = changes.filter(c => 
      c.type === 'relationship_create' || c.type === 'relationship_delete'
    );

    const tableDeletes = changes.filter(c => c.type === 'table_delete');
    
    for (const tableDelete of tableDeletes) {
      for (const relChange of relationshipChanges) {
        const relData = relChange.changes.relationship as RelationshipDefinition;
        if (relData && 
            (relData.parentTableId === tableDelete.tableId || 
             relData.childTableId === tableDelete.tableId)) {
          errors.push({
            type: 'relationship_invalid',
            message: `Cannot create relationship involving table ${tableDelete.tableId} that is being deleted`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async hasCircularRelationship(tableId: string, relationship: any): Promise<boolean> {
    // Simplified circular relationship detection
    // In a full implementation, this would traverse the relationship graph
    return relationship.parentTableId === relationship.childTableId;
  }

  // Rollback methods
  private async rollbackTableCreation(tableId: string): Promise<ApiResponse<void>> {
    return await this.callMCPServer('quickbase_delete_table', { tableId });
  }

  private async rollbackTableDeletion(change: SchemaChangeLog): Promise<ApiResponse<void>> {
    // Table deletion rollback would require recreating the table
    // This is complex and may not be fully supported
    return {
      success: false,
      error: {
        code: 'UNSUPPORTED_ROLLBACK',
        message: 'Table deletion rollback not supported',
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };
  }

  private async rollbackFieldCreation(change: SchemaChangeLog): Promise<ApiResponse<void>> {
    if (!change.fieldId) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLLBACK_DATA',
          message: 'Field ID required for rollback',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }

    return await this.callMCPServer('quickbase_delete_field', {
      tableId: change.tableId,
      fieldId: change.fieldId,
    });
  }

  private async rollbackFieldDeletion(change: SchemaChangeLog): Promise<ApiResponse<void>> {
    if (!change.rollbackData) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLLBACK_DATA',
          message: 'Rollback data required for field deletion rollback',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }

    // Recreate the field using rollback data
    return await this.callMCPServer('quickbase_create_field', {
      tableId: change.tableId,
      ...change.rollbackData,
    });
  }

  private async rollbackFieldUpdate(change: SchemaChangeLog): Promise<ApiResponse<void>> {
    if (!change.rollbackData || !change.fieldId) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLLBACK_DATA',
          message: 'Rollback data and field ID required for field update rollback',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }

    return await this.callMCPServer('quickbase_update_field', {
      tableId: change.tableId,
      fieldId: change.fieldId,
      ...change.rollbackData,
    });
  }

  private async rollbackRelationshipCreation(change: SchemaChangeLog): Promise<ApiResponse<void>> {
    // Relationship deletion is not directly supported by the MCP server
    // This would need to be implemented based on available methods
    return {
      success: false,
      error: {
        code: 'UNSUPPORTED_ROLLBACK',
        message: 'Relationship creation rollback not supported',
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };
  }

  // Utility Methods
  private async callMCPServer(method: string, params: any): Promise<ApiResponse<any>> {
    try {
      // This would make an HTTP request to the MCP server
      // For now, we'll simulate the response structure
      console.log(`Calling MCP server: ${method}`, params);
      
      // Simulate successful response
      return {
        success: true,
        data: {
          tableId: 'bq7xk8m9n',
          fieldId: 123,
          ...params,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: 'MCP server call failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
        },
      };
    }
  }



  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRelationshipId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}