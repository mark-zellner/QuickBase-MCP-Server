import { z } from 'zod';
import { UserRoleSchema } from './user.js';

// QuickBase Field Type Enum
export const QuickBaseFieldTypeSchema = z.enum([
  'text',
  'text_choice',
  'text_multiline',
  'richtext',
  'numeric',
  'currency',
  'percent',
  'date',
  'datetime',
  'checkbox',
  'email',
  'phone',
  'url',
  'address',
  'file',
  'lookup',
  'formula',
  'reference'
]);

export type QuickBaseFieldType = z.infer<typeof QuickBaseFieldTypeSchema>;

// Validation Rule Schema
export const ValidationRuleSchema = z.object({
  type: z.enum(['required', 'unique', 'range', 'pattern', 'custom']),
  value: z.any().optional(),
  message: z.string().optional(),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// Field Definition Schema
export const FieldDefinitionSchema = z.object({
  id: z.number().optional(), // QuickBase field ID
  label: z.string(),
  fieldType: QuickBaseFieldTypeSchema,
  required: z.boolean().optional().default(false),
  unique: z.boolean().optional().default(false),
  defaultValue: z.any().optional(),
  validation: z.array(ValidationRuleSchema).optional(),
  choices: z.array(z.string()).optional(),
  formula: z.string().optional(),
  lookupTableId: z.string().optional(),
  lookupFieldId: z.number().optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// Relationship Definition Schema
export const RelationshipDefinitionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['one-to-many', 'many-to-many']).default('one-to-many'),
  parentTableId: z.string(),
  childTableId: z.string(),
  foreignKeyFieldId: z.number(),
  lookupFields: z.array(z.object({
    sourceFieldId: z.number(),
    targetFieldId: z.number(),
    parentFieldId: z.number().optional(),
    childFieldLabel: z.string().optional(),
  })).optional(),
});

export type RelationshipDefinition = z.infer<typeof RelationshipDefinitionSchema>;

// Permission Set Schema
export const PermissionSetSchema = z.object({
  view: z.array(UserRoleSchema),
  create: z.array(UserRoleSchema),
  update: z.array(UserRoleSchema),
  delete: z.array(UserRoleSchema),
});

export type PermissionSet = z.infer<typeof PermissionSetSchema>;

// Table Definition Schema
export const TableDefinitionSchema = z.object({
  id: z.string().optional(), // QuickBase table ID
  name: z.string(),
  description: z.string().optional(),
  fields: z.array(FieldDefinitionSchema),
  relationships: z.array(RelationshipDefinitionSchema).optional(),
  permissions: PermissionSetSchema.optional(),
});

export type TableDefinition = z.infer<typeof TableDefinitionSchema>;

// Schema Change Type Enum
export const SchemaChangeTypeSchema = z.enum([
  'create', 'update', 'delete',
  'table_create', 'table_update', 'table_delete',
  'field_create', 'field_update', 'field_delete',
  'relationship_create', 'relationship_update', 'relationship_delete'
]);

export type SchemaChangeType = z.infer<typeof SchemaChangeTypeSchema>;

// Schema Change Schema
export const SchemaChangeSchema = z.object({
  id: z.string(),
  type: SchemaChangeTypeSchema,
  tableId: z.string().optional(),
  fieldId: z.number().optional(),
  relationshipId: z.string().optional(),
  changes: z.record(z.any()),
  authorId: z.string(),
  timestamp: z.date(),
  rollbackData: z.record(z.any()).optional(),
});

export type SchemaChange = z.infer<typeof SchemaChangeSchema>;