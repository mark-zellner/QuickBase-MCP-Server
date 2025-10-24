import { z } from 'zod';

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    timestamp: z.string(),
    requestId: z.string(),
  }).optional(),
  meta: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
    hasMore: z.boolean().optional(),
  }).optional(),
});

export type ApiResponse<T = any> = {
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
};

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// Search Schema
export const SearchSchema = z.object({
  query: z.string().optional(),
  filters: z.record(z.any()).optional(),
  ...PaginationSchema.shape,
});

export type SearchInput = z.infer<typeof SearchSchema>;

// WebSocket Message Schema
export const WebSocketMessageSchema = z.object({
  type: z.enum(['collaboration', 'notification', 'test_update', 'deployment_status']),
  payload: z.any(),
  timestamp: z.date(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// Collaboration Message Schema
export const CollaborationMessageSchema = z.object({
  type: z.enum(['cursor_position', 'text_change', 'user_joined', 'user_left']),
  userId: z.string(),
  projectId: z.string(),
  data: z.any(),
  timestamp: z.date(),
});

export type CollaborationMessage = z.infer<typeof CollaborationMessageSchema>;