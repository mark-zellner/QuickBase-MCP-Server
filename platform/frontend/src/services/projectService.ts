import { apiClient } from './apiClient';
import {
  CodepageProject,
  CreateProjectInput,
  UpdateProjectInput,
  CodepageVersion,
  CreateVersionInput,
  ApiResponse,
  SearchInput,
} from '../types/shared.js';

export class ProjectService {
  private basePath = '/projects';

  async getProjects(params?: SearchInput): Promise<ApiResponse<CodepageProject[]>> {
    const response = await apiClient.get(this.basePath, { params });
    return response.data;
  }

  async getProject(id: string): Promise<ApiResponse<CodepageProject>> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  async createProject(input: CreateProjectInput): Promise<ApiResponse<CodepageProject>> {
    const response = await apiClient.post(this.basePath, input);
    return response.data;
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<ApiResponse<CodepageProject>> {
    const response = await apiClient.patch(`${this.basePath}/${id}`, input);
    return response.data;
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`${this.basePath}/${id}`);
    return response.data;
  }

  async getProjectVersions(projectId: string): Promise<ApiResponse<CodepageVersion[]>> {
    const response = await apiClient.get(`${this.basePath}/${projectId}/versions`);
    return response.data;
  }

  async getCurrentVersion(projectId: string): Promise<ApiResponse<CodepageVersion>> {
    const response = await apiClient.get(`${this.basePath}/${projectId}/versions/current`);
    return response.data;
  }

  async getVersion(projectId: string, versionId: string): Promise<ApiResponse<CodepageVersion>> {
    const response = await apiClient.get(`${this.basePath}/${projectId}/versions/${versionId}`);
    return response.data;
  }

  async createVersion(input: CreateVersionInput): Promise<ApiResponse<CodepageVersion>> {
    const response = await apiClient.post(`${this.basePath}/${input.projectId}/versions`, input);
    return response.data;
  }

  async saveCode(projectId: string, code: string): Promise<ApiResponse<void>> {
    const response = await apiClient.put(`${this.basePath}/${projectId}/code`, { code });
    return response.data;
  }

  async getCode(projectId: string): Promise<ApiResponse<{ code: string }>> {
    const response = await apiClient.get(`${this.basePath}/${projectId}/code`);
    return response.data;
  }

  async deployProject(projectId: string, environment: string = 'production'): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`${this.basePath}/${projectId}/deploy`, { environment });
    return response.data;
  }

  async addCollaborator(projectId: string, userId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`${this.basePath}/${projectId}/collaborators`, { userId });
    return response.data;
  }

  async removeCollaborator(projectId: string, userId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`${this.basePath}/${projectId}/collaborators/${userId}`);
    return response.data;
  }

  async getCollaborators(projectId: string): Promise<ApiResponse<Array<{ id: string; name: string; email: string }>>> {
    const response = await apiClient.get(`${this.basePath}/${projectId}/collaborators`);
    return response.data;
  }
}

export const projectService = new ProjectService();