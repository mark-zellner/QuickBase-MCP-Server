#!/usr/bin/env node
/* eslint-disable no-case-declarations */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { QuickBaseClient } from './quickbase/client.js';
import { quickbaseTools } from './tools/index.js';
import { QuickBaseConfig } from './types/quickbase.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

type ToolContent = { type: 'text'; text: string };
type ToolResponse = { content: ToolContent[] };
type ToolHandler = (args: unknown) => Promise<ToolResponse>;

class QuickBaseMCPServer {
  private readonly server: Server;
  private readonly qbClient: QuickBaseClient;
  private readonly toolHandlers: Record<string, ToolHandler>;

  constructor() {
    // Validate environment variables
    const config: QuickBaseConfig = {
      realm: process.env.QB_REALM || '',
      userToken: process.env.QB_USER_TOKEN || '',
      appId: process.env.QB_APP_ID || '',
  timeout: Number.parseInt(process.env.QB_DEFAULT_TIMEOUT || '30000'),
  maxRetries: Number.parseInt(process.env.QB_MAX_RETRIES || '3')
    };

    if (!config.realm || !config.userToken || !config.appId) {
      throw new Error('Missing required environment variables: QB_REALM, QB_USER_TOKEN, QB_APP_ID');
    }

    this.qbClient = new QuickBaseClient(config);
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'quickbase-mcp',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      }
    );

    this.toolHandlers = this.createToolHandlers();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: quickbaseTools,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = this.toolHandlers[name];

      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        return await handler(args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error executing tool ${name}:`, error);

        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${errorMessage}`
        );
      }
    });
  }

  private createToolHandlers(): Record<string, ToolHandler> {
    return {
      ...this.createApplicationHandlers(),
      ...this.createTableHandlers(),
      ...this.createFieldHandlers(),
      ...this.createRecordHandlers(),
      ...this.createPricingHandlers(),
      ...this.createRelationshipHandlers(),
      ...this.createUtilityHandlers(),
      ...this.createCodepageHandlers(),
      ...this.createAuthHandlers()
    };
  }

  private createApplicationHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_get_app_info: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(await this.qbClient.getAppInfo(), null, 2)
          }
        ]
      }),
      quickbase_get_tables: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(await this.qbClient.getAppTables(), null, 2)
          }
        ]
      }),
      quickbase_test_connection: async () => {
        const isConnected = await this.qbClient.testConnection();
        return {
          content: [
            {
              type: 'text',
              text: `Connection ${isConnected ? 'successful' : 'failed'}`
            }
          ]
        };
      }
    };
  }

  private createTableHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_create_table: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_table');
        const tableId = await this.qbClient.createTable({
          name: this.toStringParam(params.name, 'name'),
          description: this.toOptionalString(params.description)
        });
        return {
          content: [
            {
              type: 'text',
              text: `Table created with ID: ${tableId}`
            }
          ]
        };
      },
      quickbase_get_table_info: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_table_info');
        const tableInfo = await this.qbClient.getTableInfo(this.toStringParam(params.tableId, 'tableId'));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tableInfo, null, 2)
            }
          ]
        };
      },
      quickbase_delete_table: async (args) => {
        const params = this.ensureObject(args, 'quickbase_delete_table');
        const tableId = this.toStringParam(params.tableId, 'tableId');
        await this.qbClient.deleteTable(tableId);
        return {
          content: [
            {
              type: 'text',
              text: `Table ${tableId} deleted successfully`
            }
          ]
        };
      }
    };
  }

  private createFieldHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_get_table_fields: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_table_fields');
        const fields = await this.qbClient.getTableFields(this.toStringParam(params.tableId, 'tableId'));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(fields, null, 2)
            }
          ]
        };
      },
      quickbase_create_field: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_field');
        const lookupReference = params.lookupTableId ? {
          tableId: this.toStringParam(params.lookupTableId, 'lookupTableId'),
          fieldId: this.parseNumber(params.lookupFieldId, 'lookupFieldId')
        } : undefined;
        const fieldId = await this.qbClient.createField(this.toStringParam(params.tableId, 'tableId'), {
          label: this.toStringParam(params.label, 'label'),
          fieldType: this.toStringParam(params.fieldType, 'fieldType') as any,
          required: Boolean(params.required),
          unique: Boolean(params.unique),
          choices: this.toStringArray(params.choices, 'choices'),
          formula: this.toOptionalString(params.formula),
          lookupReference
        });
        return {
          content: [
            {
              type: 'text',
              text: `Field created with ID: ${fieldId}`
            }
          ]
        };
      },
      quickbase_update_field: async (args) => {
        const params = this.ensureObject(args, 'quickbase_update_field');
        await this.qbClient.updateField(
          this.toStringParam(params.tableId, 'tableId'),
          this.parseNumber(params.fieldId, 'fieldId'),
          {
            label: this.toOptionalString(params.label),
            required: params.required === undefined ? undefined : Boolean(params.required),
            choices: this.toStringArray(params.choices, 'choices')
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Field ${params.fieldId} updated successfully`
            }
          ]
        };
      },
      quickbase_delete_field: async (args) => {
        const params = this.ensureObject(args, 'quickbase_delete_field');
        const tableId = this.toStringParam(params.tableId, 'tableId');
        const fieldId = this.parseNumber(params.fieldId, 'fieldId');
        await this.qbClient.deleteField(tableId, fieldId);
        return {
          content: [
            {
              type: 'text',
              text: `Field ${fieldId} deleted successfully`
            }
          ]
        };
      }
    };
  }

  private createRecordHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_query_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_query_records');
        const options: Record<string, any> = {};
        const select = this.toNumberArray(params.select, 'select');
        if (select) {
          options.select = select;
        }
        if (typeof params.where === 'string' && params.where.trim().length > 0) {
          options.where = params.where;
        }
        if (Array.isArray(params.sortBy)) {
          options.sortBy = params.sortBy.map((entry: any, index) => {
            if (!entry || typeof entry !== 'object') {
              throw new TypeError(`Invalid value for sortBy[${index}]`);
            }
            const fieldId = this.parseNumber(entry.fieldId, `sortBy[${index}].fieldId`);
            const order = entry.order === 'DESC' ? 'DESC' : 'ASC';
            return { fieldId, order };
          });
        }
        const top = this.parseOptionalNumber(params.top);
        if (top !== undefined) {
          options.top = top;
        }
        const skip = this.parseOptionalNumber(params.skip);
        if (skip !== undefined) {
          options.skip = skip;
        }

        const records = await this.qbClient.getRecords(
          this.toStringParam(params.tableId, 'tableId'),
          options
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(records, null, 2)
            }
          ]
        };
      },
      quickbase_get_record: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_record');
        const record = await this.qbClient.getRecord(
          this.toStringParam(params.tableId, 'tableId'),
          this.parseNumber(params.recordId, 'recordId'),
          this.toNumberArray(params.fieldIds, 'fieldIds')
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(record, null, 2)
            }
          ]
        };
      },
      quickbase_create_record: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_record');
        if (!params.fields || typeof params.fields !== 'object') {
          throw new TypeError('Invalid fields payload');
        }
        const recordId = await this.qbClient.createRecord(
          this.toStringParam(params.tableId, 'tableId'),
          { fields: params.fields as Record<string, any> }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Record created with ID: ${recordId}`
            }
          ]
        };
      },
      quickbase_update_record: async (args) => {
        const params = this.ensureObject(args, 'quickbase_update_record');
        if (!params.fields || typeof params.fields !== 'object') {
          throw new TypeError('Invalid fields payload');
        }
        await this.qbClient.updateRecord(
          this.toStringParam(params.tableId, 'tableId'),
          this.parseNumber(params.recordId, 'recordId'),
          params.fields as Record<string, any>
        );
        return {
          content: [
            {
              type: 'text',
              text: `Record ${params.recordId} updated successfully`
            }
          ]
        };
      },
      quickbase_delete_record: async (args) => {
        const params = this.ensureObject(args, 'quickbase_delete_record');
        const tableId = this.toStringParam(params.tableId, 'tableId');
        const recordId = this.parseNumber(params.recordId, 'recordId');
        await this.qbClient.deleteRecord(tableId, recordId);
        return {
          content: [
            {
              type: 'text',
              text: `Record ${recordId} deleted successfully`
            }
          ]
        };
      },
      quickbase_bulk_create_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_bulk_create_records');
        if (!Array.isArray(params.records) || params.records.length === 0) {
          throw new TypeError('No records supplied for bulk create');
        }
        const payload = params.records.map((record: any, index: number) => {
          if (!record || typeof record !== 'object' || typeof record.fields !== 'object') {
            throw new TypeError(`Invalid record at index ${index}`);
          }
          return { fields: record.fields as Record<string, any> };
        });
        const recordIds = await this.qbClient.createRecords(
          this.toStringParam(params.tableId, 'tableId'),
          payload
        );
        return {
          content: [
            {
              type: 'text',
              text: `Created ${recordIds.length} records: ${recordIds.join(', ')}`
            }
          ]
        };
      },
      quickbase_search_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_search_records');
        const results = await this.qbClient.searchRecords(
          this.toStringParam(params.tableId, 'tableId'),
          this.toStringParam(params.searchTerm, 'searchTerm'),
          this.toNumberArray(params.fieldIds, 'fieldIds')
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      },
      quickbase_bulk_update_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_bulk_update_records');
        if (!Array.isArray(params.records) || params.records.length === 0) {
          throw new TypeError('No records supplied for bulk update');
        }
        const updates = params.records.map((record: any, index: number) => {
          if (!record || typeof record !== 'object' || typeof record.fields !== 'object') {
            throw new TypeError(`Invalid record at index ${index}`);
          }
          return {
            recordId: this.parseNumber(record.recordId, `records[${index}].recordId`),
            updates: record.fields as Record<string, any>
          };
        });
        await this.qbClient.updateRecords(
          this.toStringParam(params.tableId, 'tableId'),
          updates
        );
        return {
          content: [
            {
              type: 'text',
              text: `Updated ${updates.length} records`
            }
          ]
        };
      },
      quickbase_bulk_delete_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_bulk_delete_records');
        const recordIds = this.toNumberArray(params.recordIds, 'recordIds');
        if (!recordIds || recordIds.length === 0) {
          throw new TypeError('No record IDs supplied for bulk delete');
        }
        await this.qbClient.deleteRecords(
          this.toStringParam(params.tableId, 'tableId'),
          recordIds
        );
        return {
          content: [
            {
              type: 'text',
              text: `Deleted ${recordIds.length} records`
            }
          ]
        };
      },
      quickbase_upsert_records: async (args) => {
        const params = this.ensureObject(args, 'quickbase_upsert_records');
        if (!Array.isArray(params.records) || params.records.length === 0) {
          throw new TypeError('No records supplied for upsert');
        }
        const records = params.records.map((record: any, index: number) => {
          if (!record || typeof record !== 'object' || typeof record.data !== 'object') {
            throw new TypeError(`Invalid record at index ${index}`);
          }
          return {
            keyField: this.parseNumber(record.keyField, `records[${index}].keyField`),
            keyValue: record.keyValue,
            data: record.data as Record<string, any>
          };
        });
        const response = await this.qbClient.upsertRecords(
          this.toStringParam(params.tableId, 'tableId'),
          records
        );
        const payload = response?.data ?? response;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(payload, null, 2)
            }
          ]
        };
      }
    };
  }

  private createPricingHandlers(): Record<string, ToolHandler> {
    return {
      pricing_save_record: async (args) => {
        const params = this.ensureObject(args, 'pricing_save_record');
        const tableId = this.resolveTableId(params.tableId, 'PRICING_TABLE_ID', 'pricing table ID');
        const fields: Record<string, any> = {
          '7': { value: this.parseNumber(params.msrp, 'msrp') },
          '8': { value: this.parseOptionalNumber(params.discount) ?? 0 },
          '9': { value: this.parseOptionalNumber(params.financingRate) ?? 0 },
          '10': { value: this.parseOptionalNumber(params.tradeInValue) ?? 0 },
          '11': { value: this.parseNumber(params.finalPrice, 'finalPrice') },
          '12': { value: this.toStringParam(params.vehicleMake, 'vehicleMake') },
          '13': { value: this.toStringParam(params.vehicleModel, 'vehicleModel') }
        };
        const recordId = await this.qbClient.createRecord(tableId, { fields });
        return {
          content: [
            {
              type: 'text',
              text: `Pricing record created ID: ${recordId}`
            }
          ]
        };
      },
      pricing_query_records: async (args) => {
        const params = this.ensureObject(args, 'pricing_query_records');
        const tableId = this.resolveTableId(params.tableId, 'PRICING_TABLE_ID', 'pricing table ID');
        const clauses: string[] = [];
        const minMsrp = this.parseOptionalNumber(params.minMsrp);
        const maxMsrp = this.parseOptionalNumber(params.maxMsrp);
        const make = this.toOptionalString(params.make);
        const model = this.toOptionalString(params.model);

        if (minMsrp !== undefined) {
          clauses.push(`{7.GE.'${minMsrp}'}`);
        }
        if (maxMsrp !== undefined) {
          clauses.push(`{7.LE.'${maxMsrp}'}`);
        }
        if (make) {
          clauses.push(`{12.EX.'${make}'}`);
        }
        if (model) {
          clauses.push(`{13.EX.'${model}'}`);
        }

        const data = await this.qbClient.getRecords(tableId, {
          select: [7, 8, 9, 10, 11, 12, 13],
          where: clauses.length > 0 ? clauses.join('AND') : undefined,
          top: this.parseOptionalNumber(params.top)
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      },
      pricing_update_record: async (args) => {
        const params = this.ensureObject(args, 'pricing_update_record');
        const tableId = this.resolveTableId(params.tableId, 'PRICING_TABLE_ID', 'pricing table ID');
        const updates: Record<string, any> = {};
        const finalPrice = this.parseOptionalNumber(params.finalPrice);
        const discount = this.parseOptionalNumber(params.discount);
        const financingRate = this.parseOptionalNumber(params.financingRate);
        const tradeInValue = this.parseOptionalNumber(params.tradeInValue);

        if (finalPrice !== undefined) {
          updates['11'] = { value: finalPrice };
        }
        if (discount !== undefined) {
          updates['8'] = { value: discount };
        }
        if (financingRate !== undefined) {
          updates['9'] = { value: financingRate };
        }
        if (tradeInValue !== undefined) {
          updates['10'] = { value: tradeInValue };
        }

        await this.qbClient.updateRecord(
          tableId,
          this.parseNumber(params.recordId, 'recordId'),
          updates
        );
        return {
          content: [
            {
              type: 'text',
              text: `Pricing record ${params.recordId} updated`
            }
          ]
        };
      }
    };
  }

  private createRelationshipHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_create_relationship: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_relationship');
        await this.qbClient.createRelationship(
          this.toStringParam(params.parentTableId, 'parentTableId'),
          this.toStringParam(params.childTableId, 'childTableId'),
          this.parseNumber(params.foreignKeyFieldId, 'foreignKeyFieldId')
        );
        return {
          content: [
            {
              type: 'text',
              text: `Relationship created between ${params.parentTableId} and ${params.childTableId}`
            }
          ]
        };
      },
      quickbase_get_relationships: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_relationships');
        const relationships = await this.qbClient.getRelationships(this.toStringParam(params.tableId, 'tableId'));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(relationships, null, 2)
            }
          ]
        };
      },
      quickbase_create_advanced_relationship: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_advanced_relationship');
        const lookupFields = Array.isArray(params.lookupFields)
          ? params.lookupFields.map((field: any, index: number) => {
              if (!field || typeof field !== 'object') {
                throw new TypeError(`Invalid lookup field at index ${index}`);
              }
              return {
                parentFieldId: this.parseNumber(field.parentFieldId, `lookupFields[${index}].parentFieldId`),
                childFieldLabel: this.toStringParam(field.childFieldLabel, `lookupFields[${index}].childFieldLabel`)
              };
            })
          : undefined;
        const details = await this.qbClient.createAdvancedRelationship(
          this.toStringParam(params.parentTableId, 'parentTableId'),
          this.toStringParam(params.childTableId, 'childTableId'),
          this.toStringParam(params.referenceFieldLabel, 'referenceFieldLabel'),
          lookupFields,
          params.relationshipType === 'many-to-many' ? 'many-to-many' : 'one-to-many'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2)
            }
          ]
        };
      },
      quickbase_create_lookup_field: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_lookup_field');
        const fieldId = await this.qbClient.createLookupField(
          this.toStringParam(params.childTableId, 'childTableId'),
          this.toStringParam(params.parentTableId, 'parentTableId'),
          this.parseNumber(params.referenceFieldId, 'referenceFieldId'),
          this.parseNumber(params.parentFieldId, 'parentFieldId'),
          this.toStringParam(params.lookupFieldLabel, 'lookupFieldLabel')
        );
        return {
          content: [
            {
              type: 'text',
              text: `Lookup field created with ID: ${fieldId}`
            }
          ]
        };
      },
      quickbase_validate_relationship: async (args) => {
        const params = this.ensureObject(args, 'quickbase_validate_relationship');
        const validation = await this.qbClient.validateRelationship(
          this.toStringParam(params.parentTableId, 'parentTableId'),
          this.toStringParam(params.childTableId, 'childTableId'),
          this.parseNumber(params.foreignKeyFieldId, 'foreignKeyFieldId')
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validation, null, 2)
            }
          ]
        };
      },
      quickbase_get_relationship_details: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_relationship_details');
        const includeFields = params.includeFields === undefined ? true : Boolean(params.includeFields);
        const details = await this.qbClient.getRelationshipDetails(
          this.toStringParam(params.tableId, 'tableId'),
          includeFields
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2)
            }
          ]
        };
      },
      quickbase_create_junction_table: async (args) => {
        const params = this.ensureObject(args, 'quickbase_create_junction_table');
        const additionalFields = Array.isArray(params.additionalFields)
          ? params.additionalFields.map((field: any, index: number) => {
              if (!field || typeof field !== 'object') {
                throw new TypeError(`Invalid additional field at index ${index}`);
              }
              return {
                label: this.toStringParam(field.label, `additionalFields[${index}].label`),
                fieldType: this.toStringParam(field.fieldType, `additionalFields[${index}].fieldType`)
              };
            })
          : undefined;
        const result = await this.qbClient.createJunctionTable(
          this.toStringParam(params.junctionTableName, 'junctionTableName'),
          this.toStringParam(params.table1Id, 'table1Id'),
          this.toStringParam(params.table2Id, 'table2Id'),
          this.toStringParam(params.table1FieldLabel, 'table1FieldLabel'),
          this.toStringParam(params.table2FieldLabel, 'table2FieldLabel'),
          additionalFields
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    };
  }

  private createUtilityHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_get_reports: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_reports');
        const reports = await this.qbClient.getReports(this.toStringParam(params.tableId, 'tableId'));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reports, null, 2)
            }
          ]
        };
      },
      quickbase_run_report: async (args) => {
        const params = this.ensureObject(args, 'quickbase_run_report');
        const data = await this.qbClient.runReport(
          this.toStringParam(params.reportId, 'reportId'),
          this.toStringParam(params.tableId, 'tableId')
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    };
  }

  private createCodepageHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_save_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_save_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const recordId = await this.qbClient.saveCodepage(
          tableId,
          this.toStringParam(params.name, 'name'),
          this.toStringParam(params.code, 'code'),
          this.toOptionalString(params.description)
        );
        return {
          content: [
            {
              type: 'text',
              text: `Codepage saved with record ID: ${recordId}`
            }
          ]
        };
      },
      quickbase_get_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const record = await this.qbClient.getCodepage(
          tableId,
          this.parseNumber(params.recordId, 'recordId')
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(record, null, 2)
            }
          ]
        };
      },
      quickbase_list_codepages: async (args) => {
        const params = this.ensureObject(args, 'quickbase_list_codepages');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const limit = this.parseOptionalNumber(params.limit);
        const records = await this.qbClient.listCodepages(tableId, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(records, null, 2)
            }
          ]
        };
      },
      quickbase_execute_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_execute_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const execution = await this.qbClient.executeCodepage(
          tableId,
          this.parseNumber(params.recordId, 'recordId'),
          this.toStringParam(params.functionName, 'functionName'),
          params.parameters as Record<string, any> | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(execution, null, 2)
            }
          ]
        };
      },

      // Enhanced codepage deployment tools
      quickbase_deploy_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_deploy_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        
        const fields: Record<string, any> = {
          6: { value: this.toStringParam(params.name, 'name') }, // Name field
          7: { value: this.toStringParam(params.code, 'code') }, // Code field
        };
        
        if (params.description) fields[8] = { value: params.description }; // Description
        if (params.version) fields[9] = { value: params.version }; // Version
        if (params.tags) fields[10] = { value: Array.isArray(params.tags) ? params.tags.join(', ') : params.tags }; // Tags
        if (params.dependencies) fields[11] = { value: Array.isArray(params.dependencies) ? params.dependencies.join('\n') : params.dependencies }; // Dependencies
        if (params.targetTableId) fields[12] = { value: params.targetTableId }; // Target Table
        
        const recordId = await this.qbClient.createRecord(tableId, { fields });
        
        return {
          content: [
            {
              type: 'text',
              text: `Codepage deployed successfully with record ID: ${recordId}\nName: ${params.name}\nVersion: ${params.version || 'N/A'}`
            }
          ]
        };
      },

      quickbase_update_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_update_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const recordId = this.parseNumber(params.recordId, 'recordId');
        
        const fields: Record<string, any> = {};
        if (params.code) fields[7] = { value: params.code };
        if (params.description) fields[8] = { value: params.description };
        if (params.version) fields[9] = { value: params.version };
        if (params.active !== undefined) fields[13] = { value: params.active }; // Active checkbox
        
        await this.qbClient.updateRecord(tableId, recordId, fields);
        
        return {
          content: [
            {
              type: 'text',
              text: `Codepage ${recordId} updated successfully`
            }
          ]
        };
      },

      quickbase_search_codepages: async (args) => {
        const params = this.ensureObject(args, 'quickbase_search_codepages');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        
        let where = '';
        const conditions: string[] = [];
        
        if (params.searchTerm) {
          conditions.push(`{6.CT.'${params.searchTerm}'}OR{8.CT.'${params.searchTerm}'}`); // Search name or description
        }
        if (params.tags && Array.isArray(params.tags)) {
          const tagConditions = params.tags.map(tag => `{10.CT.'${tag}'}`).join('OR');
          conditions.push(`(${tagConditions})`);
        }
        if (params.targetTableId) {
          conditions.push(`{12.EX.'${params.targetTableId}'}`);
        }
        if (params.activeOnly) {
          conditions.push(`{13.EX.'1'}`); // Active = true
        }
        
        where = conditions.length > 0 ? conditions.join('AND') : '';
        
        const records = await this.qbClient.getRecords(tableId, {
          select: [3, 6, 7, 8, 9, 10, 12, 13], // ID, Name, Code, Desc, Version, Tags, TargetTable, Active
          where,
          top: 100
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(records, null, 2)
            }
          ]
        };
      },

      quickbase_clone_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_clone_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const sourceId = this.parseNumber(params.sourceRecordId, 'sourceRecordId');
        
        // Get source codepage
        const sourceRecord = await this.qbClient.getRecord(tableId, sourceId);
        
        // Create clone with new name
        const fields: Record<string, any> = {
          6: { value: params.newName }, // New name
          7: { value: sourceRecord[7]?.value || '' }, // Copy code
          8: { value: `Clone of: ${sourceRecord[6]?.value || 'Unknown'}` }, // Description
        };
        
        // Apply modifications if provided
        if (params.modifications) {
          for (const [fieldId, value] of Object.entries(params.modifications)) {
            fields[fieldId] = { value };
          }
        }
        
        const newRecordId = await this.qbClient.createRecord(tableId, { fields });
        
        return {
          content: [
            {
              type: 'text',
              text: `Codepage cloned successfully! New record ID: ${newRecordId}\nOriginal: ${sourceId} → Clone: ${newRecordId}`
            }
          ]
        };
      },

      quickbase_validate_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_validate_codepage');
        const code = this.toStringParam(params.code, 'code');
        
        const results: any = {
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        };
        
        // Check syntax
        if (params.checkSyntax !== false) {
          try {
            new Function(code);
          } catch (error: any) {
            results.valid = false;
            results.errors.push(`Syntax Error: ${error.message}`);
          }
        }
        
        // Check for QuickBase API usage
        if (params.checkAPIs !== false) {
          const apiPatterns = [
            { pattern: /qdb\.api/g, name: 'qdb.api', recommended: true },
            { pattern: /QB\.api/g, name: 'QB.api', recommended: true },
            { pattern: /qbClient/g, name: 'session client', recommended: true },
            { pattern: /fetch\(/g, name: 'fetch API', recommended: false }
          ];
          
          for (const { pattern, name, recommended } of apiPatterns) {
            if (pattern.test(code)) {
              if (recommended) {
                results.suggestions.push(`✅ Uses ${name} (good!)`);
              } else {
                results.warnings.push(`⚠️ Uses ${name} - consider using qdb.api instead`);
              }
            }
          }
        }
        
        // Check for security issues
        if (params.checkSecurity !== false) {
          const securityChecks = [
            { pattern: /eval\(/g, message: 'Uses eval() - potential security risk' },
            { pattern: /innerHTML\s*=/g, message: 'Uses innerHTML - XSS risk, use textContent or sanitize' },
            { pattern: /QB-USER-TOKEN|userToken/gi, message: 'Contains hardcoded token - security risk!' },
            { pattern: /password/gi, message: 'Contains password reference - verify if intentional' }
          ];
          
          for (const { pattern, message } of securityChecks) {
            if (pattern.test(code)) {
              results.errors.push(`🔒 Security: ${message}`);
              results.valid = false;
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      },

      quickbase_export_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_export_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const recordId = this.parseNumber(params.recordId, 'recordId');
        const format = params.format || 'html';
        
        const record = await this.qbClient.getRecord(tableId, recordId);
        
        let exportContent = '';
        
        if (format === 'html') {
          exportContent = record[7]?.value || ''; // Code field
        } else if (format === 'json') {
          exportContent = JSON.stringify({
            name: record[6]?.value,
            code: record[7]?.value,
            description: record[8]?.value,
            version: record[9]?.value,
            tags: record[10]?.value,
            targetTableId: record[12]?.value
          }, null, 2);
        } else if (format === 'markdown') {
          exportContent = `# ${record[6]?.value || 'Untitled'}\n\n`;
          exportContent += `**Version:** ${record[9]?.value || 'N/A'}\n`;
          exportContent += `**Description:** ${record[8]?.value || 'N/A'}\n\n`;
          exportContent += `## Code\n\n\`\`\`javascript\n${record[7]?.value || ''}\n\`\`\`\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: exportContent
            }
          ]
        };
      },

      quickbase_import_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_import_codepage');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const source = this.toStringParam(params.source, 'source');
        const format = params.format || 'auto';
        
        let codepageData: any = {};
        
        // Parse source based on format
        if (format === 'json' || (format === 'auto' && source.trim().startsWith('{'))) {
          codepageData = JSON.parse(source);
        } else {
          // Treat as HTML/code
          codepageData = {
            name: 'Imported Codepage',
            code: source
          };
        }
        
        // Check if overwrite needed
        if (!params.overwrite && codepageData.name) {
          const existing = await this.qbClient.getRecords(tableId, {
            where: `{6.EX.'${codepageData.name}'}`,
            select: [3]
          });
          
          if (existing.length > 0) {
            throw new Error(`Codepage with name "${codepageData.name}" already exists. Use overwrite: true to replace.`);
          }
        }
        
        const fields: Record<string, any> = {
          6: { value: codepageData.name || 'Imported Codepage' },
          7: { value: codepageData.code || '' }
        };
        
        if (codepageData.description) fields[8] = { value: codepageData.description };
        if (codepageData.version) fields[9] = { value: codepageData.version };
        if (codepageData.tags) fields[10] = { value: Array.isArray(codepageData.tags) ? codepageData.tags.join(', ') : codepageData.tags };
        if (codepageData.targetTableId) fields[12] = { value: codepageData.targetTableId };
        
        const recordId = await this.qbClient.createRecord(tableId, { fields });
        
        return {
          content: [
            {
              type: 'text',
              text: `Codepage imported successfully! Record ID: ${recordId}`
            }
          ]
        };
      },

      quickbase_save_codepage_version: async (args) => {
        const params = this.ensureObject(args, 'quickbase_save_codepage_version');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_VERSION_TABLE_ID', 'codepage version table ID');
        
        const fields: Record<string, any> = {
          6: { value: this.parseNumber(params.codepageRecordId, 'codepageRecordId') }, // Reference to main codepage
          7: { value: this.toStringParam(params.version, 'version') }, // Version number
          8: { value: this.toStringParam(params.code, 'code') }, // Code snapshot
        };
        
        if (params.changeLog) fields[9] = { value: params.changeLog };
        
        const versionId = await this.qbClient.createRecord(tableId, { fields });
        
        return {
          content: [
            {
              type: 'text',
              text: `Version ${params.version} saved with record ID: ${versionId}`
            }
          ]
        };
      },

      quickbase_get_codepage_versions: async (args) => {
        const params = this.ensureObject(args, 'quickbase_get_codepage_versions');
        const tableId = this.resolveTableId(params.tableId, 'CODEPAGE_VERSION_TABLE_ID', 'codepage version table ID');
        const codepageId = this.parseNumber(params.codepageRecordId, 'codepageRecordId');
        
        const versions = await this.qbClient.getRecords(tableId, {
          where: `{6.EX.'${codepageId}'}`, // Filter by codepage reference
          select: [3, 6, 7, 8, 9], // ID, CodepageRef, Version, Code, ChangeLog
          sortBy: [{ fieldId: 7, order: 'DESC' }], // Sort by version DESC
          top: params.limit || 50
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(versions, null, 2)
            }
          ]
        };
      },

      quickbase_rollback_codepage: async (args) => {
        const params = this.ensureObject(args, 'quickbase_rollback_codepage');
        const codepageTableId = this.resolveTableId(params.tableId, 'CODEPAGE_TABLE_ID', 'codepage table ID');
        const codepageId = this.parseNumber(params.codepageRecordId, 'codepageRecordId');
        const versionId = this.parseNumber(params.versionRecordId, 'versionRecordId');
        
        // Get version table ID (assuming it's configured)
        const versionTableId = process.env.CODEPAGE_VERSION_TABLE_ID || 'bltcpt7db'; // Adjust as needed
        
        // Get the version record
        const version = await this.qbClient.getRecord(versionTableId, versionId);
        
        // Update main codepage with version code
        await this.qbClient.updateRecord(codepageTableId, codepageId, {
          7: { value: version[8]?.value }, // Restore code
          9: { value: version[7]?.value }  // Update version number
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Codepage ${codepageId} rolled back to version ${version[7]?.value}`
            }
          ]
        };
      }
    };
  }

  private createAuthHandlers(): Record<string, ToolHandler> {
    return {
      quickbase_initiate_oauth: async (args) => {
        const params = this.ensureObject(args, 'quickbase_initiate_oauth');
        const url = this.qbClient.generateOAuthUrl(
          this.toStringParam(params.clientId, 'clientId'),
          this.toStringParam(params.redirectUri, 'redirectUri'),
          Array.isArray(params.scopes)
            ? params.scopes.map((scope: unknown, index: number) => this.toStringParam(scope, `scopes[${index}]`))
            : undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: `OAuth URL: ${url}`
            }
          ]
        };
      }
    };
  }

  private ensureObject(args: unknown, toolName: string): Record<string, any> {
    if (!args || typeof args !== 'object') {
      throw new TypeError(`Invalid arguments for ${toolName}`);
    }
    return args as Record<string, any>;
  }

  private resolveTableId(value: unknown, envKey: string, description: string): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    const envValue = process.env[envKey];
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim();
    }
    throw new Error(`Missing ${description}`);
  }

  private toStringParam(value: unknown, fieldName: string): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    throw new TypeError(`Invalid value for ${fieldName}`);
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    throw new TypeError('Invalid string value');
  }

  private parseNumber(value: unknown, fieldName: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    throw new TypeError(`Invalid number for ${fieldName}`);
  }

  private parseOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    throw new TypeError('Invalid number value');
  }

  private toNumberArray(value: unknown, fieldName: string): number[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new TypeError(`Invalid value for ${fieldName}`);
    }
    return value.map((item, index) => this.parseNumber(item, `${fieldName}[${index}]`));
  }

  private toStringArray(value: unknown, fieldName: string): string[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new TypeError(`Invalid value for ${fieldName}`);
    }
    return value.map((item, index) => this.toStringParam(item, `${fieldName}[${index}]`));
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QuickBase MCP server running on stdio');
  }
}

// Start the server
async function main() {
  const server = new QuickBaseMCPServer();
  await server.run();
}

try {
  await main();
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}