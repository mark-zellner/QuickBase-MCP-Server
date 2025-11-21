/**
 * QuickBase Codepage Hero - App Token Authentication
 * Version: 2.1.0
 * Last Updated: October 25, 2025
 *
 * AUTHENTICATION STRATEGY:
 * Uses app tokens for reliable, widely-supported authentication
 * App tokens work across all QuickBase realms and subscription levels
 *
 * SETUP:
 * 1. Create an app token in QuickBase (Settings → App Properties → Manage App Tokens)
 * 2. Deploy this file to a QuickBase codepage (pageID=3)
 * 3. In your application, call: qbClient.setAppToken('YOUR_APP_TOKEN')
 *
 * SECURITY NOTE:
 * App tokens visible in codepages should be scoped to minimum required permissions.
 * Use QuickBase role-based access control to limit what the app token can do.
 */

(function() {
    'use strict';

    class QuickBaseClient {
        constructor(options = {}) {
            this.mode = 'app-token';
            this.baseURL = 'https://api.quickbase.com/v1';
            this.appToken = options.appToken || '';
            this.timeout = options.timeout || 30000;
            this.maxRetries = options.maxRetries || 3;

            // Get realm from current location
            const hostname = window.location.hostname;
            if (hostname.includes('quickbase.com')) {
                const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
                this.realm = realmMatch ? realmMatch[1] : hostname;
            } else {
                this.realm = 'localhost'; // Development mode
            }

            console.log('[QuickBaseClient] App Token Mode - Realm:', this.realm);
        }

        /**
         * Set the app token for authentication
         * @param {string} token - Your QuickBase app token
         */
        setAppToken(token) {
            if (!token || typeof token !== 'string') {
                throw new Error('Invalid app token');
            }
            this.appToken = token;
            console.log('[QuickBaseClient] ✅ App token configured');
        }

        /**
         * Make authenticated API request using app token
         */
        async request(method, endpoint, data = null) {
            if (!this.appToken) {
                throw new Error(
                    'App token not configured. ' +
                    'Call qbClient.setAppToken("YOUR_TOKEN") first. ' +
                    'Get a token from: Settings → App Properties → Manage App Tokens'
                );
            }

            let url = `${this.baseURL}${endpoint}`;

            const config = {
                method: method.toUpperCase(),
                headers: {
                    'Authorization': `QB-APP-TOKEN ${this.appToken}`,
                    'Content-Type': 'application/json',
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                }
            };

            if (data && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
                config.body = JSON.stringify(data);
            } else if (data && method.toUpperCase() === 'GET') {
                const params = new URLSearchParams();
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        params.append(key, value.toString());
                    }
                });
                url += `?${params.toString()}`;
            }

            let lastError;
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    console.log(`[QB] ${method} ${endpoint} (attempt ${attempt})`);

                    const response = await fetch(url, config);

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    const result = await response.json();
                    console.log(`[QB] Success: ${method} ${endpoint}`);
                    return result;

                } catch (error) {
                    lastError = error;
                    console.warn(`[QB] Attempt ${attempt} failed:`, error.message);

                    if (attempt < this.maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }
            }

            throw lastError;
        }

        /**
         * GET request wrapper
         */
        async get(endpoint, params = {}) {
            return this.request('GET', endpoint, params);
        }

        /**
         * POST request wrapper
         */
        async post(endpoint, data = {}) {
            return this.request('POST', endpoint, data);
        }

        /**
         * PATCH request wrapper
         */
        async patch(endpoint, data = {}) {
            return this.request('PATCH', endpoint, data);
        }

        /**
         * DELETE request wrapper
         */
        async delete(endpoint, data = {}) {
            return this.request('DELETE', endpoint, data);
        }

        /**
         * Query records from a table
         */
        async queryRecords(tableId, options = {}) {
            const data = {
                from: tableId,
                ...options
            };
            return this.post('/records/query', data);
        }

        /**
         * Create new records
         */
        async createRecords(tableId, records) {
            const data = {
                to: tableId,
                data: Array.isArray(records) ? records : [records]
            };
            return this.post('/records', data);
        }

        /**
         * Update existing records
         */
        async updateRecords(tableId, records) {
            const data = {
                to: tableId,
                data: Array.isArray(records) ? records : [records]
            };
            return this.patch('/records', data);
        }

        /**
         * Delete records
         */
        async deleteRecords(tableId, recordIds) {
            const data = {
                from: tableId,
                where: recordIds.map(id => `{3.EX.${id}}`).join('OR')
            };
            return this.delete('/records', data);
        }

        /**
         * Get table fields
         */
        async getFields(tableId) {
            return this.get('/fields', { tableId });
        }

        /**
         * Get app info
         */
        async getApp(appId) {
            return this.get(`/apps/${appId}`);
        }

        /**
         * Get tables in an app
         */
        async getTables(appId) {
            return this.get('/tables', { appId });
        }

        /**
         * Get reports for a table
         */
        async getReports(tableId) {
            return this.get('/reports', { tableId });
        }

        /**
         * Run a report
         */
        async runReport(tableId, reportId, options = {}) {
            const data = {
                from: tableId,
                reportId: reportId,
                ...options
            };
            return this.post('/records/query', data);
        }

        /**
         * Get app information including all tables
         */
        async getAppInfo(appId) {
            const [appData, tables] = await Promise.all([
                this.getApp(appId),
                this.getTables(appId)
            ]);

            return {
                ...appData,
                tables: tables
            };
        }

        /**
         * Get complete table schema including fields and relationships
         */
        async getTableSchema(tableId) {
            const fields = await this.getFields(tableId);

            return {
                tableId: tableId,
                fields: fields,
                fieldMap: fields.reduce((map, field) => {
                    map[field.id] = field;
                    return map;
                }, {}),
                editableFields: fields.filter(f => f.mode === 'user' || f.mode === 'normal'),
                requiredFields: fields.filter(f => f.required)
            };
        }

        /**
         * Bulk create records with batching
         */
        async bulkCreateRecords(tableId, records, batchSize = 100) {
            const results = [];

            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const result = await this.createRecords(tableId, batch);
                results.push(result);

                console.log(`[QB] Created batch ${i / batchSize + 1}: ${batch.length} records`);
            }

            return results;
        }
    }

    // Initialize and export globally
    const client = new QuickBaseClient();

    // Multiple exports for compatibility
    if (typeof window !== 'undefined') {
        window.client = client;
        window.qbClient = client;
        window.Client = QuickBaseClient;
        window.QuickBaseClient = QuickBaseClient;
    }

    console.log('');
    console.log('==============================================');
    console.log('[QuickBase Codepage Hero] v2.1.0 - App Token');
    console.log('==============================================');
    console.log('');
    console.log('Configure your app token:');
    console.log('  qbClient.setAppToken("YOUR_APP_TOKEN")');
    console.log('');
    console.log('Get an app token from:');
    console.log('  Settings → App Properties → Manage App Tokens');
    console.log('');

})();
