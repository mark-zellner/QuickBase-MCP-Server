import { z } from 'zod';

// Local type definitions (will be replaced with shared types in future tasks)
export enum ProjectStatus {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYED = 'deployed'
}

export interface CodepageProject {
  id: string;
  name: string;
  description: string;
  templateId: string;
  ownerId: string;
  collaborators: string[];
  currentVersion: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  templateId: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CodepageVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  code: string;
  changelog: string;
  authorId: string;
  testResults?: any;
  deploymentStatus: 'pending' | 'deployed' | 'failed';
  createdAt: Date;
}

export interface CreateVersionInput {
  code: string;
  changelog: string;
}

// Validation schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  templateId: z.string(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const CreateVersionSchema = z.object({
  code: z.string().min(1),
  changelog: z.string().max(1000),
});

export const AddCollaboratorSchema = z.object({
  userId: z.string(),
});

export class ProjectService {
  private projects: Map<string, CodepageProject> = new Map();
  private versions: Map<string, CodepageVersion[]> = new Map();

  constructor() {
    // Initialize with some sample projects for development
    this.initializeSampleProjects();
  }

  private initializeSampleProjects(): void {
    const sampleProject: CodepageProject = {
      id: 'project-001',
      name: 'Vehicle Pricing Calculator',
      description: 'Interactive calculator for vehicle pricing with options and financing',
      templateId: 'template-pricing-calculator',
      ownerId: 'admin-001',
      collaborators: ['dev-001'],
      currentVersion: 'v1.0.0',
      status: ProjectStatus.DEVELOPMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sampleVersion: CodepageVersion = {
      id: 'version-001',
      projectId: 'project-001',
      versionNumber: 'v1.0.0',
      code: `// Vehicle Pricing Calculator
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

// Initialize calculator
QB.on('ready', function() {
  console.log('Pricing calculator loaded');
});`,
      changelog: 'Initial version of pricing calculator',
      authorId: 'admin-001',
      deploymentStatus: 'pending',
      createdAt: new Date(),
    };

    this.projects.set(sampleProject.id, sampleProject);
    this.versions.set(sampleProject.id, [sampleVersion]);

    console.log('📁 Initialized sample codepage projects for development');
  }

  async createProject(input: CreateProjectInput, ownerId: string): Promise<CodepageProject> {
    const project: CodepageProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: input.name,
      description: input.description,
      templateId: input.templateId,
      ownerId,
      collaborators: [],
      currentVersion: 'v0.1.0',
      status: ProjectStatus.DEVELOPMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create initial version
    const initialVersion: CodepageVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: project.id,
      versionNumber: 'v0.1.0',
      code: '// New codepage project\n// Add your code here',
      changelog: 'Initial project creation',
      authorId: ownerId,
      deploymentStatus: 'pending',
      createdAt: new Date(),
    };

    this.projects.set(project.id, project);
    this.versions.set(project.id, [initialVersion]);

    return project;
  }

  async getProject(projectId: string): Promise<CodepageProject | null> {
    return this.projects.get(projectId) || null;
  }

  async updateProject(projectId: string, input: UpdateProjectInput, userId: string): Promise<CodepageProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user has permission to update
    if (project.ownerId !== userId && !project.collaborators.includes(userId)) {
      throw new Error('Insufficient permissions to update project');
    }

