# QuickBase Codepage Development Platform

A comprehensive web-based development environment for creating, testing, and deploying QuickBase codepages with minimal technical expertise. Built specifically for car dealership staff to develop interactive business applications like pricing calculators.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm 8+** - Comes with Node.js
- **QuickBase Account** - With user token and application access
- **Redis** (for production) - [Download from redis.io](https://redis.io/)

### Installation

1. **Clone or download the platform**
   ```bash
   git clone <repository-url>
   cd quickbase-codepage-platform/platform
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your QuickBase credentials and configuration
   ```

3. **Start the platform**
   ```bash
   ./start.sh
   ```

The platform will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## 📋 Table of Contents

- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [User Guides](#user-guides)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## 📦 Installation Guide

### Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   npm run build:shared
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # QuickBase Configuration
   QB_REALM=yourcompany.quickbase.com
   QB_USER_TOKEN=your_user_token_here
   QB_APP_ID=your_app_id_here
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
   SESSION_SECRET=your-session-secret-key-here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Production Setup

#### Option 1: Docker Deployment (Recommended)

1. **Install Docker and Docker Compose**
   - [Docker Installation Guide](https://docs.docker.com/get-docker/)

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Deploy with Docker**
   ```bash
   ./deploy.sh production
   ```

#### Option 2: Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Services**
   ```bash
   NODE_ENV=production ./start.sh production
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `QB_REALM` | ✅ | - | Your QuickBase realm (e.g., company.quickbase.com) |
| `QB_USER_TOKEN` | ✅ | - | QuickBase user token from user preferences |
| `QB_APP_ID` | ✅ | - | QuickBase application ID for codepage storage |
| `JWT_SECRET` | ✅ | - | JWT signing secret (min 32 characters) |
| `SESSION_SECRET` | ✅ | - | Session encryption secret |
| `PORT` | ❌ | 3001 | Backend server port |
| `WS_PORT` | ❌ | 3002 | WebSocket server port |
| `CORS_ORIGIN` | ❌ | http://localhost:3000 | Frontend URL for CORS |
| `REDIS_URL` | ❌ | redis://localhost:6379 | Redis connection URL |

### QuickBase Setup

1. **Generate User Token**
   - Log into QuickBase
   - Go to User Preferences → My Preferences
   - Click "Manage User Tokens"
   - Create new token with appropriate permissions

2. **Create Application**
   - Create a new QuickBase application for codepage storage
   - Note the Application ID from the URL

3. **Configure Permissions**
   - Ensure your user token has access to:
     - Create/modify tables and fields
     - Read/write records
     - Manage application schema

## 👥 User Guides

### For Dealership Developers

#### Creating Your First Codepage

1. **Login to Platform**
   - Navigate to http://localhost:3000
   - Login with your credentials

2. **Create New Project**
   - Click "New Project" on the dashboard
   - Choose "Pricing Calculator" template
   - Enter project name and description

3. **Edit Codepage**
   - Use the Monaco editor with syntax highlighting
   - Access QuickBase API through the `QB` global object
   - Use autocomplete for QuickBase methods

4. **Test Your Code**
   - Click "Run Test" to execute in sandbox
   - Review test results and performance metrics
   - Fix any errors before deployment

5. **Deploy Codepage**
   - Click "Deploy" when testing passes
   - Choose target environment
   - Monitor deployment status

#### Using Templates

**Pricing Calculator Template**
```javascript
// Example: Vehicle pricing calculator
const vehicle = await QB.getRecord('vehicles', vehicleId);
const basePrice = vehicle.basePrice;
const options = await QB.getRecords('options', {
  where: `{vehicleId.EX.${vehicleId}}`
});

let totalPrice = basePrice;
options.forEach(option => {
  if (option.selected) {
    totalPrice += option.price;
  }
});

// Apply discounts
const discount = calculateDiscount(customer, vehicle);
const finalPrice = totalPrice - discount;

return { finalPrice, breakdown: options };
```

### For Dealership Managers

#### Managing Schema

1. **Access Schema Manager**
   - Navigate to Schema tab (admin/manager role required)
   - View current application structure

2. **Create Tables**
   - Click "Add Table"
   - Define fields and relationships
   - Set permissions and validation rules

3. **Modify Relationships**
   - Use relationship manager
   - Create lookup fields automatically
   - Validate data integrity

#### Monitoring Performance

1. **View Analytics Dashboard**
   - Monitor codepage usage patterns
   - Track performance metrics
   - Identify optimization opportunities

2. **Review Audit Logs**
   - Track all schema changes
   - Monitor user activities
   - Investigate issues

### For Platform Administrators

#### User Management

1. **Create User Accounts**
   - Use authentication API
   - Assign appropriate roles
   - Configure permissions

2. **Monitor System Health**
   - Check health dashboard
   - Review error logs
   - Monitor resource usage

#### Backup and Recovery

1. **Backup Codepages**
   - Export project configurations
   - Save version history
   - Document deployment states

2. **Disaster Recovery**
   - Restore from backups
   - Rollback deployments
   - Recover user data

## 📚 API Documentation

### Authentication

**Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "developer"
    }
  }
}
```

### Projects

**Create Project**
```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Pricing Calculator",
  "description": "Vehicle pricing calculator for dealership",
  "templateId": "pricing-calculator"
}
```

**Get Projects**
```http
GET /api/v1/projects
Authorization: Bearer <token>
```

### Codepages

**Save Codepage**
```http
PUT /api/v1/codepages/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "// JavaScript code here",
  "changelog": "Added discount calculation"
}
```

**Test Codepage**
```http
POST /api/v1/tests/:projectId/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "testData": {
    "vehicleId": "123",
    "customerId": "456"
  }
}
```

### Schema Management

**Get Tables**
```http
GET /api/v1/schema/tables
Authorization: Bearer <token>
```

**Create Field**
```http
POST /api/v1/schema/tables/:tableId/fields
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Vehicle Price",
  "fieldType": "currency",
  "required": true
}
```

## 🚀 Deployment

### Production Deployment Checklist

- [ ] **Environment Configuration**
  - [ ] Set production environment variables
  - [ ] Configure secure JWT secrets
  - [ ] Set up Redis instance
  - [ ] Configure CORS for production domain

- [ ] **Security Setup**
  - [ ] Enable HTTPS/SSL certificates
  - [ ] Configure firewall rules
  - [ ] Set up rate limiting
  - [ ] Enable security headers

- [ ] **Infrastructure**
  - [ ] Set up load balancer (if needed)
  - [ ] Configure monitoring and alerting
  - [ ] Set up log aggregation
  - [ ] Configure backup systems

- [ ] **Testing**
  - [ ] Run full test suite
  - [ ] Perform security audit
  - [ ] Load testing
  - [ ] User acceptance testing

### Docker Deployment

**docker-compose.yml** is provided for easy deployment:

```bash
# Development
docker-compose up -d

# Production with nginx proxy
docker-compose --profile production up -d
```

### Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Set Environment Variables**
   ```bash
   export NODE_ENV=production
   export PORT=3001
   # ... other variables
   ```

3. **Start Services**
   ```bash
   npm start
   ```

### Nginx Configuration

For production, use nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
    }
}
```

## 🔧 Troubleshooting

### Common Issues

#### "Cannot connect to QuickBase"
- **Cause**: Invalid credentials or network issues
- **Solution**: 
  1. Verify QB_REALM, QB_USER_TOKEN, QB_APP_ID in .env
  2. Check QuickBase user token permissions
  3. Test network connectivity to QuickBase

#### "Redis connection failed"
- **Cause**: Redis server not running or wrong URL
- **Solution**:
  1. Start Redis server: `redis-server`
  2. Verify REDIS_URL in .env
  3. Check Redis server logs

#### "JWT token invalid"
- **Cause**: Invalid or expired JWT secret
- **Solution**:
  1. Generate new JWT_SECRET (32+ characters)
  2. Restart backend server
  3. Clear browser localStorage and login again

#### "Port already in use"
- **Cause**: Another process using the same port
- **Solution**:
  1. Change PORT in .env
  2. Kill existing process: `lsof -ti:3001 | xargs kill`
  3. Restart application

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Health Checks

Monitor system health:
```bash
curl http://localhost:3001/api/health
```

### Log Analysis

View application logs:
```bash
# Development
npm run dev

# Production (if using Docker)
docker-compose logs -f backend
```

## 🛠️ Development

### Project Structure

```
platform/
├── backend/          # Node.js/Express API server
├── frontend/         # React application
├── shared/           # Shared types and utilities
├── docker-compose.yml # Docker deployment
├── deploy.sh         # Deployment script
└── start.sh          # Development startup
```

### Development Workflow

1. **Setup Development Environment**
   ```bash
   npm install
   npm run dev
   ```

2. **Make Changes**
   - Backend: Edit files in `backend/src/`
   - Frontend: Edit files in `frontend/src/`
   - Shared: Edit files in `shared/src/`

3. **Testing**
   ```bash
   npm test
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Health Check**: http://localhost:3001/api/health
- **Logs**: Check console output or log files
- **Issues**: Create GitHub issue with error details

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: 2GB RAM minimum
- **Storage**: 1GB free space
- **Network**: Internet access for QuickBase API

### Performance Optimization

- **Redis**: Use Redis for session storage in production
- **CDN**: Serve static assets from CDN
- **Caching**: Enable HTTP caching headers
- **Monitoring**: Set up performance monitoring

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- QuickBase for providing the platform API
- The open-source community for the excellent tools and libraries
- Car dealership partners for requirements and feedback