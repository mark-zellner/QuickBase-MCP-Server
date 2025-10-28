/* eslint-disable sonarjs/cognitive-complexity */
/**
 * QuickBase Codepage Hero - Session Authentication Client
 * Deploy this as a separate QuickBase codepage for session-based API access
 * Version: 2.0.0
 * Last Updated: October 25, 2025
 *
 * AUTHENTICATION STRATEGY:
 * Uses temporary token authentication for secure, session-based API access
 * No user tokens required - leverages current user's session cookies
 */

(function() {
    'use strict';

    class QuickBaseClient {
        constructor(options = {}) {
            this.mode = 'session-temp-token';
            this.baseURL = 'https://api.quickbase.com/v1';
            this.timeout = options.timeout || 30000;
            this.maxRetries = options.maxRetries || 3;
            this.tokenCache = new Map(); // Cache temp tokens by tableId
            this.tokenExpiry = 5 * 60 * 1000; // 5 minutes

            // Get realm from current location
            const hostname = globalThis.location?.hostname ?? '';
            if (hostname.includes('quickbase.com')) {
                const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
                this.realm = realmMatch ? realmMatch[1] : hostname;
            } else {
                this.realm = hostname || 'localhost'; // Development mode
            }

            console.log('[QuickBaseClient] Initialized for realm:', this.realm);
        }

        /**
         * Get temporary token for a specific table
         * Caches tokens to minimize API calls
         */
        async getTemporaryToken(tableId) {
            // Check cache
            const cached = this.tokenCache.get(tableId);
            if (cached && (Date.now() - cached.timestamp < this.tokenExpiry)) {
                return cached.token;
            }

            // Request new token
            const url = `${this.baseURL}/auth/temporary/${tableId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get temporary token: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            const token = data.temporaryAuthorization;

            // Cache the token
            this.tokenCache.set(tableId, {
                token: token,
                timestamp: Date.now()
            });

            return token;
        }

        /**
         * Make authenticated API request using temporary token
         */
        async request(method, endpoint, data = null, tableId = null) {
            // Extract tableId from data if not provided
            if (!tableId && data) {
                tableId = data.to || data.from || data.tableId;
            }

            if (!tableId) {
                throw new Error('tableId is required for QuickBase API calls');
            }

            // Get temporary token
            const token = await this.getTemporaryToken(tableId);

            let url = `${this.baseURL}${endpoint}`;

            const config = {
                method: method.toUpperCase(),
                headers: {
                    'Authorization': `QB-TEMP-TOKEN ${token}`,
                    'Content-Type': 'application/json',
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                },
                credentials: 'omit' // Don't send cookies when using temp token
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

                        // Token expired? Clear cache and retry once
                        if (response.status === 401 && attempt === 1) {
                            console.warn('[QB] Token expired, clearing cache and retrying');
                            this.tokenCache.delete(tableId);
                            continue;
                        }

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
        async get(endpoint, params = {}, tableId = null) {
            return this.request('GET', endpoint, params, tableId);
        }

        /**
         * POST request wrapper
         */
        async post(endpoint, data = {}, tableId = null) {
            return this.request('POST', endpoint, data, tableId);
        }

        /**
         * PATCH request wrapper
         */
        async patch(endpoint, data = {}, tableId = null) {
            return this.request('PATCH', endpoint, data, tableId);
        }

        /**
         * DELETE request wrapper
         */
        async delete(endpoint, data = {}, tableId = null) {
            return this.request('DELETE', endpoint, data, tableId);
        }

        /**
         * Query records from a table
         */
        async queryRecords(tableId, options = {}) {
            const data = {
                from: tableId,
                ...options
            };
            return this.post('/records/query', data, tableId);
        }

        /**
         * Create new records
         */
        async createRecords(tableId, records) {
            const data = {
                to: tableId,
                data: Array.isArray(records) ? records : [records]
            };
            return this.post('/records', data, tableId);
        }

        /**
         * Update existing records
         */
        async updateRecords(tableId, records) {
            const data = {
                to: tableId,
                data: Array.isArray(records) ? records : [records]
            };
            return this.patch('/records', data, tableId);
        }

        /**
         * Delete records
         */
        async deleteRecords(tableId, recordIds) {
            const data = {
                from: tableId,
                where: recordIds.map(id => `{3.EX.${id}}`).join('OR')
            };
            return this.delete('/records', data, tableId);
        }

        /**
         * Get table fields
         */
        async getFields(tableId) {
            return this.get('/fields', { tableId }, tableId);
        }

        /**
         * Get app info
         */
        async getApp(appId) {
            return this.get(`/apps/${appId}`, {}, appId);
        }

        /**
         * Get tables in an app
         */
        async getTables(appId) {
            return this.get('/tables', { appId }, appId);
        }

        /**
         * Get reports for a table
         */
        async getReports(tableId) {
            return this.get('/reports', { tableId }, tableId);
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
            return this.post('/records/query', data, tableId);
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

    if (typeof globalThis !== 'undefined') {
        globalThis.client = client;
        globalThis.qbClient = client;
        globalThis.Client = client;
        globalThis.QuickBaseClient = QuickBaseClient;
    }

    console.log('[QuickBase Codepage Hero] v2.0.0 - Temporary token client initialized');

})();