    // Update project properties
    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined) project.description = input.description;
    if (input.status !== undefined) project.status = input.status;
    project.updatedAt = new Date();

    return project;
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can delete project
    if (project.ownerId !== userId) {
      throw new Error('Only project owner can delete the project');
    }

    this.projects.delete(projectId);
    this.versions.delete(projectId);
  }

  async getUserProjects(userId: string): Promise<CodepageProject[]> {
    return Array.from(this.projects.values()).filter(project => 
      project.ownerId === userId || project.collaborators.includes(userId)
    );
  }

  async getAllProjects(): Promise<CodepageProject[]> {
    return Array.from(this.projects.values());
  }

  async addCollaborator(projectId: string, collaboratorId: string, ownerId: string): Promise<CodepageProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can add collaborators
    if (project.ownerId !== ownerId) {
      throw new Error('Only project owner can add collaborators');
    }

    // Check if already a collaborator
    if (project.collaborators.includes(collaboratorId)) {
      throw new Error('User is already a collaborator');
    }

    // Don't add owner as collaborator
    if (project.ownerId === collaboratorId) {
      throw new Error('Project owner is automatically a collaborator');
    }

    project.collaborators.push(collaboratorId);
    project.updatedAt = new Date();

    return project;
  }

  async removeCollaborator(projectId: string, collaboratorId: string, ownerId: string): Promise<CodepageProject> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Only owner can remove collaborators
    if (project.ownerId !== ownerId) {
      throw new Error('Only project owner can remove collaborators');
    }

    const index = project.collaborators.indexOf(collaboratorId);
    if (index === -1) {
      throw new Error('User is not a collaborator');
    }

    project.collaborators.splice(index, 1);
    project.updatedAt = new Date();

    return project;
  }

  // Version management methods

  async createVersion(projectId: string, input: CreateVersionInput, authorId: string): Promise<CodepageVersion> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user has permission to create versions
    if (project.ownerId !== authorId && !project.collaborators.includes(authorId)) {
      throw new Error('Insufficient permissions to create version');
    }

    const projectVersions = this.versions.get(projectId) || [];
    const versionNumber = this.generateNextVersionNumber(projectVersions);

    const version: CodepageVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      versionNumber,
      code: input.code,
      changelog: input.changelog,
      authorId,
      deploymentStatus: 'pending',
      createdAt: new Date(),
    };

    projectVersions.push(version);
    this.versions.set(projectId, projectVersions);

    // Update project's current version
    project.currentVersion = versionNumber;
    project.updatedAt = new Date();

    return version;
  }

  async getProjectVersions(projectId: string): Promise<CodepageVersion[]> {
    return this.versions.get(projectId) || [];
  }

  async getVersion(projectId: string, versionId: string): Promise<CodepageVersion | null> {
    const projectVersions = this.versions.get(projectId) || [];
    return projectVersions.find(v => v.id === versionId) || null;
  }

  async getCurrentVersion(projectId: string): Promise<CodepageVersion | null> {
    const project = this.projects.get(projectId);
    if (!project) {
      return null;
    }

    const projectVersions = this.versions.get(projectId) || [];
    return projectVersions.find(v => v.versionNumber === project.currentVersion) || null;
  }

  async compareVersions(projectId: string, version1Id: string, version2Id: string): Promise<{
    version1: CodepageVersion;
    version2: CodepageVersion;
    differences: string[];
  }> {
    const version1 = await this.getVersion(projectId, version1Id);
    const version2 = await this.getVersion(projectId, version2Id);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Simple difference detection (in a real implementation, use a proper diff library)
    const differences: string[] = [];
    
    if (version1.code !== version2.code) {
      differences.push('Code content differs');
    }
    
    if (version1.changelog !== version2.changelog) {
      differences.push('Changelog differs');
    }

    return {
      version1,
      version2,
      differences,
    };
  }

  private generateNextVersionNumber(versions: CodepageVersion[]): string {
    if (versions.length === 0) {
      return 'v1.0.0';
    }

    // Simple version increment (in a real implementation, use semver)
    const lastVersion = versions[versions.length - 1];
    const versionMatch = lastVersion.versionNumber.match(/v(\d+)\.(\d+)\.(\d+)/);
    
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      const patch = parseInt(versionMatch[3]);
      
      return `v${major}.${minor}.${patch + 1}`;
    }

    return `v1.0.${versions.length}`;
  }

  async searchProjects(query: string, userId?: string): Promise<CodepageProject[]> {
    let projects = Array.from(this.projects.values());

    // Filter by user access if userId provided
    if (userId) {
      projects = projects.filter(project => 
        project.ownerId === userId || project.collaborators.includes(userId)
      );
    }

    // Simple text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      projects = projects.filter(project =>
        project.name.toLowerCase().includes(lowerQuery) ||
        project.description.toLowerCase().includes(lowerQuery)
      );
    }

    return projects;
  }

  async getProjectStats(projectId: string): Promise<{
    totalVersions: number;
    totalCollaborators: number;
    lastUpdated: Date;
    status: ProjectStatus;
  }> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const versions = this.versions.get(projectId) || [];

    return {
      totalVersions: versions.length,
      totalCollaborators: project.collaborators.length + 1, // +1 for owner
      lastUpdated: project.updatedAt,
      status: project.status,
    };
  }
}