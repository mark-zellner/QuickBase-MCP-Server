import { z } from 'zod';

// Template Category Enum
export const TemplateCategorySchema = z.enum(['calculator', 'form', 'dashboard', 'utility']);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

// JSON Schema for template configuration
export const JSONSchemaSchema = z.record(z.any());
export type JSONSchema = z.infer<typeof JSONSchemaSchema>;

// Codepage Template Schema
export const CodepageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: TemplateCategorySchema,
  code: z.string(),
  dependencies: z.array(z.string()),
  configSchema: JSONSchemaSchema,
  isPublic: z.boolean(),
  authorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CodepageTemplate = z.infer<typeof CodepageTemplateSchema>;

// Template Creation Input
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: TemplateCategorySchema,
  code: z.string(),
  dependencies: z.array(z.string()).default([]),
  configSchema: JSONSchemaSchema.default({}),
  isPublic: z.boolean().default(false),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

// Template Update Input
export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: TemplateCategorySchema.optional(),
  code: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  configSchema: JSONSchemaSchema.optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;