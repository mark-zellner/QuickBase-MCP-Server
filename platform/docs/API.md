# API Documentation

This document provides comprehensive documentation for the QuickBase Codepage Platform REST API.

## 📋 Overview

The platform provides a RESTful API for managing codepage projects, templates, testing, and schema operations. All API endpoints return JSON responses and use standard HTTP status codes.

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

## 🔐 Authentication Endpoints

### Login

Authenticate user and receive JWT token.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "developer",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "expiresIn": "24h"
  }
}
```

### Register

Create new user account.

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "role": "developer"
}
```

### Refresh Token

Refresh JWT token before expiration.

```http
POST /auth/refresh
Authorization: Bearer <current-token>
```

### Logout

Invalidate current JWT token.

```http
POST /auth/logout
Authorization: Bearer <token>
```

## 📁 Project Management

### List Projects

Get all projects for the authenticated user.

```http
GET /projects
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search projects by name
- `status` (string): Filter by status (development, testing, deployed)
- `template` (string): Filter by template type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "Vehicle Pricing Calculator",
      "description": "Calculate vehicle prices with options",
      "templateId": "pricing-calculator",
      "status": "development",
      "ownerId": "user_123",
      "collaborators": ["user_456"],
      "currentVersion": "1.2.0",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasMore": false
  }
}
```

### Create Project

Create a new codepage project.

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Pricing Calculator",
  "description": "Custom vehicle pricing calculator",
  "templateId": "pricing-calculator",
  "collaborators": ["user_456"]
}
```

### Get Project

Get detailed information about a specific project.

```http
GET /projects/{projectId}
Authorization: Bearer <token>
```

### Update Project

Update project metadata.

```http
PUT /projects/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description",
  "collaborators": ["user_456", "user_789"]
}
```

### Delete Project

Delete a project and all its versions.

```http
DELETE /projects/{projectId}
Authorization: Bearer <token>
```

## 💻 Codepage Management

### Get Codepage

Retrieve the current codepage code for a project.

```http
GET /codepages/{projectId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "proj_123",
    "versionId": "ver_456",
    "code": "async function calculatePrice(vehicleId) { ... }",
    "language": "javascript",
    "lastModified": "2024-01-15T10:30:00Z",
    "author": {
      "id": "user_123",
      "name": "John Doe"
    }
  }
}
```

### Save Codepage

Save codepage code and create new version.

```http
PUT /codepages/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "async function calculatePrice(vehicleId) { ... }",
  "changelog": "Added discount calculation logic",
  "minorVersion": false
}
```

### Get Version History

Get all versions of a codepage.

```http
GET /codepages/{projectId}/versions
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

### Get Specific Version

Get a specific version of a codepage.

```http
GET /codepages/{projectId}/versions/{versionId}
Authorization: Bearer <token>
```

### Compare Versions

Compare two versions of a codepage.

```http
GET /codepages/{projectId}/compare/{version1}/{version2}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version1": "1.1.0",
    "version2": "1.2.0",
    "diff": {
      "additions": 15,
      "deletions": 3,
      "changes": [
        {
          "type": "addition",
          "line": 25,
          "content": "const discount = calculateDiscount();"
        }
      ]
    }
  }
}
```

## 🧪 Testing

### Execute Test

Run a codepage in the test environment.

