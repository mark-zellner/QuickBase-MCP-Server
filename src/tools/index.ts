import { appTools } from './apps.js';
import { authTools } from './auth.js';
import { codepageTools } from './codepages.js';
import { fieldTools } from './fields.js';
import { fileTools } from './files.js';
import { pageTools } from './pages.js';
import { recordTools } from './records.js';
import { relationshipTools } from './relationships.js';
import { reportTools } from './reports.js';
import { tableTools } from './tables.js';
import type { ToolDef } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = ToolDef<any>;

export const allTools: AnyTool[] = [
  ...appTools,
  ...tableTools,
  ...fieldTools,
  ...recordTools,
  ...relationshipTools,
  ...reportTools,
  ...fileTools,
  ...codepageTools,
  ...pageTools,
  ...authTools,
];

export function selectTools(readOnly: boolean): AnyTool[] {
  return readOnly ? allTools.filter((t) => !t.write) : allTools;
}
