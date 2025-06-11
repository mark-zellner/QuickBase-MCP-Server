import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
      }
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
      appId: this.config.appId,
      name: table.name,
      description: table.description,
      singleRecordName: table.name.slice(0, -1), // Remove 's' for singular
      pluralRecordName: table.name
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
      tableId,
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

    const response = await this.axios.post('/fields', fieldData);
    return response.data.id;
  }

  async updateField(tableId: string, fieldId: number, updates: Partial<QuickBaseField>): Promise<void> {
    await this.axios.post(`/fields/${fieldId}`, {
      tableId,
      ...updates
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
    return response.data.data[0]['3'].value; // Record ID is always field 3
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
} 