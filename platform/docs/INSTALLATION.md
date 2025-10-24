# Installation Guide

This guide provides detailed instructions for installing and configuring the QuickBase Codepage Development Platform.

## 📋 Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB free disk space
- **Network**: Internet connection for QuickBase API access

### Required Accounts and Services

1. **QuickBase Account**
   - Active QuickBase subscription
   - User account with application creation permissions
   - User token generation capability

2. **Redis Server** (Production only)
   - Local Redis installation or cloud Redis service
   - Redis 6.0+ recommended

## 🚀 Quick Installation

### Option 1: Automated Setup (Recommended)

1. **Download the platform**
   ```bash
   git clone <repository-url>
   cd quickbase-codepage-platform/platform
   ```

2. **Run the setup script**
   ```bash
   ./start.sh
   ```
   
   The script will:
   - Check system requirements
   - Install dependencies
   - Guide you through configuration
   - Start the development server

3. **Access the platform**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health Check: http://localhost:3001/api/health

### Option 2: Manual Installation

Follow the detailed steps below for manual installation and configuration.

## 📦 Detailed Installation Steps

### Step 1: Install Node.js

#### Windows
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer (.msi file)
3. Follow the installation wizard
4. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

#### macOS
```bash
# Using Homebrew (recommended)
brew install node

# Or download from nodejs.org
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Download Platform

#### Option A: Git Clone
```bash
git clone <repository-url>
cd quickbase-codepage-platform/platform
```

#### Option B: Download ZIP
1. Download ZIP file from repository
2. Extract to desired location
3. Navigate to platform directory

### Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# Build shared package
npm run build:shared
```

This will install all required dependencies for:
- Backend API server
- Frontend React application
- Shared utilities and types

### Step 4: Configure Environment

1. **Copy environment template**
   ```bash
   cp .env.example .env
   ```

2. **Edit configuration file**
   ```bash
   # Use your preferred editor
   nano .env
   # or
   code .env
   ```

3. **Configure required variables**
   ```env
   # QuickBase Configuration (REQUIRED)
   QB_REALM=yourcompany.quickbase.com
   QB_USER_TOKEN=your_user_token_here
   QB_APP_ID=your_app_id_here
   
   # Security Configuration (REQUIRED)
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
   SESSION_SECRET=your-session-secret-key-here
   
   # Server Configuration (OPTIONAL)
   PORT=3001
   WS_PORT=3002
   CORS_ORIGIN=http://localhost:3000
   
   # Redis Configuration (OPTIONAL for development)
   REDIS_URL=redis://localhost:6379
   ```

### Step 5: QuickBase Setup

#### Generate User Token

1. **Login to QuickBase**
   - Navigate to your QuickBase realm
   - Login with your credentials

2. **Access User Preferences**
   - Click your profile icon (top right)
   - Select "My Preferences"

3. **Manage User Tokens**
   - Click "Manage User Tokens"
   - Click "New User Token"

4. **Configure Token**
   - **Name**: "Codepage Platform"
   - **Description**: "Token for codepage development platform"
   - **Permissions**: Select appropriate permissions:
     - Read/Write Records
     - Create/Modify Tables
     - Create/Modify Fields
     - Manage Application Schema

5. **Copy Token**
   - Copy the generated token
   - Add to `.env` file as `QB_USER_TOKEN`

#### Create Application

1. **Create New Application**
   - Go to QuickBase home
   - Click "Create a new app"
   - Choose "Start from scratch"

2. **Configure Application**
   - **Name**: "Codepage Platform Storage"
   - **Description**: "Storage for codepage projects and templates"

3. **Get Application ID**
   - Note the Application ID from the URL
   - Format: `https://yourcompany.quickbase.com/db/btr3r3fk5`
   - App ID is the part after `/db/`: `btr3r3fk5`
   - Add to `.env` file as `QB_APP_ID`

### Step 6: Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

This will start:
- Backend API server on port 3001
- Frontend development server on port 3000
- WebSocket server on port 3002

### Step 7: Verify Installation

1. **Check Health Status**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Access Frontend**
   - Open browser to http://localhost:3000
   - You should see the login page

3. **Test QuickBase Connection**
   - The health check should show QuickBase as "healthy"
   - If not, verify your QB credentials

## 🐳 Docker Installation

### Prerequisites for Docker

- Docker 20.10+ installed
- Docker Compose 2.0+ installed

### Docker Setup

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start with Docker Compose**
   ```bash
   # Development
   docker-compose up -d
   
   # Production
   docker-compose --profile production up -d
   ```

3. **Check Status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 🔧 Configuration Details

