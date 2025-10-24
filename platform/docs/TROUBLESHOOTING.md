# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the QuickBase Codepage Development Platform.

## 🚨 Quick Diagnostics

### Health Check

First, check the system health to identify any obvious issues:

```bash
# Check backend health
curl -s http://localhost:3001/api/health | jq

# Check detailed status
curl -s http://localhost:3001/api/health/status | jq

# Check if frontend is accessible
curl -s http://localhost:3000 | grep -q "QuickBase Codepage Platform"
```

### System Status

Check if all services are running:

```bash
# Check processes
ps aux | grep -E "(node|npm)"

# Check ports
netstat -an | grep -E "(3000|3001|3002|6379)"

# Check Docker containers (if using Docker)
docker-compose ps
```

## 🔧 Installation Issues

### Node.js Version Problems

**Problem**: "Node.js version not supported" or compatibility errors

**Symptoms**:
- Installation fails with version warnings
- Runtime errors about unsupported features
- Package installation failures

**Solutions**:

1. **Check Node.js version**
   ```bash
   node --version
   # Should be 18.0.0 or higher
   ```

2. **Install correct Node.js version**
   ```bash
   # Using Node Version Manager (nvm)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Or download from nodejs.org
   ```

3. **Clear npm cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

### Permission Issues

**Problem**: "Permission denied" during installation or startup

**Symptoms**:
- Cannot install packages globally
- Cannot write to directories
- Cannot bind to ports

**Solutions**:

1. **Fix npm permissions (Linux/macOS)**
   ```bash
   sudo chown -R $(whoami) ~/.npm
   sudo chown -R $(whoami) /usr/local/lib/node_modules
   ```

2. **Use npx instead of global installs**
   ```bash
   npx create-react-app my-app
   # Instead of: npm install -g create-react-app
   ```

3. **Run with appropriate permissions**
   ```bash
   # For port binding issues (use ports > 1024)
   PORT=3001 npm start
   
   # Or use sudo (not recommended for development)
   sudo npm start
   ```

### Dependency Installation Failures

**Problem**: npm install fails with errors

**Symptoms**:
- Network timeout errors
- Package not found errors
- Compilation failures

**Solutions**:

1. **Clear npm cache and retry**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Use different npm registry**
   ```bash
   npm install --registry https://registry.npmjs.org/
   ```

3. **Install with legacy peer deps**
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Check network connectivity**
   ```bash
   ping registry.npmjs.org
   curl -I https://registry.npmjs.org/
   ```

## 🌐 Connection Issues

### QuickBase Connection Problems

**Problem**: Cannot connect to QuickBase API

**Symptoms**:
- "QuickBase connection failed" in health check
- Authentication errors
- API timeout errors

**Diagnostic Steps**:

1. **Verify environment variables**
   ```bash
   echo "Realm: $QB_REALM"
   echo "App ID: $QB_APP_ID"
   echo "Token: ${QB_USER_TOKEN:0:10}..." # Show first 10 chars only
   ```

2. **Test QuickBase connectivity**
   ```bash
   # Test basic connectivity
   curl -I "https://$QB_REALM"
   
   # Test API with your token
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/apps"
   ```

3. **Validate token permissions**
   ```bash
   # Test specific app access
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/apps/$QB_APP_ID"
   ```

**Common Solutions**:

1. **Invalid or expired token**
   - Generate new user token in QuickBase
   - Update QB_USER_TOKEN in .env
   - Restart the application

2. **Incorrect realm**
   - Verify QB_REALM matches your QuickBase URL
   - Don't include https:// prefix
   - Example: `company.quickbase.com`

3. **Wrong application ID**
   - Check QB_APP_ID in QuickBase URL
   - Format: `btr3r3fk5` (after /db/ in URL)

4. **Insufficient permissions**
   - Ensure token has required permissions:
     - Read/Write Records
     - Create/Modify Tables
     - Create/Modify Fields
     - Manage Application Schema

### Redis Connection Issues

**Problem**: Redis connection failed

**Symptoms**:
- "Redis connection failed" in health check
- Session management not working
- Caching errors

**Diagnostic Steps**:

1. **Check Redis server status**
   ```bash
   # Test Redis connection
   redis-cli ping
   # Should return "PONG"
   
   # Check Redis process
   ps aux | grep redis-server
   
   # Check Redis port
   netstat -an | grep 6379
   ```

2. **Test Redis connectivity**
   ```bash
   # Connect to Redis CLI
   redis-cli
   > ping
   > set test "hello"
   > get test
   > exit
   ```

**Solutions**:

1. **Start Redis server**
   ```bash
   # Linux/macOS
   redis-server
   
   # macOS with Homebrew
   brew services start redis
   
   # Linux with systemd
   sudo systemctl start redis-server
   
   # Windows (if installed)
   net start redis
   ```

