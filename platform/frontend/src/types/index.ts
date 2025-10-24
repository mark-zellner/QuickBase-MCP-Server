// Local type definitions for frontend
// These will be replaced with shared types once the shared package is properly configured

export type UserRole = 'admin' | 'developer' | 'manager' | 'user';

// Re-export pricing types for convenience
export type {
  Vehicle,
  VehicleOption,
  Discount,
  Incentive,
  PricingConfiguration,
  PriceBreakdown,
  FinancingOption,
  Quote,
  VehicleSearchFilters
} from '../../shared/src/types/pricing';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}