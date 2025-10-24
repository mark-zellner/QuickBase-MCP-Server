// Routes index file
// This will export all route modules as they are implemented

export { healthRoutes } from './health.js';
export { createAuthRoutes } from './auth.js';
export { createProjectRoutes } from './projects.js';
export { createTestRoutes } from './test.js';
export { default as createSchemaRoutes } from './schema.js';
export { createMonitoringRoutes } from './monitoring.js';
export { createAnalyticsRoutes } from './analytics.js';
export { createVersionControlRoutes } from './version-control.js';
export { createDeploymentRoutes } from './deployment.js';

// Template and codepage routes
import templateRoutes from './templates.js';
import codepageRoutes from './codepages.js';

export { templateRoutes, codepageRoutes };