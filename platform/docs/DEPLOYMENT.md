# Deployment Guide

This guide covers deploying the QuickBase Codepage Development Platform to production environments.

## 📋 Pre-Deployment Checklist

### System Requirements

- [ ] **Server Specifications**
  - [ ] CPU: 2+ cores (4+ recommended)
  - [ ] RAM: 4GB minimum (8GB+ recommended)
  - [ ] Storage: 20GB+ available space
  - [ ] Network: Stable internet connection

- [ ] **Software Requirements**
  - [ ] Node.js 18+ installed
  - [ ] npm 8+ installed
  - [ ] Redis server (local or cloud)
  - [ ] SSL certificates (for HTTPS)
  - [ ] Domain name configured

- [ ] **Security Requirements**
  - [ ] Firewall configured
  - [ ] SSL/TLS certificates ready
  - [ ] Secure secrets generated
  - [ ] Backup strategy in place

### Environment Preparation

- [ ] **QuickBase Configuration**
  - [ ] Production QuickBase application created
  - [ ] User token with production permissions
  - [ ] Application schema configured
  - [ ] Test data imported (if needed)

- [ ] **Infrastructure Setup**
  - [ ] Production server provisioned
  - [ ] Domain DNS configured
  - [ ] Load balancer configured (if needed)
  - [ ] Monitoring tools installed

## 🚀 Deployment Methods

### Method 1: Docker Deployment (Recommended)

Docker deployment provides consistency, scalability, and easy management.

#### Prerequisites

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deployment Steps

1. **Prepare Environment**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd quickbase-codepage-platform/platform
   
   # Create production environment file
   cp .env.example .env.production
   ```

2. **Configure Production Environment**
   ```bash
   # Edit .env.production
   nano .env.production
   ```
   
   ```env
   # Production Configuration
   NODE_ENV=production
   PORT=3001
   WS_PORT=3002
   
   # Security (Generate secure secrets)
   JWT_SECRET=your-super-secure-jwt-secret-64-characters-minimum-here
   SESSION_SECRET=your-super-secure-session-secret-32-characters-minimum
   BCRYPT_ROUNDS=12
   
   # QuickBase Production
   QB_REALM=yourcompany.quickbase.com
   QB_USER_TOKEN=your_production_token_here
   QB_APP_ID=your_production_app_id
   
   # Redis Production
   REDIS_URL=redis://redis:6379
   
   # CORS for production domain
   CORS_ORIGIN=https://your-domain.com
   
   # Frontend URLs
   VITE_API_BASE_URL=https://your-domain.com/api
   VITE_WS_URL=wss://your-domain.com/ws
   ```

3. **Deploy with Docker Compose**
   ```bash
   # Copy production environment
   cp .env.production .env
   
   # Deploy with production profile
   ./deploy.sh production
   ```

4. **Verify Deployment**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f
   
   # Test health endpoint
   curl https://your-domain.com/api/health
   ```

### Method 2: Manual Deployment

Manual deployment gives you full control over the deployment process.

#### Server Setup

1. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Redis
   sudo apt install redis-server
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Create Application User**
   ```bash
   # Create dedicated user
   sudo useradd -m -s /bin/bash qbplatform
   sudo usermod -aG sudo qbplatform
   
   # Switch to application user
   sudo su - qbplatform
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd quickbase-codepage-platform/platform
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   ```

4. **Configure Environment**
   ```bash
   # Create production environment
   cp .env.example .env
   # Edit with production values
   ```

