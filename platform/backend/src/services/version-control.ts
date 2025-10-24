import { z } from 'zod';
import * as diff from 'diff';

// Version control interfaces and types
export interface VersionControlEntry {
  id: string;
  projectId: string;
  versionNumber: string;
  code: string;
  changelog: string;
  authorId: string;
  authorName: string;
  parentVersionId?: string;
  branchName: string;
  tags: string[];
  commitHash: string;
  createdAt: Date;
  deploymentStatus: 'pending' | 'deployed' | 'failed';
  isActive: boolean;
}

export interface VersionComparison {
  fromVersion: VersionControlEntry;
  toVersion: VersionControlEntry;
  differences: CodeDifference[];
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalChanges: number;
  };
}

export interface CodeDifference {
  type: 'addition' | 'deletion' | 'modification';
  lineNumber: number;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  oldContent?: string;
  newContent?: string;
}

export interface ConflictResolution {
  conflictId: string;
  projectId: string;
  baseVersionId: string;
  incomingVersionId: string;
  conflicts: MergeConflict[];
  resolvedCode?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  status: 'pending' | 'resolved' | 'abandoned';
}

export interface MergeConflict {
  id: string;
  startLine: number;
  endLine: number;
  baseContent: string;
  incomingContent: string;
  currentContent: string;
  type: 'content' | 'deletion' | 'addition';
}

export interface BranchInfo {
  name: string;
  projectId: string;
  baseVersionId: string;
  headVersionId: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  description?: string;
}

export interface CreateVersionInput {
  projectId: string;
  code: string;
  changelog: string;
  branchName?: string;
  tags?: string[];
  parentVersionId?: string;
}

export interface CreateBranchInput {
  projectId: string;
  branchName: string;
  baseVersionId: string;
  description?: string;
}

// Validation schemas
export const CreateVersionControlSchema = z.object({
  projectId: z.string(),
  code: z.string().min(1),
  changelog: z.string().min(1).max(1000),
  branchName: z.string().default('main'),
  tags: z.array(z.string()).default([]),
  parentVersionId: z.string().optional(),
});

export const CreateBranchSchema = z.object({
  projectId: z.string(),
  branchName: z.string().min(1).max(50),
  baseVersionId: z.string(),
  description: z.string().max(500).optional(),
});

export const ResolveConflictSchema = z.object({
  conflictId: z.string(),
  resolvedCode: z.string().min(1),
});

export class VersionControlService {
  private versions: Map<string, VersionControlEntry[]> = new Map();
  private branches: Map<string, BranchInfo[]> = new Map();
  private conflicts: Map<string, ConflictResolution> = new Map();
  private activeSessions: Map<string, Set<string>> = new Map(); // projectId -> Set of userIds

  constructor() {
    this.initializeSampleVersions();
  }

  private initializeSampleVersions(): void {
    const sampleVersion: VersionControlEntry = {
      id: 'version-001',
      projectId: 'project-001',
      versionNumber: 'v1.0.0',
      code: `// Vehicle Pricing Calculator - Initial Version
function calculatePrice(basePrice, options, discounts) {
  let totalPrice = basePrice;
  
  // Add options
  options.forEach(option => {
    totalPrice += option.price;
  });
  
  // Apply discounts
  discounts.forEach(discount => {
    totalPrice -= discount.amount;
  });
  
  return Math.max(0, totalPrice);
}

QB.on('ready', function() {
  console.log('Pricing calculator loaded');
});`,
      changelog: 'Initial version of pricing calculator',
      authorId: 'admin-001',
      authorName: 'Admin User',
      branchName: 'main',
      tags: ['initial', 'v1.0'],
      commitHash: this.generateCommitHash(),
      createdAt: new Date(),
      deploymentStatus: 'pending',
      isActive: true,
    };

    const sampleBranch: BranchInfo = {
      name: 'main',
      projectId: 'project-001',
      baseVersionId: 'version-001',
      headVersionId: 'version-001',
      createdBy: 'admin-001',
      createdAt: new Date(),
      isActive: true,
      description: 'Main development branch',
    };

    this.versions.set('project-001', [sampleVersion]);
    this.branches.set('project-001', [sampleBranch]);

    console.log('📚 Initialized sample version control data');
  }

  // Version creation and management

