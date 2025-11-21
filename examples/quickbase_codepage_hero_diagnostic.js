/**
 * QuickBase Codepage Hero - DIAGNOSTIC VERSION
 * Version: 2.0.1-diagnostic
 *
 * This version includes extensive logging to diagnose the 404 error
 * and provides fallback authentication methods.
 */

(function() {
    'use strict';

    class QuickBaseClient {
        constructor(options = {}) {
            this.mode = 'diagnostic';
            this.baseURL = 'https://api.quickbase.com/v1';
            this.timeout = options.timeout || 30000;
            this.maxRetries = options.maxRetries || 3;
            this.tokenCache = new Map();
            this.tokenExpiry = 5 * 60 * 1000; // 5 minutes
            this.debugMode = true;

            // Get realm from current location
            const hostname = window.location.hostname;
            if (hostname.includes('quickbase.com')) {
                const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
                this.realm = realmMatch ? realmMatch[1] : hostname;
            } else {
                this.realm = 'localhost';
            }

            this.log('🔧 DIAGNOSTIC MODE ENABLED');
            this.log('Realm:', this.realm);
            this.log('Hostname:', hostname);
            this.log('Base URL:', this.baseURL);
        }

        log(...args) {
            if (this.debugMode) {
                console.log('[QB Diagnostic]', ...args);
            }
        }

        error(...args) {
            console.error('[QB Diagnostic ERROR]', ...args);
        }

        /**
         * Test if temporary token endpoint is available
         */
        async testTempTokenEndpoint(tableId) {
            const url = `${this.baseURL}/auth/temporary/${tableId}`;
            this.log('🧪 Testing temporary token endpoint:', url);
            this.log('Headers:', {
                'QB-Realm-Hostname': `${this.realm}.quickbase.com`
            });

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                    },
                    credentials: 'include'
                });

                this.log('Response status:', response.status);
                this.log('Response headers:', Object.fromEntries(response.headers.entries()));

                if (!response.ok) {
                    const errorText = await response.text();
                    this.error('Temporary token endpoint failed');
                    this.error('Status:', response.status);
                    this.error('Response:', errorText);
                    return {
                        available: false,
                        status: response.status,
                        error: errorText
                    };
                }

                const data = await response.json();
                this.log('✅ Temporary token endpoint available!');
                this.log('Token received:', data.temporaryAuthorization ? 'Yes' : 'No');

                return {
                    available: true,
                    token: data.temporaryAuthorization
                };
            } catch (error) {
                this.error('Exception testing temporary token endpoint:', error);
                return {
                    available: false,
                    error: error.message
                };
            }
        }

        /**
         * Get temporary token for a specific table
         */
        async getTemporaryToken(tableId) {
            // Check cache first
            const cached = this.tokenCache.get(tableId);
            if (cached && (Date.now() - cached.timestamp < this.tokenExpiry)) {
                this.log('Using cached token for table:', tableId);
                return cached.token;
            }

            this.log('Requesting new temporary token for table:', tableId);

            // Request new token
            const url = `${this.baseURL}/auth/temporary/${tableId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                },
                credentials: 'include'
            });

            this.log('Token request status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                this.error('Failed to get temporary token');
                this.error('URL:', url);
                this.error('Status:', response.status);
                this.error('Response:', errorText);

                throw new Error(`Failed to get temporary token: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const token = data.temporaryAuthorization;

            this.log('✅ Token received successfully');

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

            this.log(`📤 ${method} ${endpoint}`);
            this.log('Table ID:', tableId);
            this.log('Request data:', data);

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
                credentials: 'omit'
            };

            if (data && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
                config.body = JSON.stringify(data);
                this.log('Request body:', config.body);
            } else if (data && method.toUpperCase() === 'GET') {
                const params = new URLSearchParams();
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        params.append(key, value.toString());
                    }
                });
                url += `?${params.toString()}`;
            }

            this.log('Full URL:', url);
            this.log('Headers:', config.headers);

            let lastError;
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    this.log(`🔄 Attempt ${attempt}/${this.maxRetries}`);

                    const response = await fetch(url, config);

                    this.log('Response status:', response.status);
                    this.log('Response headers:', Object.fromEntries(response.headers.entries()));

                    if (!response.ok) {
                        const errorText = await response.text();
                        this.error('API request failed');
                        this.error('Status:', response.status);
                        this.error('Response:', errorText);

                        // Token expired? Clear cache and retry once
                        if (response.status === 401 && attempt === 1) {
                            this.log('⚠️ Token expired, clearing cache and retrying');
                            this.tokenCache.delete(tableId);
                            continue;
                        }

                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    const result = await response.json();
                    this.log('✅ Success! Response:', result);
                    return result;

                } catch (error) {
                    lastError = error;
                    this.error(`Attempt ${attempt} failed:`, error.message);

                    if (attempt < this.maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000;
                        this.log(`⏳ Waiting ${delay}ms before retry`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw lastError;
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

            this.log('📝 Creating records in table:', tableId);
            this.log('Number of records:', data.data.length);
            this.log('Record data:', data.data);

            return this.post('/records', data, tableId);
        }

        /**
         * POST request wrapper
         */
        async post(endpoint, data = {}, tableId = null) {
            return this.request('POST', endpoint, data, tableId);
        }

        /**
         * GET request wrapper
         */
        async get(endpoint, params = {}, tableId = null) {
            return this.request('GET', endpoint, params, tableId);
        }

        /**
         * Get table fields
         */
        async getFields(tableId) {
            return this.get('/fields', { tableId }, tableId);
        }

        /**
         * Get tables in an app
         */
        async getTables(appId) {
            return this.get('/tables', { appId }, appId);
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

        // Add diagnostic helper
        window.qbDiagnostic = {
            testTempToken: (tableId) => client.testTempTokenEndpoint(tableId),
            checkAuth: async () => {
                console.log('=== QuickBase Authentication Diagnostic ===');
                console.log('Realm:', client.realm);
                console.log('Base URL:', client.baseURL);
                console.log('Session cookies:', document.cookie ? 'Present' : 'None');
                console.log('');
                console.log('To test temporary token endpoint:');
                console.log('  qbDiagnostic.testTempToken("YOUR_TABLE_ID")');
            }
        };
    }

    console.log('');
    console.log('============================================');
    console.log('[QuickBase Codepage Hero] DIAGNOSTIC v2.0.1');
    console.log('============================================');
    console.log('');
    console.log('Run qbDiagnostic.checkAuth() for diagnostic info');
    console.log('Run qbDiagnostic.testTempToken("tableId") to test');
    console.log('');

})();