2. **Install Redis**
   ```bash
   # macOS
   brew install redis
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install redis-server
   
   # CentOS/RHEL
   sudo yum install redis
   ```

3. **Configure Redis URL**
   ```bash
   # Check REDIS_URL in .env
   echo "REDIS_URL=$REDIS_URL"
   
   # Default should be:
   REDIS_URL=redis://localhost:6379
   ```

### Network and Firewall Issues

**Problem**: Cannot access services on expected ports

**Symptoms**:
- Connection refused errors
- Timeout errors
- Services not accessible from browser

**Diagnostic Steps**:

1. **Check port availability**
   ```bash
   # Check if ports are in use
   lsof -i :3000  # Frontend
   lsof -i :3001  # Backend
   lsof -i :3002  # WebSocket
   lsof -i :6379  # Redis
   ```

2. **Test port connectivity**
   ```bash
   # Test local connectivity
   telnet localhost 3001
   nc -zv localhost 3001
   
   # Test from another machine
   telnet your-server-ip 3001
   ```

**Solutions**:

1. **Kill processes using ports**
   ```bash
   # Kill process on specific port
   kill $(lsof -ti:3001)
   
   # Or find and kill manually
   lsof -i :3001
   kill -9 <PID>
   ```

2. **Use different ports**
   ```bash
   # Change ports in .env
   PORT=3003
   WS_PORT=3004
   
   # Update CORS_ORIGIN if needed
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Configure firewall**
   ```bash
   # Linux (ufw)
   sudo ufw allow 3001
   sudo ufw allow 3002
   
   # Linux (iptables)
   sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
   
   # macOS
   # Use System Preferences > Security & Privacy > Firewall
   ```

## 🔐 Authentication Issues

### JWT Token Problems

**Problem**: Authentication failures or token errors

**Symptoms**:
- "Invalid token" errors
- Automatic logout
- 401 Unauthorized responses

**Diagnostic Steps**:

1. **Check JWT configuration**
   ```bash
   echo "JWT Secret length: ${#JWT_SECRET}"
   # Should be at least 32 characters
   ```

2. **Verify token in browser**
   ```javascript
   // In browser console
   localStorage.getItem('auth_token')
   
   // Decode JWT (without verification)
   const token = localStorage.getItem('auth_token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log(payload);
   ```

**Solutions**:

1. **Generate new JWT secret**
   ```bash
   # Generate secure secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Update .env
   JWT_SECRET=your-new-secret-here
   
   # Restart application
   ```

2. **Clear browser storage**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   
   // Then refresh page and login again
   ```

3. **Check token expiration**
   ```bash
   # Adjust token expiration in .env
   JWT_EXPIRES_IN=24h  # or 7d, 30d, etc.
   ```

### Session Management Issues

**Problem**: Users getting logged out unexpectedly

**Symptoms**:
- Frequent re-login prompts
- Session not persisting
- "Session expired" messages

**Solutions**:

1. **Check session configuration**
   ```bash
   # Verify session secret
   echo "Session secret length: ${#SESSION_SECRET}"
   
   # Should be at least 32 characters
   SESSION_SECRET=your-session-secret-here
   ```

2. **Configure session persistence**
   ```javascript
   // Check browser settings
   // Ensure cookies are enabled
   // Check for third-party cookie blocking
   ```

3. **Adjust session timeout**
   ```bash
   # In .env, adjust JWT expiration
   JWT_EXPIRES_IN=7d  # Longer expiration
   ```

## 💻 Application Runtime Issues

### Frontend Build Errors

**Problem**: Frontend fails to build or start

**Symptoms**:
- Compilation errors
- Module not found errors
- Build process hangs

**Diagnostic Steps**:

1. **Check build logs**
   ```bash
   cd platform/frontend
   npm run build
   # Look for specific error messages
   ```

2. **Verify dependencies**
   ```bash
   npm list --depth=0
   npm audit
   ```

**Solutions**:

1. **Clear build cache**
   ```bash
   cd platform/frontend
   rm -rf node_modules dist .vite
   npm install
   npm run build
   ```

2. **Fix dependency conflicts**
   ```bash
   npm install --legacy-peer-deps
   # or
   npm install --force
   ```

3. **Update dependencies**
   ```bash
   npm update
   npm audit fix
   ```

### Backend Server Errors

**Problem**: Backend server crashes or fails to start

**Symptoms**:
- Server startup errors
- Unexpected shutdowns
- API endpoints not responding

**Diagnostic Steps**:

1. **Check server logs**
   ```bash
   cd platform/backend
   npm start
   # Look for error messages and stack traces
   ```

2. **Verify TypeScript compilation**
   ```bash
   npm run build
   # Check for TypeScript errors
   ```

**Solutions**:

1. **Fix TypeScript errors**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   
   # Fix any type errors in code
   ```

2. **Check environment variables**
   ```bash
   # Verify all required variables are set
   node -e "
   const required = ['QB_REALM', 'QB_USER_TOKEN', 'QB_APP_ID', 'JWT_SECRET'];
   required.forEach(key => {
     if (!process.env[key]) console.log('Missing:', key);
   });
   "
   ```

3. **Restart with debug logging**
   ```bash
   LOG_LEVEL=debug npm start
   ```

### Memory and Performance Issues

**Problem**: High memory usage or slow performance

**Symptoms**:
- Application becomes unresponsive
- High CPU or memory usage
- Slow API responses

**Diagnostic Steps**:

1. **Monitor resource usage**
   ```bash
   # Check memory usage
   ps aux | grep node
   
   # Monitor in real-time
   top -p $(pgrep node)
   
   # Check disk space
   df -h
   ```

2. **Profile application**
   ```bash
   # Start with Node.js profiling
   node --inspect dist/index.js
   
   # Use Chrome DevTools for profiling
   # Navigate to chrome://inspect
   ```

**Solutions**:

1. **Increase memory limits**
   ```bash
   # Set Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

2. **Optimize code**
   - Review codepage execution for infinite loops
   - Check for memory leaks in long-running processes
   - Optimize database queries

3. **Configure resource limits**
   ```bash
   # In .env, adjust timeouts
   REQUEST_TIMEOUT=60000
   QB_DEFAULT_TIMEOUT=30000
   ```

## 🧪 Testing Issues

### Test Execution Failures

**Problem**: Codepage tests fail to execute or return errors

**Symptoms**:
- Test timeout errors
- Sandbox execution failures
- Incorrect test results

**Diagnostic Steps**:

1. **Check test configuration**
   ```javascript
   // Verify test data format
   const testData = {
     vehicleId: "test_123",
     customerId: "test_456"
   };
   
   // Check mock data structure
   const mockData = {
     vehicles: [{
       id: "test_123",
       fields: { 3: { value: "Test Vehicle" } }
     }]
   };
   ```

2. **Review codepage code**
   ```javascript
   // Check for common issues:
   // - Async/await usage
   // - Error handling
   // - API call syntax
   ```

**Solutions**:

1. **Fix async/await issues**
   ```javascript
   // Correct usage
   async function myFunction() {
     try {
       const result = await QB.getRecord('table', 'id');
       return result;
     } catch (error) {
       console.error('Error:', error);
       throw error;
     }
   }
   ```

2. **Validate test data**
   ```javascript
   // Ensure test data matches expected format
   // Check field IDs and data types
   // Verify mock data completeness
   ```

3. **Increase test timeouts**
   ```bash
   # In test configuration
   timeout: 60000  # 60 seconds
   ```

### Mock Data Issues

**Problem**: Mock data not working correctly in tests

**Symptoms**:
- API calls return empty results
- Unexpected data in test responses
- Mock data not matching real data structure

**Solutions**:

1. **Verify mock data structure**
   ```javascript
   // Correct mock data format
   const mockData = {
     tableName: [
       {
         id: "record_id",
         fields: {
           3: { value: "Field 3 value" },
           6: { value: "Field 6 value" }
         }
       }
     ]
   };
   ```

2. **Match field IDs**
   ```bash
   # Get actual field IDs from QuickBase
   curl -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/fields?tableId=$TABLE_ID"
   ```

3. **Test with real data first**
   ```javascript
   // Use actual QuickBase data for initial testing
   // Then create matching mock data
   ```

## 🗄️ Schema Management Issues

### Schema Modification Failures

**Problem**: Cannot create or modify tables/fields

**Symptoms**:
- Permission denied errors
- Schema validation failures
- Changes not reflected in QuickBase

**Diagnostic Steps**:

1. **Check user permissions**
   ```bash
   # Verify token has schema management permissions
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/apps/$QB_APP_ID/tables"
   ```

2. **Validate schema changes**
   ```javascript
   // Check field definitions
   const fieldDef = {
     label: "Test Field",
     fieldType: "text",  // Valid field type
     required: false
   };
   ```

**Solutions**:

1. **Update token permissions**
   - Go to QuickBase user preferences
   - Regenerate token with schema permissions
   - Update QB_USER_TOKEN in .env

2. **Validate field types**
   ```javascript
   // Valid QuickBase field types
   const validTypes = [
     'text', 'text_choice', 'text_multiline',
     'numeric', 'currency', 'percent',
     'date', 'datetime', 'checkbox',
     'email', 'phone', 'url'
   ];
   ```

3. **Check application limits**
   - Verify QuickBase plan limits
   - Check table and field quotas
   - Review application permissions

## 🚀 Deployment Issues

### Deployment Failures

**Problem**: Codepage deployment fails

**Symptoms**:
- Deployment stuck in progress
- Deployment marked as failed
- Codepage not accessible after deployment

**Diagnostic Steps**:

1. **Check deployment logs**
   ```bash
   # View deployment status
   curl -H "Authorization: Bearer $TOKEN" \
        "http://localhost:3001/api/v1/deployment/$DEPLOYMENT_ID/status"
   ```

2. **Verify codepage syntax**
   ```javascript
   // Check for syntax errors
   // Validate async/await usage
   // Ensure proper error handling
   ```

**Solutions**:

1. **Fix codepage errors**
   ```javascript
   // Ensure proper function structure
   async function main() {
     try {
       // Your code here
       return { success: true, data: result };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }
   
   return main;
   ```

2. **Test before deployment**
   ```bash
   # Always run tests before deploying
   # Ensure all tests pass
   # Check performance metrics
   ```

3. **Rollback if needed**
   ```bash
   # Use rollback functionality
   curl -X POST -H "Authorization: Bearer $TOKEN" \
        "http://localhost:3001/api/v1/deployment/$DEPLOYMENT_ID/rollback"
   ```

## 🐳 Docker Issues

### Container Startup Problems

**Problem**: Docker containers fail to start

**Symptoms**:
- Container exits immediately
- Port binding errors
- Volume mount issues

**Diagnostic Steps**:

1. **Check container logs**
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs redis
   ```

2. **Verify Docker configuration**
   ```bash
   docker-compose config
   docker-compose ps
   ```

**Solutions**:

1. **Fix environment variables**
   ```bash
   # Ensure .env file exists and is properly formatted
   cp .env.example .env
   # Edit .env with correct values
   ```

2. **Resolve port conflicts**
   ```bash
   # Check for port conflicts
   netstat -an | grep -E "(3000|3001|3002|6379)"
   
   # Kill conflicting processes
   kill $(lsof -ti:3001)
   ```

3. **Fix volume permissions**
   ```bash
   # Ensure proper permissions for mounted volumes
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

### Docker Build Failures

**Problem**: Docker image build fails

**Symptoms**:
- Build process errors
- Dependency installation failures
- File copy errors

**Solutions**:

1. **Clear Docker cache**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

2. **Fix Dockerfile issues**
   ```dockerfile
   # Ensure proper base image
   FROM node:18-alpine
   
   # Copy package files first
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Then copy source code
   COPY . .
   ```

3. **Check .dockerignore**
   ```bash
   # Ensure .dockerignore excludes unnecessary files
   echo "node_modules" >> .dockerignore
   echo ".env" >> .dockerignore
   echo "*.log" >> .dockerignore
   ```

## 📞 Getting Additional Help

### Collecting Diagnostic Information

When reporting issues, include:

1. **System Information**
   ```bash
   # Operating system
   uname -a
   
   # Node.js version
   node --version
   npm --version
   
   # Platform version
   cat package.json | grep version
   ```

2. **Configuration**
   ```bash
   # Environment variables (sanitized)
   env | grep -E "(NODE_ENV|PORT|QB_REALM)" | sed 's/=.*/=***/'
   ```

3. **Health Check Results**
   ```bash
   curl -s http://localhost:3001/api/health/status | jq
   ```

4. **Error Logs**
   ```bash
   # Recent application logs
   tail -n 100 /path/to/logfile
   
   # Docker logs
   docker-compose logs --tail=100
   ```

### Creating Support Tickets

Include in your support request:

1. **Problem Description**
   - What you were trying to do
   - What happened instead
   - Error messages (exact text)

2. **Steps to Reproduce**
   - Detailed steps to recreate the issue
   - Expected vs actual behavior

3. **Environment Details**
   - Operating system and version
   - Node.js version
   - Platform version
   - Deployment method (Docker, manual, etc.)

4. **Diagnostic Information**
   - Health check results
   - Relevant log excerpts
   - Configuration details (sanitized)

### Self-Help Resources

1. **Documentation**
   - [Installation Guide](INSTALLATION.md)
   - [User Guide](USER_GUIDE.md)
   - [API Documentation](API.md)

2. **Health Monitoring**
   ```bash
   # Regular health checks
   curl http://localhost:3001/api/health
   
   # Detailed system status
   curl http://localhost:3001/api/health/status
   ```

3. **Log Analysis**
   ```bash
   # Monitor logs in real-time
   tail -f /path/to/logfile
   
   # Search for specific errors
   grep -i error /path/to/logfile
   ```

---

Remember: Most issues can be resolved by checking the health status, reviewing logs, and verifying configuration. When in doubt, restart the services and check if the issue persists.