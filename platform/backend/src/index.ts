import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config, validateConfig, printConfigSummary } from './config/index.js';

// Import middleware
import { errorHandler, requestId } from './middleware/index.js';
import { createMonitoringMiddleware } from './middleware/monitoring.js';

// Import services
import { AuthService } from './services/auth.js';
import { ProjectService } from './services/project.js';
import { TemplateService } from './services/template.js';
import { CodepageService } from './services/codepage.js';
import { TestEnvironmentService } from './services/test.js';
import { SchemaService } from './services/schema.js';
import { MonitoringService } from './services/monitoring.js';
import { AnalyticsService } from './services/analytics.js';
import { VersionControlService } from './services/version-control.js';
import { DeploymentService } from './services/deployment.js';

// Import routes
import { healthRoutes } from './routes/health.js';
import { createAuthRoutes } from './routes/auth.js';
import { createProjectRoutes } from './routes/projects.js';
import { createTestRoutes } from './routes/test.js';
import { templateRoutes, codepageRoutes, createSchemaRoutes } from './routes/index.js';
import { createMonitoringRoutes } from './routes/monitoring.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createVersionControlRoutes } from './routes/version-control.js';
import { createDeploymentRoutes } from './routes/deployment.js';

// Validate configuration
if (!validateConfig()) {
  console.error('❌ Configuration validation failed');
  process.exit(1);
}

// Print configuration summary
printConfigSummary();

const app = express();
const PORT = config.server.port;
const WS_PORT = config.server.wsPort;

// Initialize services
const monitoringService = new MonitoringService();
const analyticsService = new AnalyticsService();
const authService = new AuthService();
const projectService = new ProjectService();
const templateService = new TemplateService();
const codepageService = new CodepageService();
const testService = new TestEnvironmentService();
const schemaService = new SchemaService();
const versionControlService = new VersionControlService();
const deploymentService = new DeploymentService();

// Initialize monitoring middleware
const monitoringMiddleware = createMonitoringMiddleware(monitoringService);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: config.server.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxRequestSize }));

// Request ID middleware
app.use(requestId);

// Monitoring middleware
app.use(monitoringMiddleware.addMonitoringHeaders());
app.use(monitoringMiddleware.trackAPIMetrics());
app.use(monitoringMiddleware.trackCodepageExecution());

// Import logger
import { logger } from './utils/logger.js';

// Request logging middleware
app.use(logger.requestLogger());

// Health check and status routes
app.use('/api/health', healthRoutes);

// Authentication routes
app.use('/api/v1/auth', createAuthRoutes(authService));

// Project management routes
app.use('/api/v1/projects', createProjectRoutes(projectService, authService));

// Template management routes
app.use('/api/v1/templates', templateRoutes);

// Codepage management routes
app.use('/api/v1/codepages', codepageRoutes);

// Test environment routes
app.use('/api/v1/tests', createTestRoutes(testService, authService));

// Schema management routes
app.use('/api/v1/schema', createSchemaRoutes(schemaService, authService));

// Monitoring and analytics routes
app.use('/api/v1/monitoring', createMonitoringRoutes(monitoringService, authService));
app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsService, authService));

// Version control routes
app.use('/api/v1/version-control', createVersionControlRoutes(versionControlService, authService));

// Deployment routes
app.use('/api/v1/deployment', createDeploymentRoutes(deploymentService, authService));

// User information routes (for enriching change logs)
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  // This would get user information from the database
  // For now, return placeholder data
  res.json({
    success: true,
    data: {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      role: 'developer',
    },
  });
});

// Additional API routes will be added in subsequent tasks
app.use('/api/v1', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    },
  });
});

// Error tracking middleware
app.use(monitoringMiddleware.trackErrors());

// Error handling middleware (must be last)
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for real-time collaboration
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws, req) => {
  console.log(`WebSocket connection established from ${req.socket.remoteAddress}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message received:', message.type);
      
      // Broadcast to all connected clients (basic implementation)
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(data);
        }
      });
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    wss.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    wss.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Backend API server running on port ${PORT}`);
  console.log(`📡 WebSocket server running on port ${WS_PORT}`);
  console.log(`🌍 Environment: ${config.server.environment}`);
  console.log(`🔗 CORS origin: ${config.security.corsOrigin}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export { app, server, wss };