  async createVersion(input: CreateVersionInput, authorId: string, authorName: string): Promise<VersionControlEntry> {
    const projectVersions = this.versions.get(input.projectId) || [];
    
    // Check for concurrent editing conflicts
    const activeUsers = this.activeSessions.get(input.projectId) || new Set();
    if (activeUsers.size > 1) {
      await this.checkForConflicts(input.projectId, input.code, authorId);
    }

    // Generate version number
    const versionNumber = this.generateVersionNumber(projectVersions, input.branchName || 'main');

    const version: VersionControlEntry = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      versionNumber,
      code: input.code,
      changelog: input.changelog,
      authorId,
      authorName,
      parentVersionId: input.parentVersionId || this.getLatestVersionId(projectVersions, input.branchName || 'main'),
      branchName: input.branchName || 'main',
      tags: input.tags || [],
      commitHash: this.generateCommitHash(),
      createdAt: new Date(),
      deploymentStatus: 'pending',
      isActive: true,
    };

    projectVersions.push(version);
    this.versions.set(input.projectId, projectVersions);

    // Update branch head
    await this.updateBranchHead(input.projectId, version.branchName, version.id);

    console.log(`📝 Created version ${version.versionNumber} for project ${input.projectId}`);
    return version;
  }

  async getProjectVersions(projectId: string, branchName?: string): Promise<VersionControlEntry[]> {
    const projectVersions = this.versions.get(projectId) || [];
    
    if (branchName) {
      return projectVersions.filter(v => v.branchName === branchName);
    }
    
    return projectVersions;
  }

  async getVersion(projectId: string, versionId: string): Promise<VersionControlEntry | null> {
    const projectVersions = this.versions.get(projectId) || [];
    return projectVersions.find(v => v.id === versionId) || null;
  }

  async getVersionByNumber(projectId: string, versionNumber: string, branchName: string = 'main'): Promise<VersionControlEntry | null> {
    const projectVersions = this.versions.get(projectId) || [];
    return projectVersions.find(v => v.versionNumber === versionNumber && v.branchName === branchName) || null;
  }

  async getLatestVersion(projectId: string, branchName: string = 'main'): Promise<VersionControlEntry | null> {
    const projectVersions = this.versions.get(projectId) || [];
    const branchVersions = projectVersions.filter(v => v.branchName === branchName);
    
    if (branchVersions.length === 0) return null;
    
    // Sort by creation date and return the latest
    return branchVersions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  // Version comparison and diff

  async compareVersions(projectId: string, fromVersionId: string, toVersionId: string): Promise<VersionComparison> {
    const fromVersion = await this.getVersion(projectId, fromVersionId);
    const toVersion = await this.getVersion(projectId, toVersionId);

    if (!fromVersion || !toVersion) {
      throw new Error('One or both versions not found');
    }

    const differences = this.generateCodeDifferences(fromVersion.code, toVersion.code);
    const summary = this.calculateDiffSummary(differences);

    return {
      fromVersion,
      toVersion,
      differences,
      summary,
    };
  }

  private generateCodeDifferences(oldCode: string, newCode: string): CodeDifference[] {
    const differences: CodeDifference[] = [];
    const patches = diff.diffLines(oldCode, newCode);
    
    let oldLineNumber = 1;
    let newLineNumber = 1;

    patches.forEach(patch => {
      if (patch.added) {
        const lines = patch.value.split('\n').filter(line => line !== '');
        lines.forEach(line => {
          differences.push({
            type: 'addition',
            lineNumber: newLineNumber,
            newLineNumber,
            content: line,
            newContent: line,
          });
          newLineNumber++;
        });
      } else if (patch.removed) {
        const lines = patch.value.split('\n').filter(line => line !== '');
        lines.forEach(line => {
          differences.push({
            type: 'deletion',
            lineNumber: oldLineNumber,
            oldLineNumber,
            content: line,
            oldContent: line,
          });
          oldLineNumber++;
        });
      } else {
        // Unchanged lines
        const lines = patch.value.split('\n').filter(line => line !== '');
        lines.forEach(() => {
          oldLineNumber++;
          newLineNumber++;
        });
      }
    });

    return differences;
  }

  private calculateDiffSummary(differences: CodeDifference[]): VersionComparison['summary'] {
    const summary = {
      linesAdded: 0,
      linesRemoved: 0,
      linesModified: 0,
      totalChanges: 0,
    };

    differences.forEach(diff => {
      switch (diff.type) {
        case 'addition':
          summary.linesAdded++;
          break;
        case 'deletion':
          summary.linesRemoved++;
          break;
        case 'modification':
          summary.linesModified++;
          break;
      }
    });

    summary.totalChanges = summary.linesAdded + summary.linesRemoved + summary.linesModified;
    return summary;
  }

  // Branch management

  async createBranch(input: CreateBranchInput, createdBy: string): Promise<BranchInfo> {
    const projectBranches = this.branches.get(input.projectId) || [];
    
    // Check if branch already exists
    const existingBranch = projectBranches.find(b => b.name === input.branchName);
    if (existingBranch) {
      throw new Error(`Branch '${input.branchName}' already exists`);
    }

    const branch: BranchInfo = {
      name: input.branchName,
      projectId: input.projectId,
      baseVersionId: input.baseVersionId,
      headVersionId: input.baseVersionId,
      createdBy,
      createdAt: new Date(),
      isActive: true,
      description: input.description,
    };

    projectBranches.push(branch);
    this.branches.set(input.projectId, projectBranches);

    console.log(`🌿 Created branch '${input.branchName}' for project ${input.projectId}`);
    return branch;
  }

  async getProjectBranches(projectId: string): Promise<BranchInfo[]> {
    return this.branches.get(projectId) || [];
  }

  async getBranch(projectId: string, branchName: string): Promise<BranchInfo | null> {
    const projectBranches = this.branches.get(projectId) || [];
    return projectBranches.find(b => b.name === branchName) || null;
  }

  async deleteBranch(projectId: string, branchName: string, userId: string): Promise<void> {
    if (branchName === 'main') {
      throw new Error('Cannot delete main branch');
    }

    const projectBranches = this.branches.get(projectId) || [];
    const branchIndex = projectBranches.findIndex(b => b.name === branchName);
    
    if (branchIndex === -1) {
      throw new Error('Branch not found');
    }

    const branch = projectBranches[branchIndex];
    if (branch.createdBy !== userId) {
      throw new Error('Only branch creator can delete the branch');
    }

    projectBranches.splice(branchIndex, 1);
    this.branches.set(projectId, projectBranches);

    console.log(`🗑️ Deleted branch '${branchName}' from project ${projectId}`);
  }

  private async updateBranchHead(projectId: string, branchName: string, versionId: string): Promise<void> {
    const projectBranches = this.branches.get(projectId) || [];
    const branch = projectBranches.find(b => b.name === branchName);
    
    if (branch) {
      branch.headVersionId = versionId;
    }
  }

  // Conflict detection and resolution

  async checkForConflicts(projectId: string, incomingCode: string, authorId: string): Promise<ConflictResolution | null> {
    const latestVersion = await this.getLatestVersion(projectId);
    if (!latestVersion) return null;

    // Simple conflict detection - check if code has diverged significantly
    const differences = this.generateCodeDifferences(latestVersion.code, incomingCode);
    const hasSignificantChanges = differences.length > 10; // Threshold for potential conflicts

    if (hasSignificantChanges) {
      const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const conflicts = this.detectMergeConflicts(latestVersion.code, incomingCode);

      if (conflicts.length > 0) {
        const conflictResolution: ConflictResolution = {
          conflictId,
          projectId,
          baseVersionId: latestVersion.id,
          incomingVersionId: `incoming-${Date.now()}`,
          conflicts,
          status: 'pending',
        };

        this.conflicts.set(conflictId, conflictResolution);
        return conflictResolution;
      }
    }

    return null;
  }

  private detectMergeConflicts(baseCode: string, incomingCode: string): MergeConflict[] {
    const conflicts: MergeConflict[] = [];
    const baseLines = baseCode.split('\n');
    const incomingLines = incomingCode.split('\n');

    // Simple conflict detection algorithm
    // In a real implementation, this would use a more sophisticated 3-way merge algorithm
    const patches = diff.diffLines(baseCode, incomingCode);
    let lineNumber = 0;

    patches.forEach((patch, index) => {
      if (patch.added || patch.removed) {
        const conflictLines = patch.value.split('\n').filter(line => line !== '');
        
        if (conflictLines.length > 3) { // Threshold for conflict
          conflicts.push({
            id: `conflict-${index}-${Date.now()}`,
            startLine: lineNumber,
            endLine: lineNumber + conflictLines.length,
            baseContent: patch.removed ? patch.value : '',
            incomingContent: patch.added ? patch.value : '',
            currentContent: patch.value,
            type: patch.added ? 'addition' : patch.removed ? 'deletion' : 'content',
          });
        }
      }
      
      lineNumber += patch.value.split('\n').length - 1;
    });

    return conflicts;
  }

  async resolveConflict(conflictId: string, resolvedCode: string, resolvedBy: string): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    conflict.resolvedCode = resolvedCode;
    conflict.resolvedBy = resolvedBy;
    conflict.resolvedAt = new Date();
    conflict.status = 'resolved';

    console.log(`✅ Resolved conflict ${conflictId} by ${resolvedBy}`);
    return conflict;
  }

  async getConflict(conflictId: string): Promise<ConflictResolution | null> {
    return this.conflicts.get(conflictId) || null;
  }

  async getProjectConflicts(projectId: string): Promise<ConflictResolution[]> {
    return Array.from(this.conflicts.values()).filter(c => c.projectId === projectId);
  }

  // Session management for concurrent editing

  async startEditingSession(projectId: string, userId: string): Promise<void> {
    const activeUsers = this.activeSessions.get(projectId) || new Set();
    activeUsers.add(userId);
    this.activeSessions.set(projectId, activeUsers);

    console.log(`👤 User ${userId} started editing session for project ${projectId}`);
  }

  async endEditingSession(projectId: string, userId: string): Promise<void> {
    const activeUsers = this.activeSessions.get(projectId);
    if (activeUsers) {
      activeUsers.delete(userId);
      if (activeUsers.size === 0) {
        this.activeSessions.delete(projectId);
      }
    }

    console.log(`👤 User ${userId} ended editing session for project ${projectId}`);
  }

  async getActiveEditors(projectId: string): Promise<string[]> {
    const activeUsers = this.activeSessions.get(projectId) || new Set();
    return Array.from(activeUsers);
  }

  // Utility methods

  private generateVersionNumber(versions: VersionControlEntry[], branchName: string): string {
    const branchVersions = versions.filter(v => v.branchName === branchName);
    
    if (branchVersions.length === 0) {
      return branchName === 'main' ? 'v1.0.0' : `${branchName}-v1.0.0`;
    }

    // Simple semantic versioning
    const latestVersion = branchVersions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const versionMatch = latestVersion.versionNumber.match(/v(\d+)\.(\d+)\.(\d+)/);
    
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      const patch = parseInt(versionMatch[3]);
      
      const newVersion = `v${major}.${minor}.${patch + 1}`;
      return branchName === 'main' ? newVersion : `${branchName}-${newVersion}`;
    }

    return branchName === 'main' ? `v1.0.${branchVersions.length}` : `${branchName}-v1.0.${branchVersions.length}`;
  }

  private getLatestVersionId(versions: VersionControlEntry[], branchName: string): string | undefined {
    const branchVersions = versions.filter(v => v.branchName === branchName);
    if (branchVersions.length === 0) return undefined;
    
    return branchVersions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].id;
  }

  private generateCommitHash(): string {
    return Math.random().toString(36).substr(2, 10) + Date.now().toString(36);
  }

  // Version history and analytics

  async getVersionHistory(projectId: string, branchName?: string, limit: number = 50): Promise<VersionControlEntry[]> {
    const projectVersions = this.versions.get(projectId) || [];
    let filteredVersions = projectVersions;

    if (branchName) {
      filteredVersions = projectVersions.filter(v => v.branchName === branchName);
    }

    return filteredVersions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getVersionStats(projectId: string): Promise<{
    totalVersions: number;
    totalBranches: number;
    totalConflicts: number;
    resolvedConflicts: number;
    activeEditors: number;
    lastActivity: Date | null;
  }> {
    const versions = this.versions.get(projectId) || [];
    const branches = this.branches.get(projectId) || [];
    const conflicts = Array.from(this.conflicts.values()).filter(c => c.projectId === projectId);
    const activeEditors = this.activeSessions.get(projectId)?.size || 0;

    const lastActivity = versions.length > 0 
      ? versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;

    return {
      totalVersions: versions.length,
      totalBranches: branches.length,
      totalConflicts: conflicts.length,
      resolvedConflicts: conflicts.filter(c => c.status === 'resolved').length,
      activeEditors,
      lastActivity,
    };
  }

  async tagVersion(projectId: string, versionId: string, tag: string): Promise<VersionControlEntry> {
    const version = await this.getVersion(projectId, versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (!version.tags.includes(tag)) {
      version.tags.push(tag);
    }

    console.log(`🏷️ Tagged version ${version.versionNumber} with '${tag}'`);
    return version;
  }

  async getVersionsByTag(projectId: string, tag: string): Promise<VersionControlEntry[]> {
    const projectVersions = this.versions.get(projectId) || [];
    return projectVersions.filter(v => v.tags.includes(tag));
  }
}