5. **Start with PM2**
   ```bash
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << 'EOF'
   module.exports = {
     apps: [
       {
         name: 'qb-platform-backend',
         cwd: './backend',
         script: 'dist/index.js',
         instances: 2,
         exec_mode: 'cluster',
         env: {
           NODE_ENV: 'production',
           PORT: 3001
         },
         error_file: '../logs/backend-error.log',
         out_file: '../logs/backend-out.log',
         log_file: '../logs/backend.log'
       }
     ]
   };
   EOF
   
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Method 3: Cloud Platform Deployment

#### AWS Deployment

1. **EC2 Instance Setup**
   ```bash
   # Launch EC2 instance (t3.medium or larger)
   # Configure security groups:
   # - HTTP (80)
   # - HTTPS (443)
   # - SSH (22)
   # - Custom TCP (3001, 3002) for API and WebSocket
   ```

2. **Application Load Balancer**
   ```bash
   # Create ALB with:
   # - Target groups for backend (3001) and frontend (3000)
   # - SSL certificate from ACM
   # - Health checks configured
   ```

3. **RDS for Redis**
   ```bash
   # Use Amazon ElastiCache for Redis
   # Configure VPC security groups
   # Update REDIS_URL in environment
   ```

#### Heroku Deployment

1. **Prepare for Heroku**
   ```bash
   # Install Heroku CLI
   npm install -g heroku
   
   # Login to Heroku
   heroku login
   ```

2. **Create Heroku Apps**
   ```bash
   # Create backend app
   heroku create qb-platform-backend
   
   # Add Redis addon
   heroku addons:create heroku-redis:hobby-dev -a qb-platform-backend
   
   # Set environment variables
   heroku config:set NODE_ENV=production -a qb-platform-backend
   heroku config:set JWT_SECRET=your-secret -a qb-platform-backend
   # ... other environment variables
   ```

3. **Deploy Backend**
   ```bash
   # Create Procfile
   echo "web: node dist/index.js" > backend/Procfile
   
   # Deploy
   cd backend
   git init
   heroku git:remote -a qb-platform-backend
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL Certificate**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Generate certificate
   sudo certbot --nginx -d your-domain.com
   ```

2. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/qb-platform
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       # Backend API
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       # WebSocket
       location /ws/ {
           proxy_pass http://localhost:3002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow internal communication (if needed)
sudo ufw allow from 10.0.0.0/8 to any port 3001
sudo ufw allow from 10.0.0.0/8 to any port 3002
sudo ufw allow from 10.0.0.0/8 to any port 6379
```

### Environment Security

1. **Secure Secrets Generation**
   ```bash
   # Generate JWT secret (64 characters)
   openssl rand -hex 64
   
   # Generate session secret (32 characters)
   openssl rand -hex 32
   
   # Store in secure environment file
   chmod 600 .env
   ```

2. **File Permissions**
   ```bash
   # Set proper file permissions
   chmod 755 /opt/qb-platform
   chmod 644 /opt/qb-platform/.env
   chmod 755 /opt/qb-platform/logs
   
   # Set ownership
   chown -R qbplatform:qbplatform /opt/qb-platform
   ```

## 📊 Monitoring and Logging

### Application Monitoring

1. **Health Check Monitoring**
   ```bash
   # Create health check script
   cat > /opt/qb-platform/scripts/health-check.sh << 'EOF'
   #!/bin/bash
   
   HEALTH_URL="https://your-domain.com/api/health"
   RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
   
   if [ $RESPONSE -eq 200 ]; then
       echo "$(date): Health check passed"
   else
       echo "$(date): Health check failed with status $RESPONSE"
       # Send alert (email, Slack, etc.)
   fi
   EOF
   
   chmod +x /opt/qb-platform/scripts/health-check.sh
   
   # Add to crontab
   echo "*/5 * * * * /opt/qb-platform/scripts/health-check.sh >> /var/log/qb-platform-health.log" | crontab -
   ```

2. **Performance Monitoring**
   ```bash
   # Install monitoring tools
   npm install -g clinic
   
   # Monitor application performance
   clinic doctor -- node dist/index.js
   ```

### Log Management

1. **Configure Log Rotation**
   ```bash
   # Create logrotate configuration
   sudo cat > /etc/logrotate.d/qb-platform << 'EOF'
   /opt/qb-platform/logs/*.log {
       daily
       missingok
       rotate 30
       compress
       delaycompress
       notifempty
       create 644 qbplatform qbplatform
       postrotate
           pm2 reload all
       endscript
   }
   EOF
   ```

2. **Centralized Logging**
   ```bash
   # Install and configure rsyslog for centralized logging
   sudo apt install rsyslog
   
   # Configure to send logs to external service
   # (ELK stack, Splunk, CloudWatch, etc.)
   ```

## 🔄 Backup and Recovery

### Database Backup

1. **QuickBase Backup**
   ```bash
   # Create backup script for QuickBase data
   cat > /opt/qb-platform/scripts/backup-qb.sh << 'EOF'
   #!/bin/bash
   
   BACKUP_DIR="/opt/qb-platform/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Export application schema
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/apps/$QB_APP_ID" \
        > "$BACKUP_DIR/schema_$DATE.json"
   
   # Export codepage data
   curl -H "QB-Realm-Hostname: $QB_REALM" \
        -H "Authorization: QB-USER-TOKEN $QB_USER_TOKEN" \
        "https://api.quickbase.com/v1/records?tableId=$CODEPAGE_TABLE_ID" \
        > "$BACKUP_DIR/codepages_$DATE.json"
   
   # Compress backups older than 7 days
   find $BACKUP_DIR -name "*.json" -mtime +7 -exec gzip {} \;
   
   # Remove backups older than 30 days
   find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
   EOF
   
   chmod +x /opt/qb-platform/scripts/backup-qb.sh
   
   # Schedule daily backups
   echo "0 2 * * * /opt/qb-platform/scripts/backup-qb.sh" | crontab -
   ```