```http
POST /tests/{projectId}/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "versionId": "ver_456",
  "testData": {
    "vehicleId": "vehicle_123",
    "customerId": "customer_456",
    "selectedOptions": ["option_1", "option_2"]
  },
  "mockData": {
    "vehicles": [
      {
        "id": "vehicle_123",
        "fields": {
          "3": { "value": "2024 Honda Accord" },
          "8": { "value": 28000 }
        }
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "testId": "test_789",
    "status": "completed",
    "result": {
      "success": true,
      "data": {
        "finalPrice": 29200,
        "breakdown": [...]
      }
    },
    "performance": {
      "executionTime": 245,
      "memoryUsage": 15.2,
      "apiCallCount": 3
    },
    "apiCalls": [
      {
        "method": "getRecord",
        "table": "vehicles",
        "recordId": "vehicle_123",
        "duration": 45
      }
    ],
    "executedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Test Results

Retrieve results from a previous test execution.

```http
GET /tests/{projectId}/results/{testId}
Authorization: Bearer <token>
```

### List Test History

Get test execution history for a project.

```http
GET /tests/{projectId}/history
Authorization: Bearer <token>
```

## 📋 Template Management

### List Templates

Get all available codepage templates.

```http
GET /templates
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pricing-calculator",
      "name": "Pricing Calculator",
      "description": "Vehicle pricing calculator with options",
      "category": "calculator",
      "language": "javascript",
      "isPublic": true,
      "author": {
        "id": "system",
        "name": "System"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Template

Get detailed template information and code.

```http
GET /templates/{templateId}
Authorization: Bearer <token>
```

### Create Template

Create a new template from existing codepage.

```http
POST /templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom Calculator",
  "description": "Custom pricing calculator template",
  "category": "calculator",
  "code": "// Template code here",
  "isPublic": false,
  "configSchema": {
    "type": "object",
    "properties": {
      "currency": { "type": "string", "default": "USD" }
    }
  }
}
```

## 🗄️ Schema Management

### Get Application Schema

Get the complete QuickBase application schema.

```http
GET /schema
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appId": "btr3r3fk5",
    "name": "Dealership Management",
    "tables": [
      {
        "id": "btr3r3fk6",
        "name": "Vehicles",
        "description": "Vehicle inventory",
        "fields": [
          {
            "id": 3,
            "label": "Vehicle Name",
            "fieldType": "text",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### Get Tables

List all tables in the application.

```http
GET /schema/tables
Authorization: Bearer <token>
```

### Create Table

Create a new table in QuickBase.

```http
POST /schema/tables
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Customer Quotes",
  "description": "Store customer pricing quotes",
  "fields": [
    {
      "label": "Customer Name",
      "fieldType": "text",
      "required": true
    },
    {
      "label": "Quote Amount",
      "fieldType": "currency",
      "required": true
    }
  ]
}
```

### Get Table Details

Get detailed information about a specific table.

```http
GET /schema/tables/{tableId}
Authorization: Bearer <token>
```

### Update Table

Update table properties.

```http
PUT /schema/tables/{tableId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Table Name",
  "description": "Updated description"
}
```

### Delete Table

Delete a table from QuickBase.

```http
DELETE /schema/tables/{tableId}
Authorization: Bearer <token>
```

### Get Table Fields

List all fields in a table.

```http
GET /schema/tables/{tableId}/fields
Authorization: Bearer <token>
```

### Create Field

Add a new field to a table.

```http
POST /schema/tables/{tableId}/fields
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Vehicle Year",
  "fieldType": "numeric",
  "required": true,
  "unique": false,
  "defaultValue": 2024
}
```

### Update Field

Update field properties.

```http
PUT /schema/tables/{tableId}/fields/{fieldId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Updated Field Name",
  "required": false
}
```

### Delete Field

Remove a field from a table.

```http
DELETE /schema/tables/{tableId}/fields/{fieldId}
Authorization: Bearer <token>
```

## 🔗 Relationship Management

### Get Relationships

Get all relationships for a table.

```http
GET /schema/tables/{tableId}/relationships
Authorization: Bearer <token>
```

### Create Relationship

Create a relationship between tables.

```http
POST /schema/relationships
Authorization: Bearer <token>
Content-Type: application/json

{
  "parentTableId": "btr3r3fk6",
  "childTableId": "btr3r3fk7",
  "referenceFieldLabel": "Vehicle Reference",
  "lookupFields": [
    {
      "parentFieldId": 3,
      "childFieldLabel": "Vehicle Name"
    }
  ]
}
```

### Validate Relationship

Check relationship integrity.

```http
POST /schema/relationships/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "parentTableId": "btr3r3fk6",
  "childTableId": "btr3r3fk7",
  "foreignKeyFieldId": 15
}
```

## 🚀 Deployment

### Deploy Codepage

Deploy a codepage version to an environment.

```http
POST /deployment/{projectId}/deploy
Authorization: Bearer <token>
Content-Type: application/json

{
  "versionId": "ver_456",
  "environment": "production",
  "notes": "Deploy pricing calculator with new discount logic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deploymentId": "deploy_789",
    "status": "in_progress",
    "environment": "production",
    "versionId": "ver_456",
    "startedAt": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T10:32:00Z"
  }
}
```

### Get Deployment Status

Check the status of a deployment.

```http
GET /deployment/{deploymentId}/status
Authorization: Bearer <token>
```

### List Deployments

Get deployment history for a project.

```http
GET /deployment/{projectId}/history
Authorization: Bearer <token>
```

### Rollback Deployment

Rollback to a previous deployment.

```http
POST /deployment/{deploymentId}/rollback
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Critical bug found in current version"
}
```

## 📊 Analytics

### Get Usage Analytics

Get platform usage statistics.

```http
GET /analytics/usage
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `granularity` (string): hour, day, week, month

