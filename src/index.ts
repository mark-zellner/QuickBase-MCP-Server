#!/usr/bin/env node

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

class QuickBaseMCPServer {
  private server: Server;
  private qbClient: QuickBaseClient;

  constructor() {
    // Validate environment variables
    const config: QuickBaseConfig = {
      realm: process.env.QB_REALM || '',
      userToken: process.env.QB_USER_TOKEN || '',
      appId: process.env.QB_APP_ID || '',
      timeout: parseInt(process.env.QB_DEFAULT_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.QB_MAX_RETRIES || '3')
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

      try {
        switch (name) {
          // ========== APPLICATION TOOLS ==========
          case 'quickbase_get_app_info':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getAppInfo(), null, 2),
                },
              ],
            };

          case 'quickbase_get_tables':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getAppTables(), null, 2),
                },
              ],
            };

          case 'quickbase_test_connection':
            const isConnected = await this.qbClient.testConnection();
            return {
              content: [
                {
                  type: 'text',
                  text: `Connection ${isConnected ? 'successful' : 'failed'}`,
                },
              ],
            };

          // ========== TABLE TOOLS ==========
          case 'quickbase_create_table':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const tableId = await this.qbClient.createTable({
              name: args.name as string,
              description: args.description as string
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Table created with ID: ${tableId}`,
                },
              ],
            };

          case 'quickbase_get_table_info':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getTableInfo(args.tableId as string), null, 2),
                },
              ],
            };

          case 'quickbase_delete_table':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.deleteTable(args.tableId as string);
            return {
              content: [
                {
                  type: 'text',
                  text: `Table ${args.tableId} deleted successfully`,
                },
              ],
            };

          // ========== FIELD TOOLS ==========
          case 'quickbase_get_table_fields':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getTableFields(args.tableId as string), null, 2),
                },
              ],
            };

          case 'quickbase_create_field':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const fieldId = await this.qbClient.createField(args.tableId as string, {
              label: args.label as string,
              fieldType: args.fieldType as any,
              required: (args.required as boolean) || false,
              unique: (args.unique as boolean) || false,
              choices: args.choices as string[],
              formula: args.formula as string,
              lookupReference: args.lookupTableId ? {
                tableId: args.lookupTableId as string,
                fieldId: args.lookupFieldId as number
              } : undefined
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Field created with ID: ${fieldId}`,
                },
              ],
            };

          case 'quickbase_update_field':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.updateField(args.tableId as string, args.fieldId as number, {
              label: args.label as string,
              required: args.required as boolean,
              choices: args.choices as string[]
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Field ${args.fieldId} updated successfully`,
                },
              ],
            };

          case 'quickbase_delete_field':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.deleteField(args.tableId as string, args.fieldId as number);
            return {
              content: [
                {
                  type: 'text',
                  text: `Field ${args.fieldId} deleted successfully`,
                },
              ],
            };

          // ========== RECORD TOOLS ==========
          case 'quickbase_query_records':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const records = await this.qbClient.getRecords(args.tableId as string, {
              select: args.select as number[],
              where: args.where as string,
              sortBy: args.sortBy as any[],
              top: args.top as number,
              skip: args.skip as number
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(records, null, 2),
                },
              ],
            };

          case 'quickbase_get_record':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const record = await this.qbClient.getRecord(
              args.tableId as string, 
              args.recordId as number, 
              args.fieldIds as number[]
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(record, null, 2),
                },
              ],
            };

          case 'quickbase_create_record':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const newRecordId = await this.qbClient.createRecord(args.tableId as string, {
              fields: args.fields as Record<string, any>
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Record created with ID: ${newRecordId}`,
                },
              ],
            };

          case 'quickbase_update_record':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.updateRecord(
              args.tableId as string, 
              args.recordId as number, 
              args.fields as Record<string, any>
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Record ${args.recordId} updated successfully`,
                },
              ],
            };

          case 'quickbase_delete_record':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.deleteRecord(args.tableId as string, args.recordId as number);
            return {
              content: [
                {
                  type: 'text',
                  text: `Record ${args.recordId} deleted successfully`,
                },
              ],
            };

          case 'quickbase_bulk_create_records':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const recordIds = await this.qbClient.createRecords(
              args.tableId as string, 
              args.records as any[]
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${recordIds.length} records: ${recordIds.join(', ')}`,
                },
              ],
            };

          case 'quickbase_search_records':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const searchResults = await this.qbClient.searchRecords(
              args.tableId as string, 
              args.searchTerm as string, 
              args.fieldIds as number[]
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchResults, null, 2),
                },
              ],
            };

          // ========== RELATIONSHIP TOOLS ==========
          case 'quickbase_create_relationship':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            await this.qbClient.createRelationship(
              args.parentTableId as string,
              args.childTableId as string,
              args.foreignKeyFieldId as number
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Relationship created between ${args.parentTableId} and ${args.childTableId}`,
                },
              ],
            };

          case 'quickbase_get_relationships':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getRelationships(args.tableId as string), null, 2),
                },
              ],
            };

          // ========== UTILITY TOOLS ==========
          case 'quickbase_get_reports':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getReports(args.tableId as string), null, 2),
                },
              ],
            };

          case 'quickbase_run_report':
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.qbClient.runReport(args.reportId as string, args.tableId as string), 
                    null, 
                    2
                  ),
                },
              ],
            };

          // ========== CODEPAGE TOOLS ==========
          case 'quickbase_save_codepage': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const codepageRecordId = await this.qbClient.saveCodepage(
              args.tableId as string,
              args.name as string,
              args.code as string,
              args.description as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Codepage saved with record ID: ${codepageRecordId}`,
                },
              ],
            };
          }

          case 'quickbase_get_codepage': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.getCodepage(args.tableId as string, args.recordId as number), null, 2),
                },
              ],
            };
          }

          case 'quickbase_list_codepages': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.listCodepages(args.tableId as string, args.limit as number), null, 2),
                },
              ],
            };
          }

          case 'quickbase_execute_codepage': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.qbClient.executeCodepage(
                    args.tableId as string,
                    args.recordId as number,
                    args.functionName as string,
                    args.parameters as Record<string, any>
                  ), null, 2),
                },
              ],
            };
          }

          // ========== AUTH TOOLS ==========
          case 'quickbase_initiate_oauth': {
            if (!args || typeof args !== 'object') {
              throw new Error('Invalid arguments');
            }
            const oauthUrl = this.qbClient.generateOAuthUrl(
              args.clientId as string,
              args.redirectUri as string,
              args.scopes as string[]
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `OAuth URL: ${oauthUrl}`,
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QuickBase MCP server running on stdio');
  }
}

// Start the server
async function main() {
  try {
    const server = new QuickBaseMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error); 