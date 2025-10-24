// Re-export shared types for frontend use
// This provides a clean interface to shared types while maintaining compatibility

export type {
  TestStatus,
  TestError,
  PerformanceMetrics,
  TestCoverage,
  TestResult,
  TestConfig,
  ExecuteTestInput,
} from '../../../shared/src/types/test';

export type {
  ProjectStatus,
  CodepageProject,
  CreateProjectInput,
  UpdateProjectInput,
} from '../../../shared/src/types/project';

export type {
  User,
  UserRole,
} from '../../../shared/src/types/user';

export type {
  ApiResponse,
  ApiError,
} from '../../../shared/src/types/api';