2. **Application Backup**
   ```bash
   # Backup application files and configuration
   cat > /opt/qb-platform/scripts/backup-app.sh << 'EOF'
   #!/bin/bash
   
   BACKUP_DIR="/opt/qb-platform/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   APP_DIR="/opt/qb-platform"
   
   # Create application backup
   tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
       --exclude="node_modules" \
       --exclude="logs" \
       --exclude="backups" \
       "$APP_DIR"
   
   # Remove old backups
   find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete
   EOF
   
   chmod +x /opt/qb-platform/scripts/backup-app.sh
   ```

### Disaster Recovery

1. **Recovery Procedures**
   ```bash
   # Create recovery documentation
   cat > /opt/qb-platform/RECOVERY.md << 'EOF'
   # Disaster Recovery Procedures
   
   ## Application Recovery
   1. Restore from latest backup
   2. Reinstall dependencies: npm install
   3. Rebuild application: npm run build
   4. Restore environment configuration
   5. Start services: pm2 start ecosystem.config.js
   
   ## Database Recovery
   1. Restore QuickBase application from backup
   2. Import schema and data
   3. Update application configuration
   4. Test connectivity
   
   ## Rollback Procedures
   1. Stop current services: pm2 stop all
   2. Restore previous version
   3. Start services: pm2 start ecosystem.config.js
   4. Verify functionality
   EOF
   ```

## 🔧 Maintenance

### Regular Maintenance Tasks

1. **System Updates**
   ```bash
   # Create update script
   cat > /opt/qb-platform/scripts/update-system.sh << 'EOF'
   #!/bin/bash
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Node.js packages
   cd /opt/qb-platform
   npm audit fix
   npm update
   
   # Rebuild application
   npm run build
   
   # Restart services
   pm2 restart all
   
   # Clean up old logs
   find /opt/qb-platform/logs -name "*.log" -mtime +30 -delete
   EOF
   
   chmod +x /opt/qb-platform/scripts/update-system.sh
   ```

2. **Performance Optimization**
   ```bash
   # Monitor and optimize performance
   # - Review application metrics
   # - Optimize database queries
   # - Update caching strategies
   # - Scale resources as needed
   ```

### Scaling Considerations

1. **Horizontal Scaling**
   ```bash
   # Load balancer configuration
   # Multiple application instances
   # Shared Redis instance
   # Database connection pooling
   ```

2. **Vertical Scaling**
   ```bash
   # Increase server resources
   # Optimize application performance
   # Tune database configuration
   ```

## 📈 Post-Deployment Verification

### Functional Testing

1. **API Endpoints**
   ```bash
   # Test authentication
   curl -X POST https://your-domain.com/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"password"}'
   
   # Test health check
   curl https://your-domain.com/api/health
   
   # Test QuickBase connectivity
   curl https://your-domain.com/api/health/status
   ```

2. **Frontend Functionality**
   ```bash
   # Test frontend accessibility
   curl -I https://your-domain.com
   
   # Test static assets
   curl -I https://your-domain.com/assets/index.js
   ```

### Performance Testing

1. **Load Testing**
   ```bash
   # Install artillery for load testing
   npm install -g artillery
   
   # Create load test configuration
   cat > load-test.yml << 'EOF'
   config:
     target: 'https://your-domain.com'
     phases:
       - duration: 60
         arrivalRate: 10
   scenarios:
     - name: "Health check"
       requests:
         - get:
             url: "/api/health"
   EOF
   
   # Run load test
   artillery run load-test.yml
   ```

2. **Performance Monitoring**
   ```bash
   # Monitor response times
   # Check resource utilization
   # Verify scaling behavior
   ```

## 🚨 Troubleshooting Deployment Issues

### Common Deployment Problems

1. **Port Binding Issues**
   ```bash
   # Check port availability
   netstat -tulpn | grep :3001
   
   # Kill conflicting processes
   sudo kill $(sudo lsof -ti:3001)
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R qbplatform:qbplatform /opt/qb-platform
   sudo chmod -R 755 /opt/qb-platform
   ```

3. **Environment Configuration**
   ```bash
   # Verify environment variables
   pm2 env 0  # Show environment for process 0
   
   # Check configuration loading
   node -e "console.log(process.env.NODE_ENV)"
   ```

### Rollback Procedures

1. **Quick Rollback**
   ```bash
   # Stop current version
   pm2 stop all
   
   # Restore previous version
   git checkout previous-tag
   npm install
   npm run build
   
   # Start services
   pm2 start ecosystem.config.js
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup if schema changes were made
   # Follow recovery procedures
   ```

---

For additional help with deployment issues, see:
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Installation Guide](INSTALLATION.md)
- [User Guide](USER_GUIDE.md)