### Environment Variables Reference

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `QB_REALM` | QuickBase realm URL | `company.quickbase.com` |
| `QB_USER_TOKEN` | QuickBase user token | `b7dt4k_xyz123...` |
| `QB_APP_ID` | QuickBase application ID | `btr3r3fk5` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `super-secret-jwt-key-32-chars-min` |
| `SESSION_SECRET` | Session encryption secret | `session-secret-key-here` |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `WS_PORT` | `3002` | WebSocket server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `http://localhost:3000` | Frontend URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `LOG_LEVEL` | `info` | Logging level |

### Security Configuration

#### JWT Secret Generation

Generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64

# Manual (ensure 32+ characters)
echo "your-super-secret-jwt-key-minimum-32-characters-long"
```

#### Session Secret Generation

Generate a secure session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Redis Configuration

#### Local Redis Installation

**Windows**
1. Download Redis from [redis.io](https://redis.io/download)
2. Install and start Redis service
3. Use default URL: `redis://localhost:6379`

**macOS**
```bash
# Using Homebrew
brew install redis
brew services start redis
```

**Linux**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Cloud Redis Services

- **AWS ElastiCache**: Use connection string from AWS console
- **Redis Cloud**: Use connection string from Redis Cloud dashboard
- **Azure Cache for Redis**: Use connection string from Azure portal

## 🧪 Testing Installation

### Automated Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:backend
npm run test:frontend
```

### Manual Verification

1. **Backend Health Check**
   ```bash
   curl -s http://localhost:3001/api/health | jq
   ```

2. **Frontend Accessibility**
   ```bash
   curl -s http://localhost:3000 | grep -q "QuickBase Codepage Platform"
   ```

3. **WebSocket Connection**
   ```bash
   # Test WebSocket (requires wscat)
   npm install -g wscat
   wscat -c ws://localhost:3002
   ```

4. **QuickBase Integration**
   ```bash
   # Test QuickBase API (requires valid token)
   curl -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://$QB_REALM/v1/apps/$QB_APP_ID"
   ```

## 🚨 Troubleshooting Installation

### Common Issues

#### Node.js Version Issues

**Problem**: "Node.js version not supported"
**Solution**:
```bash
# Check current version
node --version

# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
```

#### Permission Issues

**Problem**: "Permission denied" during npm install
**Solution**:
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use npx instead of global installs
npx create-react-app my-app
```

#### Port Conflicts

**Problem**: "Port 3001 already in use"
**Solution**:
```bash
# Find process using port
lsof -ti:3001

# Kill process
kill $(lsof -ti:3001)

# Or change port in .env
echo "PORT=3002" >> .env
```

#### QuickBase Connection Issues

**Problem**: "Cannot connect to QuickBase"
**Solutions**:

1. **Verify Credentials**
   ```bash
   # Test QuickBase connection
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/apps"
   ```

2. **Check Token Permissions**
   - Ensure token has required permissions
   - Verify token hasn't expired
   - Check application access rights

3. **Network Issues**
   - Verify internet connection
   - Check firewall settings
   - Test DNS resolution

#### Redis Connection Issues

**Problem**: "Redis connection failed"
**Solutions**:

1. **Start Redis Server**
   ```bash
   # Linux/macOS
   redis-server
   
   # Windows (if installed as service)
   net start redis
   ```

2. **Test Redis Connection**
   ```bash
   redis-cli ping
   # Should return "PONG"
   ```

3. **Check Redis Configuration**
   ```bash
   # Verify Redis is listening on correct port
   netstat -an | grep 6379
   ```

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**
   ```bash
   # Application logs
   npm run dev
   
   # Docker logs
   docker-compose logs -f
   ```

2. **Verify Configuration**
   ```bash
   # Check environment variables
   cat .env
   
   # Validate configuration
   node -e "console.log(process.env.QB_REALM)"
   ```

3. **Health Check Details**
   ```bash
   curl -s http://localhost:3001/api/health/status | jq
   ```

4. **Create Support Issue**
   - Include error messages
   - Provide system information
   - Share relevant log excerpts
   - Describe steps to reproduce

## ✅ Next Steps

After successful installation:

1. **Create First User Account**
   - Access http://localhost:3000
   - Register admin account
   - Configure user roles

2. **Import Templates**
   - Load pre-built templates
   - Configure dealership-specific settings
   - Test template functionality

3. **Configure Schema**
   - Set up QuickBase tables
   - Define relationships
   - Import sample data

4. **Production Deployment**
   - Follow [Deployment Guide](DEPLOYMENT.md)
   - Configure production environment
   - Set up monitoring and backups

---

For more detailed information, see:
- [User Guide](USER_GUIDE.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)