import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import { QuickBaseConfig, QuickBaseField, QuickBaseTable, QuickBaseRecord, QueryOptions } from '../types/quickbase.js';

export class QuickBaseClient {
  private axios: AxiosInstance;
  private config: QuickBaseConfig;

  constructor(config: QuickBaseConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: `https://api.quickbase.com/v1`,
      timeout: config.timeout,
      headers: {
        'QB-Realm-Hostname': config.realm,
        'User-Agent': 'QuickBase-MCP-Server/1.0.0',
        'Authorization': `QB-USER-TOKEN ${config.userToken}`,
        'Content-Type': 'application/json'
      },
      // Bypass certificate validation for development/testing
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    // Add request/response interceptors for logging and error handling
    this.axios.interceptors.request.use(
      (config) => {
        console.log(`QB API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => {
        console.log(`QB API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`QB API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        return Promise.reject(error);
      }
    );
  }

  // ========== APPLICATION METHODS ==========

  async getAppInfo(): Promise<any> {
    const response = await this.axios.get(`/apps/${this.config.appId}`);
    return response.data;
  }

  async getAppTables(): Promise<any[]> {
    const response = await this.axios.get(`/tables`, {
      params: { appId: this.config.appId }
    });
    return response.data;
  }

  // ========== TABLE METHODS ==========

  async createTable(table: { name: string; description?: string }): Promise<string> {
    const response = await this.axios.post('/tables', {
      name: table.name,
      description: table.description,
      singleRecordName: table.name.slice(0, -1), // Remove 's' for singular
      pluralRecordName: table.name
    }, {
      params: { appId: this.config.appId }
    });
    return response.data.id;
  }

  async getTableInfo(tableId: string): Promise<any> {
    const response = await this.axios.get(`/tables/${tableId}`, {
      params: { appId: this.config.appId }
    });
    return response.data;
  }

  async updateTable(tableId: string, updates: Partial<QuickBaseTable>): Promise<void> {
    await this.axios.post(`/tables/${tableId}`, {
      appId: this.config.appId,
      ...updates
    });
  }

  async deleteTable(tableId: string): Promise<void> {
    await this.axios.delete(`/tables/${tableId}`, {
      params: { appId: this.config.appId }
    });
  }

  // ========== FIELD METHODS ==========

  async getTableFields(tableId: string): Promise<any[]> {
    const response = await this.axios.get(`/fields`, {
      params: { tableId }
    });
    return response.data;
  }

  async createField(tableId: string, field: QuickBaseField): Promise<number> {
    const fieldData: any = {
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      unique: field.unique
    };

    // Add field-specific properties
    if (field.choices && ['text_choice', 'multiselect'].includes(field.fieldType)) {
      fieldData.properties = {
        choices: field.choices
      };
    }

    if (field.formula && field.fieldType === 'formula') {
      fieldData.formula = field.formula;
    }

    if (field.lookupReference && field.fieldType === 'lookup') {
      fieldData.properties = {
        lookupReference: field.lookupReference
      };
    }

    const response = await this.axios.post('/fields', fieldData, {
      params: { tableId }
    });
    return response.data.id;
  }

  async updateField(tableId: string, fieldId: number, updates: Partial<QuickBaseField>): Promise<void> {
    await this.axios.post(`/fields/${fieldId}`, updates, {
      params: { tableId }
    });
  }

  async deleteField(tableId: string, fieldId: number): Promise<void> {
    await this.axios.delete(`/fields/${fieldId}`, {
      params: { tableId }
    });
  }

  // ========== RECORD METHODS ==========

  async getRecords(tableId: string, options?: QueryOptions): Promise<any[]> {
    const params: any = { from: tableId };
    
    if (options?.select) {
      params.select = options.select;
    }
    if (options?.where) {
      params.where = options.where;
    }
    if (options?.sortBy) {
      params.sortBy = options.sortBy;
    }
    if (options?.groupBy) {
      params.groupBy = options.groupBy;
    }
    if (options?.top) {
      params.top = options.top;
    }
    if (options?.skip) {
      params.skip = options.skip;
    }

    const response = await this.axios.post('/records/query', params);
    return response.data.data;
  }

  async getRecord(tableId: string, recordId: number, fieldIds?: number[]): Promise<any> {
    const params: any = { from: tableId };
    if (fieldIds) {
      params.select = fieldIds;
    }

    const response = await this.axios.post('/records/query', {
      ...params,
      where: `{3.EX.${recordId}}`
    });
    
    return response.data.data[0] || null;
  }

  async createRecord(tableId: string, record: QuickBaseRecord): Promise<number> {
    const response = await this.axios.post('/records', {
      to: tableId,
      data: [{
        ...record.fields
      }]
    });
    
    // Handle different response formats
    const metadata = response.data.metadata;
    
    // Check if record was created
    if (metadata && metadata.createdRecordIds && metadata.createdRecordIds.length > 0) {
      return metadata.createdRecordIds[0]; // Return the created record ID
    }
    
    // Alternative: try to get from data array (older API format)
    const recordData = response.data.data?.[0];
    if (recordData && recordData['3']) {
      return recordData['3'].value; // Record ID is always field 3
    }
    
    // If we have line errors, throw them
    if (metadata && metadata.lineErrors) {
      const errors = Object.values(metadata.lineErrors).flat();
      throw new Error('Failed to create record: ' + errors.join(', '));
    }
    
    throw new Error('Invalid response structure: ' + JSON.stringify(response.data));
  }

  async createRecords(tableId: string, records: QuickBaseRecord[]): Promise<number[]> {
    const response = await this.axios.post('/records', {
      to: tableId,
      data: records.map(record => record.fields)
    });
    return response.data.data.map((record: any) => record['3'].value);
  }

  async updateRecord(tableId: string, recordId: number, updates: Record<string, any>): Promise<void> {
    await this.axios.post('/records', {
      to: tableId,
      data: [{
        '3': { value: recordId }, // Record ID field
        ...updates
      }]
    });
  }

  async updateRecords(tableId: string, records: Array<{ recordId: number; updates: Record<string, any> }>): Promise<void> {
    await this.axios.post('/records', {
      to: tableId,
      data: records.map(({ recordId, updates }) => ({
        '3': { value: recordId },
        ...updates
      }))
    });
  }

  async deleteRecord(tableId: string, recordId: number): Promise<void> {
    await this.axios.delete('/records', {
      data: {
        from: tableId,
        where: `{3.EX.${recordId}}`
      }
    });
  }

  async deleteRecords(tableId: string, recordIds: number[]): Promise<void> {
    const whereClause = recordIds.map(id => `{3.EX.${id}}`).join('OR');
    await this.axios.delete('/records', {
      data: {
        from: tableId,
        where: whereClause
      }
    });
  }

  // ========== RELATIONSHIP METHODS ==========

  async createRelationship(parentTableId: string, childTableId: string, foreignKeyFieldId: number): Promise<void> {
    await this.axios.post('/relationships', {
      parentTableId,
      childTableId,
      foreignKeyFieldId
    });
  }

  async getRelationships(tableId: string): Promise<any[]> {
    const response = await this.axios.get(`/relationships`, {
      params: { childTableId: tableId }
    });
    return response.data;
  }

  // ========== ENHANCED RELATIONSHIP METHODS ==========

  async createAdvancedRelationship(
    parentTableId: string, 
    childTableId: string, 
    referenceFieldLabel: string,
    lookupFields?: Array<{ parentFieldId: number; childFieldLabel: string }>,
    relationshipType: 'one-to-many' | 'many-to-many' = 'one-to-many'
  ): Promise<{ referenceFieldId: number; lookupFieldIds: number[] }> {
    try {
      // Step 1: Create the reference field in the child table
      const referenceFieldId = await this.createField(childTableId, {
        label: referenceFieldLabel,
        fieldType: 'reference',
        required: false,
        unique: false,
        properties: {
          lookupTableId: parentTableId
        }
      });

      // Step 2: Create the relationship
      await this.createRelationship(parentTableId, childTableId, referenceFieldId);

      // Step 3: Create lookup fields if specified
      const lookupFieldIds: number[] = [];
      if (lookupFields && lookupFields.length > 0) {
        for (const lookup of lookupFields) {
          const lookupFieldId = await this.createLookupField(
            childTableId,
            parentTableId,
            referenceFieldId,
            lookup.parentFieldId,
            lookup.childFieldLabel
          );
          lookupFieldIds.push(lookupFieldId);
        }
      }

      return { referenceFieldId, lookupFieldIds };
    } catch (error) {
      console.error('Error creating advanced relationship:', error);
      throw error;
    }
  }

  async createLookupField(
    childTableId: string,
    parentTableId: string,
    referenceFieldId: number,
    parentFieldId: number,
    lookupFieldLabel: string
  ): Promise<number> {
    const response = await this.axios.post('/fields', {
      tableId: childTableId,
      label: lookupFieldLabel,
      fieldType: 'lookup',
      properties: {
        lookupReference: {
          tableId: parentTableId,
          fieldId: parentFieldId,
          referenceFieldId: referenceFieldId
        }
      }
    });
    return response.data.id;
  }

  async validateRelationship(
    parentTableId: string,
    childTableId: string,
    foreignKeyFieldId: number
  ): Promise<{ isValid: boolean; issues: string[]; orphanedRecords: number }> {
    const issues: string[] = [];
    let orphanedRecords = 0;

    try {
      // Check if parent table exists
      await this.getTableInfo(parentTableId);
    } catch (error) {
      issues.push(`Parent table ${parentTableId} not found`);
    }

    try {
      // Check if child table exists
      await this.getTableInfo(childTableId);
    } catch (error) {
      issues.push(`Child table ${childTableId} not found`);
    }

    try {
      // Check if foreign key field exists
      const childFields = await this.getTableFields(childTableId);
      const foreignKeyField = childFields.find(field => field.id === foreignKeyFieldId);
      if (!foreignKeyField) {
        issues.push(`Foreign key field ${foreignKeyFieldId} not found in child table`);
      } else if (foreignKeyField.fieldType !== 'reference') {
        issues.push(`Field ${foreignKeyFieldId} is not a reference field`);
      }

      // Check for orphaned records (child records with invalid parent references)
      const childRecords = await this.getRecords(childTableId, {
        select: [3, foreignKeyFieldId], // Record ID and foreign key
        where: `{${foreignKeyFieldId}.XEX.''}`
      });

      for (const record of childRecords) {
        const foreignKeyValue = record[foreignKeyFieldId]?.value;
        if (foreignKeyValue) {
          try {
            await this.getRecord(parentTableId, foreignKeyValue);
          } catch (error) {
            orphanedRecords++;
          }
        }
      }

         } catch (error) {
       issues.push(`Error validating relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
     }

    return {
      isValid: issues.length === 0 && orphanedRecords === 0,
      issues,
      orphanedRecords
    };
  }

  async getRelationshipDetails(tableId: string, includeFields: boolean = true): Promise<any> {
    try {
      const relationships = await this.getRelationships(tableId);
      const tableInfo = await this.getTableInfo(tableId);
      
      const result = {
        tableId,
        tableName: tableInfo.name,
        relationships: [] as any[],
        relatedFields: [] as any[]
      };

      for (const relationship of relationships) {
        const relationshipDetail: any = {
          parentTableId: relationship.parentTableId,
          childTableId: relationship.childTableId,
          foreignKeyFieldId: relationship.foreignKeyFieldId,
          type: 'one-to-many' // QuickBase primarily supports one-to-many
        };

        if (includeFields) {
          // Get fields related to this relationship
          const fields = await this.getTableFields(tableId);
          const relatedFields = fields.filter(field => 
            field.fieldType === 'reference' || 
            field.fieldType === 'lookup' ||
            (field.properties && field.properties.lookupReference)
          );
          
          relationshipDetail.relatedFields = relatedFields;
        }

        result.relationships.push(relationshipDetail);
      }

      return result;
    } catch (error) {
      console.error('Error getting relationship details:', error);
      throw error;
    }
  }

  async createJunctionTable(
    junctionTableName: string,
    table1Id: string,
    table2Id: string,
    table1FieldLabel: string,
    table2FieldLabel: string,
    additionalFields?: Array<{ label: string; fieldType: string }>
  ): Promise<{ junctionTableId: string; table1ReferenceFieldId: number; table2ReferenceFieldId: number }> {
    try {
      // Step 1: Create the junction table
      const junctionTableId = await this.createTable({
        name: junctionTableName,
        description: `Junction table for many-to-many relationship between tables ${table1Id} and ${table2Id}`
      });

      // Step 2: Create reference field to first table
      const table1ReferenceFieldId = await this.createField(junctionTableId, {
        label: table1FieldLabel,
        fieldType: 'reference',
        required: true,
        unique: false,
        properties: {
          lookupTableId: table1Id
        }
      });

      // Step 3: Create reference field to second table
      const table2ReferenceFieldId = await this.createField(junctionTableId, {
        label: table2FieldLabel,
        fieldType: 'reference',
        required: true,
        unique: false,
        properties: {
          lookupTableId: table2Id
        }
      });

      // Step 4: Create relationships
      await this.createRelationship(table1Id, junctionTableId, table1ReferenceFieldId);
      await this.createRelationship(table2Id, junctionTableId, table2ReferenceFieldId);

      // Step 5: Create additional fields if specified
      if (additionalFields && additionalFields.length > 0) {
        for (const field of additionalFields) {
          await this.createField(junctionTableId, {
            label: field.label,
            fieldType: field.fieldType as any,
            required: false,
            unique: false
          });
        }
      }

      return {
        junctionTableId,
        table1ReferenceFieldId,
        table2ReferenceFieldId
      };
    } catch (error) {
      console.error('Error creating junction table:', error);
      throw error;
    }
  }

  // ========== REPORT METHODS ==========

  async getReports(tableId: string): Promise<any[]> {
    const response = await this.axios.get('/reports', {
      params: { tableId }
    });
    return response.data;
  }

  async runReport(reportId: string, tableId: string): Promise<any[]> {
    const response = await this.axios.post('/records/query', {
      from: tableId,
      options: {
        reportId
      }
    });
    return response.data.data;
  }

  // ========== UTILITY METHODS ==========

  async testConnection(): Promise<boolean> {
    try {
      await this.getAppInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  async searchRecords(tableId: string, searchTerm: string, fieldIds?: number[]): Promise<any[]> {
    // This is a simple implementation - you might want to enhance based on your search needs
    const whereClause = fieldIds 
      ? fieldIds.map(fieldId => `{${fieldId}.CT.'${searchTerm}'}`).join('OR')
      : `{6.CT.'${searchTerm}'}OR{7.CT.'${searchTerm}'}`; // Common text fields

    return this.getRecords(tableId, { where: whereClause });
  }

  // ========== BULK OPERATIONS ==========

  async upsertRecords(tableId: string, records: Array<{ keyField: number; keyValue: any; data: Record<string, any> }>): Promise<any> {
    // QuickBase upsert based on a key field
    return await this.axios.post('/records', {
      to: tableId,
      data: records.map(({ keyField, keyValue, data }) => ({
        [keyField]: { value: keyValue },
        ...data
      })),
      mergeFieldId: records[0]?.keyField
    });
  }

  // ========== CODEPAGE METHODS ==========

  async saveCodepage(tableId: string, name: string, code: string, description?: string): Promise<number> {
    const recordData: Record<string, any> = {
      6: { value: name }, // Assuming field 6 is name
      7: { value: code }, // Assuming field 7 is code
    };
    if (description) {
      recordData[8] = { value: description }; // Assuming field 8 is description
    }
    
    const response = await this.axios.post('/records', {
      to: tableId,
      data: [recordData]
    });
    return response.data.metadata.createdRecordIds[0];
  }

  async deployCodepage(params: {
    tableId: string;
    name: string;
    code: string;
    description?: string;
    version?: string;
    tags?: string[];
    dependencies?: string[];
    targetTableId?: string;
  }): Promise<number> {
    // Field mapping: 8=Name, 13=Code, 14=Description, 9=Version, 10=Tags, 15=Dependencies, 11=Target Table ID, 12=Active
    const recordData: Record<string, any> = {
      8: { value: params.name },
      13: { value: params.code },
    };
    
    if (params.description) recordData[14] = { value: params.description };
    if (params.version) recordData[9] = { value: params.version };
    if (params.tags) recordData[10] = { value: params.tags.join(', ') };
    if (params.dependencies) recordData[15] = { value: params.dependencies.join('\n') };
    if (params.targetTableId) recordData[11] = { value: params.targetTableId };
    recordData[12] = { value: true }; // Active = true by default
    
    const response = await this.axios.post('/records', {
      to: params.tableId,
      data: [recordData]
    });
    
    return response.data.metadata.createdRecordIds[0];
  }

  async updateCodepage(params: {
    tableId: string;
    recordId: number;
    code?: string;
    description?: string;
    version?: string;
    active?: boolean;
  }): Promise<void> {
    const fields: Record<string, any> = {};
    
    if (params.code !== undefined) fields[7] = { value: params.code };
    if (params.description !== undefined) fields[8] = { value: params.description };
    if (params.version !== undefined) fields[9] = { value: params.version };
    if (params.active !== undefined) fields[13] = { value: params.active };
    
    await this.updateRecord(params.tableId, params.recordId, fields);
  }

  async searchCodepages(params: {
    tableId: string;
    searchTerm?: string;
    tags?: string[];
    targetTableId?: string;
    activeOnly?: boolean;
  }): Promise<any[]> {
    const conditions: string[] = [];
    
    if (params.searchTerm) {
      // Search in name (field 6) or description (field 8)
      conditions.push(`({6.CT.'${params.searchTerm}'}OR{8.CT.'${params.searchTerm}'})`);
    }
    
    if (params.tags && params.tags.length > 0) {
      const tagConditions = params.tags.map(tag => `{10.CT.'${tag}'}`).join('OR');
      conditions.push(`(${tagConditions})`);
    }
    
    if (params.targetTableId) {
      conditions.push(`{12.EX.'${params.targetTableId}'}`);
    }
    
    if (params.activeOnly !== false) {
      conditions.push(`{13.EX.'1'}`); // Active = true
    }
    
    const where = conditions.length > 0 ? conditions.join('AND') : '';
    
    return this.getRecords(params.tableId, { where });
  }

  async cloneCodepage(params: {
    tableId: string;
    sourceRecordId: number;
    newName: string;
    modifications?: Record<string, any>;
  }): Promise<number> {
    // Get source codepage
    const sourceCodepage = await this.getRecord(params.tableId, params.sourceRecordId);
    
    // Create new record with cloned data
    const recordData: Record<string, any> = {
      6: { value: params.newName },
      7: { value: sourceCodepage['7']?.value }, // Code
      8: { value: sourceCodepage['8']?.value || `Cloned from ${sourceCodepage['6']?.value}` }, // Description
      9: { value: sourceCodepage['9']?.value || '1.0.0' }, // Version
      10: { value: sourceCodepage['10']?.value }, // Tags
      11: { value: sourceCodepage['11']?.value }, // Dependencies
      12: { value: sourceCodepage['12']?.value }, // Target Table
      13: { value: true } // Active
    };
    
    // Apply modifications
    if (params.modifications) {
      for (const [fieldId, value] of Object.entries(params.modifications)) {
        recordData[fieldId] = { value };
      }
    }
    
    const response = await this.axios.post('/records', {
      to: params.tableId,
      data: [recordData]
    });
    
    return response.data.metadata.createdRecordIds[0];
  }

  async validateCodepage(params: {
    code: string;
    checkSyntax?: boolean;
    checkAPIs?: boolean;
    checkSecurity?: boolean;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    securityIssues: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityIssues: string[] = [];
    
    // Check syntax (basic HTML/JS validation)
    if (params.checkSyntax !== false) {
      // Check for unclosed tags
      const openTags = params.code.match(/<[^/][^>]*>/g) || [];
      const closeTags = params.code.match(/<\/[^>]*>/g) || [];
      
      if (openTags.length !== closeTags.length) {
        errors.push('Possible unclosed HTML tags detected');
      }
      
      // Check for basic JavaScript syntax errors
      if (params.code.includes('function') && !params.code.includes('}')) {
        errors.push('Possible unclosed JavaScript function');
      }
    }
    
    // Check API usage
    if (params.checkAPIs !== false) {
      const hasQdbApi = params.code.includes('qdb.api');
      const hasQBApi = params.code.includes('QB.api');
      const hasSessionClient = params.code.includes('window.qbClient');
      
      if (!hasQdbApi && !hasQBApi && !hasSessionClient) {
        warnings.push('No QuickBase API detected. Consider using qdb.api for best compatibility.');
      }
      
      if (hasQBApi && !hasQdbApi) {
        warnings.push('Consider using qdb.api instead of QB.api for better CORS handling.');
      }
      
      if (hasSessionClient && !hasQdbApi) {
        warnings.push('Session client may have CORS issues. Consider using qdb.api as primary.');
      }
    }
    
    // Check security
    if (params.checkSecurity !== false) {
      // Check for eval usage
      if (params.code.includes('eval(')) {
        securityIssues.push('Usage of eval() detected - potential security risk');
      }
      
      // Check for innerHTML without sanitization
      if (params.code.includes('.innerHTML') && !params.code.includes('sanitize')) {
        warnings.push('innerHTML usage detected - ensure user input is sanitized');
      }
      
      // Check for hardcoded credentials
      const credentialPatterns = [
        /password\s*=\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
        /token\s*=\s*['"][^'"]+['"]/i
      ];
      
      for (const pattern of credentialPatterns) {
        if (pattern.test(params.code)) {
          securityIssues.push('Possible hardcoded credentials detected');
          break;
        }
      }
      
      // Check for SQL injection patterns (in query strings)
      if (params.code.includes('where') && params.code.includes('${') && !params.code.includes('sanitize')) {
        warnings.push('Dynamic query construction detected - ensure proper input sanitization');
      }
    }
    
    return {
      isValid: errors.length === 0 && securityIssues.length === 0,
      errors,
      warnings,
      securityIssues
    };
  }

  async exportCodepage(params: {
    tableId: string;
    recordId: number;
    format: 'html' | 'json' | 'markdown';
  }): Promise<string> {
    const codepage = await this.getRecord(params.tableId, params.recordId);
    
    if (params.format === 'html') {
      return codepage['7']?.value || '';
    }
    
    if (params.format === 'json') {
      return JSON.stringify({
        name: codepage['6']?.value,
        code: codepage['7']?.value,
        description: codepage['8']?.value,
        version: codepage['9']?.value,
        tags: codepage['10']?.value?.split(',').map((t: string) => t.trim()),
        dependencies: codepage['11']?.value?.split('\n').filter((d: string) => d.trim()),
        targetTableId: codepage['12']?.value,
        active: codepage['13']?.value
      }, null, 2);
    }
    
    if (params.format === 'markdown') {
      const name = codepage['6']?.value || 'Untitled';
      const version = codepage['9']?.value || '1.0.0';
      const description = codepage['8']?.value || '';
      const code = codepage['7']?.value || '';
      
      return `# ${name} (v${version})

## Description
${description}

## Code
\`\`\`html
${code}
\`\`\`

## Metadata
- **Version:** ${version}
- **Tags:** ${codepage['10']?.value || 'None'}
- **Target Table:** ${codepage['12']?.value || 'None'}
- **Active:** ${codepage['13']?.value ? 'Yes' : 'No'}
`;
    }
    
    return '';
  }

  async importCodepage(params: {
    tableId: string;
    source: string;
    format: 'html' | 'json' | 'auto';
    overwrite?: boolean;
  }): Promise<number> {
    let codepageData: any = {};
    
    // Auto-detect format
    let detectedFormat = params.format;
    if (params.format === 'auto') {
      if (params.source.trim().startsWith('{')) {
        detectedFormat = 'json';
      } else if (params.source.trim().startsWith('<!DOCTYPE') || params.source.trim().startsWith('<html')) {
        detectedFormat = 'html';
      } else {
        throw new Error('Unable to auto-detect format. Please specify format explicitly.');
      }
    }
    
    // Parse based on format
    if (detectedFormat === 'json') {
      codepageData = JSON.parse(params.source);
    } else if (detectedFormat === 'html') {
      // Extract name from title tag if available
      const titleMatch = params.source.match(/<title>(.*?)<\/title>/i);
      codepageData = {
        name: titleMatch ? titleMatch[1] : 'Imported Codepage',
        code: params.source,
        description: 'Imported from HTML',
        version: '1.0.0'
      };
    }
    
    // Check if codepage with this name exists (if overwrite is false)
    if (!params.overwrite) {
      const existing = await this.searchCodepages({
        tableId: params.tableId,
        searchTerm: codepageData.name
      });
      
      if (existing.length > 0) {
        throw new Error(`Codepage with name "${codepageData.name}" already exists. Use overwrite=true to replace.`);
      }
    }
    
    // Create the codepage
    return this.deployCodepage({
      tableId: params.tableId,
      name: codepageData.name,
      code: codepageData.code,
      description: codepageData.description,
      version: codepageData.version,
      tags: codepageData.tags,
      dependencies: codepageData.dependencies,
      targetTableId: codepageData.targetTableId
    });
  }

  async saveCodepageVersion(params: {
    tableId: string;
    codepageRecordId: number;
    version: string;
    code: string;
    changeLog?: string;
  }): Promise<number> {
    const recordData: Record<string, any> = {
      6: { value: params.codepageRecordId }, // Codepage Record ID
      7: { value: params.version }, // Version
      8: { value: params.code }, // Code Snapshot
    };
    
    if (params.changeLog) {
      recordData[9] = { value: params.changeLog }; // Change Log
    }
    
    const response = await this.axios.post('/records', {
      to: params.tableId,
      data: [recordData]
    });
    
    return response.data.metadata.createdRecordIds[0];
  }

  async getCodepageVersions(params: {
    tableId: string;
    codepageRecordId: number;
    limit?: number;
  }): Promise<any[]> {
    const where = `{6.EX.'${params.codepageRecordId}'}`;
    const options: any = {
      where,
      sortBy: [{ fieldId: 10, order: 'DESC' }] // Sort by Created Date descending
    };
    
    if (params.limit) {
      options.top = params.limit;
    }
    
    return this.getRecords(params.tableId, options);
  }

  async rollbackCodepage(params: {
    tableId: string;
    codepageRecordId: number;
    versionRecordId: number;
  }): Promise<void> {
    // Get the version record
    const versionRecord = await this.getRecord(params.tableId, params.versionRecordId);
    
    if (!versionRecord) {
      throw new Error(`Version record ${params.versionRecordId} not found`);
    }
    
    // Get the code and version from the version record
    const code = versionRecord['8']?.value; // Code Snapshot
    const version = versionRecord['7']?.value; // Version
    
    if (!code) {
      throw new Error('Version record does not contain code snapshot');
    }
    
    // Update the main codepage with the old version's code
    await this.updateCodepage({
      tableId: params.tableId, // This should be the main codepage table
      recordId: params.codepageRecordId,
      code,
      version: `${version}-rollback`
    });
  }

  async getCodepage(tableId: string, recordId: number): Promise<any> {
    return this.getRecord(tableId, recordId);
  }

  async listCodepages(tableId: string, limit?: number): Promise<any[]> {
    const options: any = {};
    if (limit) {
      options.top = limit;
    }
    return this.getRecords(tableId, options);
  }

  async executeCodepage(tableId: string, recordId: number, functionName: string, parameters?: Record<string, any>): Promise<any> {
    const codepage = await this.getCodepage(tableId, recordId);
    // Extract code from the record (assuming field 7 is code)
    const code = codepage['7']?.value;
    if (!code) {
      throw new Error('Codepage does not contain code');
    }

    // For safety, we'll return the code and parameters instead of executing
    // In a real implementation, you might want to sandbox the execution
    return {
      functionName,
      parameters,
      code,
      note: 'Code execution is not implemented for security reasons. Use the code in your application.'
    };
  }

  // ========== AUTH METHODS ==========

  generateOAuthUrl(clientId: string, redirectUri: string, scopes: string[] = ['read:table', 'write:table']): string {
    // This is a simplified OAuth URL generation
    // In practice, you'd need PKCE implementation
    const realm = this.config.realm;
    const scope = scopes.join(' ');
    const state = Math.random().toString(36).substring(2);
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope,
      redirect_uri: redirectUri,
      state
    });

    return `https://${realm}/oauth2/authorize?${params.toString()}`;
  }
} 