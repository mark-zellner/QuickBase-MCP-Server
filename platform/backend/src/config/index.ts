import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3001'),
  WS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3002'),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  
  // QuickBase Configuration
  QB_REALM: z.string().min(1, 'QuickBase realm is required'),
  QB_USER_TOKEN: z.string().min(1, 'QuickBase user token is required'),
  QB_APP_ID: z.string().min(1, 'QuickBase app ID is required'),
  QB_DEFAULT_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  QB_MAX_RETRIES: z.string().transform(Number).pipe(z.number().min(0).max(10)).default('3'),
  
  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
  
  // Performance Configuration
  REQUEST_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  
  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

const env = parseResult.data;

// Application configuration
export const config = {
  // Server Configuration
  server: {
    port: env.PORT,
    wsPort: env.WS_PORT,
    environment: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    requestTimeout: env.REQUEST_TIMEOUT,
    maxRequestSize: env.MAX_REQUEST_SIZE,
  },
  
  // Security Configuration
  security: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    sessionSecret: env.SESSION_SECRET,
    bcryptRounds: env.BCRYPT_ROUNDS,
    corsOrigin: env.CORS_ORIGIN,
  },
  
  // QuickBase Configuration
  quickbase: {
    realm: env.QB_REALM,
    userToken: env.QB_USER_TOKEN,
    appId: env.QB_APP_ID,
    defaultTimeout: env.QB_DEFAULT_TIMEOUT,
    maxRetries: env.QB_MAX_RETRIES,
  },
  
  // Redis Configuration
  redis: {
    url: env.REDIS_URL,
  },
  
  // Logging Configuration
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
  
  // Health Check Configuration
  health: {
    checkInterval: env.HEALTH_CHECK_INTERVAL,
  },
  
  // Feature Flags
  features: {
    enableAnalytics: env.NODE_ENV === 'production',
    enableMonitoring: true,
    enableDebug: env.NODE_ENV === 'development',
  },
} as const;

// Export individual configurations for convenience
export const {
  server: serverConfig,
  security: securityConfig,
  quickbase: quickbaseConfig,
  redis: redisConfig,
  logging: loggingConfig,
  health: healthConfig,
  features: featureConfig,
} = config;

// Configuration validation function
export function validateConfig(): boolean {
  try {
    // Additional runtime validations
    if (config.server.isProduction) {
      // Production-specific validations
      if (config.security.jwtSecret.length < 64) {
        console.warn('⚠️  JWT secret should be at least 64 characters in production');
      }
      
      if (config.security.corsOrigin === 'http://localhost:3000') {
        console.warn('⚠️  CORS origin should be configured for production');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    return false;
  }
}

// Print configuration summary (excluding sensitive data)
export function printConfigSummary(): void {
  console.log('📋 Configuration Summary:');
  console.log(`  Environment: ${config.server.environment}`);
  console.log(`  Server Port: ${config.server.port}`);
  console.log(`  WebSocket Port: ${config.server.wsPort}`);
  console.log(`  QuickBase Realm: ${config.quickbase.realm}`);
  console.log(`  Redis URL: ${config.redis.url.replace(/\/\/.*@/, '//***@')}`);
  console.log(`  CORS Origin: ${config.security.corsOrigin}`);
  console.log(`  Log Level: ${config.logging.level}`);
  
  if (config.server.isDevelopment) {
    console.log('🔧 Development mode features enabled');
  }
  
  if (config.server.isProduction) {
    console.log('🏭 Production mode optimizations enabled');
  }
}