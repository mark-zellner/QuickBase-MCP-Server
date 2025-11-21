/**
 * QuickBase Codepage Hero - Pure Session Authentication
 * Version: 2.2.0
 * Last Updated: October 25, 2025
 *
 * AUTHENTICATION STRATEGY:
 * Uses ONLY session cookies - NO TOKENS OF ANY KIND
 * Perfect for QuickBase codepages where exposing tokens is a security concern
 *
 * HOW IT WORKS:
 * - All requests go directly to api.quickbase.com
 * - Uses session cookies (credentials: 'include')
 * - No temporary tokens, no app tokens, no user tokens
 * - Relies on user's active QuickBase session
 *
 * SECURITY:
 * ✅ No tokens visible in code
 * ✅ Uses user's own permissions
 * ✅ No credential storage
 * ✅ Session-scoped access only
 *
 * REQUIREMENTS:
 * - Must be loaded from within QuickBase (session cookies required)
 * - User must be logged into QuickBase
 * - User must have appropriate table permissions
 */

(function() {
    'use strict';

    class QuickBaseClient {
        constructor(options = {}) {
            this.mode = 'pure-session';
            this.baseURL = 'https://api.quickbase.com/v1';
            this.timeout = options.timeout || 30000;
            this.maxRetries = options.maxRetries || 3;

            // Get realm from current location
            const hostname = window.location.hostname;
            if (hostname.includes('quickbase.com')) {
                const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
                this.realm = realmMatch ? realmMatch[1] : hostname;
            } else {
                this.realm = 'localhost';
            }

            console.log('[QuickBaseClient] Pure Session Mode - Realm:', this.realm);
            console.log('[QuickBaseClient] ✅ Zero tokens - 100% session-based');
        }

        /**
         * Make authenticated API request using ONLY session cookies
         * No tokens of any kind
         */
        async request(method, endpoint, data = null) {
            let url = `${this.baseURL}${endpoint}`;

            const config = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                },
                credentials: 'include', // This is the magic - use session cookies
                mode: 'cors'
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

                        // Session expired or auth issue
                        if (response.status === 401) {
                            throw new Error(
                                'Session expired or not authenticated. ' +
                                'Please refresh the page to re-establish your QuickBase session.'
                            );
                        }

                        // Permission issue
                        if (response.status === 403) {
                            throw new Error(
                                `Permission denied. You may not have access to this table or operation. ` +
                                `Status: ${response.status}`
                            );
                        }

                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    const result = await response.json();
                    console.log(`[QB] Success: ${method} ${endpoint}`);
                    return result;

                } catch (error) {
                    lastError = error;
                    console.warn(`[QB] Attempt ${attempt} failed:`, error.message);

                    // Don't retry auth errors
                    if (error.message.includes('Session expired') || error.message.includes('Permission denied')) {
                        throw error;
                    }

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
            // DELETE with body requires special handling
            let url = `${this.baseURL}${endpoint}`;

            const config = {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                },
                credentials: 'include',
                mode: 'cors',
                body: JSON.stringify(data)
            };

            const response = await fetch(url, config);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json();
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
         * Test connection and permissions
         */
        async testConnection(tableId) {
            try {
                console.log('Testing connection with table:', tableId);

                // Try to get fields as a simple test
                const fields = await this.getFields(tableId);

                console.log('✅ Connection successful!');
                console.log('- Session: Active');
                console.log('- Permissions: OK');
                console.log('- Fields found:', fields.length);

                return {
                    success: true,
                    message: 'Connection successful',
                    fieldsCount: fields.length
                };
            } catch (error) {
                console.error('❌ Connection failed:', error.message);

                return {
                    success: false,
                    message: error.message,
                    suggestion: error.message.includes('Session expired')
                        ? 'Refresh the page to re-establish your session'
                        : error.message.includes('Permission denied')
                        ? 'Check your table permissions in QuickBase'
                        : 'Check console for details'
                };
            }
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
    console.log('===============================================');
    console.log('[QuickBase Codepage Hero] v2.2.0 - Pure Session');
    console.log('===============================================');
    console.log('');
    console.log('✅ No tokens - 100% session-based authentication');
    console.log('✅ Uses your QuickBase login session');
    console.log('✅ No credentials visible in code');
    console.log('');
    console.log('Test connection:');
    console.log('  await qbClient.testConnection("YOUR_TABLE_ID")');
    console.log('');

})();
