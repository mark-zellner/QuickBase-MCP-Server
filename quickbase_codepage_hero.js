/**
 * QuickBase Codepage Hero - Session Authentication Client
 * Deploy this as a separate QuickBase codepage for session-based API access
 * Version: 1.0.0
 * Last Updated: October 16, 2025
 */

class QuickBaseClient {
    constructor(options = {}) {
        this.mode = 'session'; // Indicates session authentication mode
        this.baseURL = 'https://api.quickbase.com/v1';
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;

        // Get realm from current location
        const realmMatch = window.location.hostname.match(/^(.+)\.quickbase\.com$/);
        this.realm = realmMatch ? realmMatch[1] : null;

        if (!this.realm) {
            throw new Error('Unable to determine QuickBase realm from hostname');
        }

        console.log(`[QuickBaseClient] Initialized for realm: ${this.realm}`);
    }

    /**
     * Make authenticated API request using session cookies
     */
    async request(method, endpoint, data = null) {
        let url = `${this.baseURL}${endpoint}`;

        const config = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'QB-Realm-Hostname': `${this.realm}.quickbase.com`
            },
            credentials: 'include', // Include session cookies
            timeout: this.timeout
        };

        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PATCH' || method.toUpperCase() === 'PUT')) {
            config.body = JSON.stringify(data);
        } else if (data && method.toUpperCase() === 'GET') {
            // For GET requests, add query parameters
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
                console.log(`[QuickBaseClient] ${method.toUpperCase()} ${endpoint} (attempt ${attempt})`);

                const response = await fetch(url, config);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }

                const result = await response.json();
                console.log(`[QuickBaseClient] Success: ${method.toUpperCase()} ${endpoint}`);
                return result;

            } catch (error) {
                lastError = error;
                console.warn(`[QuickBaseClient] Attempt ${attempt} failed:`, error.message);

                if (attempt < this.maxRetries) {
                    // Wait before retry (exponential backoff)
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
    async delete(endpoint, params = {}) {
        return this.request('DELETE', endpoint, params);
    }

    /**
     * Query records from a table
     */
    async queryRecords(tableId, options = {}) {
        const endpoint = `/records`;

        const queryParams = {
            from: tableId,
            ...options
        };

        return this.get(endpoint, queryParams);
    }

    /**
     * Create new records
     */
    async createRecords(tableId, records) {
        const endpoint = `/records`;

        const data = {
            to: tableId,
            data: records
        };

        return this.post(endpoint, data);
    }

    /**
     * Update existing records
     */
    async updateRecords(tableId, records) {
        const endpoint = `/records`;

        const data = {
            to: tableId,
            data: records
        };

        return this.patch(endpoint, data);
    }

    /**
     * Delete records
     */
    async deleteRecords(tableId, recordIds) {
        const endpoint = `/records`;

        const data = {
            from: tableId,
            where: recordIds.map(id => `{3.EX.${id}}`).join('OR')
        };

        return this.delete(endpoint, data);
    }

    /**
     * Get table fields
     */
    async getFields(tableId) {
        const endpoint = `/fields`;
        return this.get(endpoint, { tableId });
    }

    /**
     * Get apps
     */
    async getApps() {
        const endpoint = `/apps`;
        return this.get(endpoint);
    }

    /**
     * Get tables in an app
     */
    async getTables(appId) {
        const endpoint = `/tables`;
        return this.get(endpoint, { appId });
    }
}

// Export for global use
const client = new QuickBaseClient();
window.client = client;
window.qbClient = client;
window.Client = client;

console.log('[QuickBase Codepage Hero] Session client initialized and exported globally');