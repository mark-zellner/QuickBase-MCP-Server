import { z } from 'zod';

// User Role Enum
export const UserRoleSchema = z.enum(['admin', 'developer', 'manager', 'user']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  isActive: z.boolean(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Authentication Schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('user'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// JWT Token Schema
export const TokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  iat: z.number(),
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;