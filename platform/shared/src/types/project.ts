import { z } from 'zod';

// Project Status Enum
export const ProjectStatusSchema = z.enum(['development', 'testing', 'deployed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Codepage Project Schema
export const CodepageProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  templateId: z.string(),
  ownerId: z.string(),
  collaborators: z.array(z.string()),
  currentVersion: z.string(),
  status: ProjectStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CodepageProject = z.infer<typeof CodepageProjectSchema>;

// Project Creation Input
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  templateId: z.string(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// Project Update Input
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: ProjectStatusSchema.optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;