### Get Performance Metrics

Get codepage performance metrics.

```http
GET /analytics/performance/{projectId}
Authorization: Bearer <token>
```

### Get System Health

Get system health and performance data.

```http
GET /analytics/health
Authorization: Bearer <token>
```

## 🔍 Monitoring

### Get Audit Logs

Retrieve audit logs for compliance and monitoring.

```http
GET /monitoring/audit-logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (string): Filter by user
- `action` (string): Filter by action type
- `startDate` (string): Start date
- `endDate` (string): End date
- `page` (number): Page number
- `limit` (number): Items per page

### Get Error Logs

Retrieve system error logs.

```http
GET /monitoring/errors
Authorization: Bearer <token>
```

### Create Alert

Set up monitoring alerts.

```http
POST /monitoring/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "High Error Rate",
  "condition": "error_rate > 5%",
  "threshold": 5,
  "interval": "5m",
  "notifications": ["email", "webhook"]
}
```

## 🏥 Health Check

### Basic Health Check

Simple health status endpoint.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### Detailed Health Status

Comprehensive health check with service status.

```http
GET /health/status
```

### Readiness Probe

Check if the service is ready to accept requests.

```http
GET /health/ready
```

### Liveness Probe

Check if the service is alive and responsive.

```http
GET /health/live
```

## 📝 Error Codes

### Authentication Errors

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired JWT token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `ACCOUNT_DISABLED` | 403 | User account is disabled |

### Validation Errors

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |
| `INVALID_FIELD_TYPE` | 400 | Field type is invalid |
| `FIELD_TOO_LONG` | 400 | Field exceeds maximum length |

### Resource Errors

| Code | Status | Description |
|------|--------|-------------|
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RESOURCE_ALREADY_EXISTS` | 409 | Resource already exists |
| `RESOURCE_IN_USE` | 409 | Resource is currently in use |
| `RESOURCE_LOCKED` | 423 | Resource is locked for editing |

### System Errors

| Code | Status | Description |
|------|--------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `QUICKBASE_ERROR` | 502 | QuickBase API error |
| `TIMEOUT_ERROR` | 504 | Request timeout |

## 📚 SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class CodepagePlatformAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL: baseURL + '/api/v1',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async createProject(projectData) {
    const response = await this.client.post('/projects', projectData);
    return response.data;
  }

  async saveCodepage(projectId, code, changelog) {
    const response = await this.client.put(`/codepages/${projectId}`, {
      code,
      changelog
    });
    return response.data;
  }

  async runTest(projectId, testData) {
    const response = await this.client.post(`/tests/${projectId}/execute`, {
      testData
    });
    return response.data;
  }
}

// Usage
const api = new CodepagePlatformAPI('http://localhost:3001', 'your-jwt-token');

// Create project
const project = await api.createProject({
  name: 'My Calculator',
  templateId: 'pricing-calculator'
});

// Save code
await api.saveCodepage(project.data.id, 'function calculate() { ... }', 'Initial version');

// Run test
const testResult = await api.runTest(project.data.id, { vehicleId: '123' });
```

### Python

```python
import requests
import json

class CodepagePlatformAPI:
    def __init__(self, base_url, token):
        self.base_url = f"{base_url}/api/v1"
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_project(self, project_data):
        response = requests.post(
            f"{self.base_url}/projects",
            headers=self.headers,
            json=project_data
        )
        return response.json()
    
    def save_codepage(self, project_id, code, changelog):
        response = requests.put(
            f"{self.base_url}/codepages/{project_id}",
            headers=self.headers,
            json={'code': code, 'changelog': changelog}
        )
        return response.json()

# Usage
api = CodepagePlatformAPI('http://localhost:3001', 'your-jwt-token')

# Create project
project = api.create_project({
    'name': 'My Calculator',
    'templateId': 'pricing-calculator'
})

# Save code
api.save_codepage(
    project['data']['id'], 
    'function calculate() { ... }', 
    'Initial version'
)
```

## 🔄 Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Test execution**: 10 requests per minute per user
- **Schema operations**: 20 requests per minute per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## 📄 Changelog

### Version 1.0.0
- Initial API release
- Authentication and project management
- Codepage CRUD operations
- Testing environment
- Schema management
- Basic analytics

---

For more information, see:
- [Installation Guide](INSTALLATION.md)
- [User Guide](USER_GUIDE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)