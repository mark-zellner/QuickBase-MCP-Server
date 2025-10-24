import { apiClient } from './apiClient';
import { 
  TestResult, 
  ExecuteTestInput, 
  TestConfig 
} from '../types/shared';

export class TestService {
  /**
   * Execute a test for a codepage project
   */
  static async executeTest(input: ExecuteTestInput): Promise<TestResult> {
    const response = await apiClient.post('/test/execute', input);
    return response.data.data;
  }

  /**
   * Stop a running test
   */
  static async stopTest(testId: string): Promise<void> {
    await apiClient.post(`/test/${testId}/stop`);
  }

  /**
   * Get test result by ID
   */
  static async getTestResult(testId: string): Promise<TestResult> {
    const response = await apiClient.get(`/test/${testId}`);
    return response.data.data;
  }

  /**
   * Get test history for a project
   */
  static async getTestHistory(projectId: string, limit = 10): Promise<TestResult[]> {
    const response = await apiClient.get(`/test/history/${projectId}`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Get test status (for polling during execution)
   */
  static async getTestStatus(testId: string): Promise<{
    status: string;
    progress: number;
    result?: TestResult;
  }> {
    const response = await apiClient.get(`/test/${testId}/status`);
    return response.data.data;
  }

  /**
   * Validate test configuration
   */
  static async validateTestConfig(config: TestConfig): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const response = await apiClient.post('/test/validate-config', config);
    return response.data.data;
  }

  /**
   * Get available mock data templates
   */
  static async getMockDataTemplates(): Promise<Record<string, any>> {
    const response = await apiClient.get('/test/mock-templates');
    return response.data.data;
  }

  /**
   * Save custom mock data set
   */
  static async saveMockDataSet(dataSet: {
    name: string;
    description: string;
    category: string;
    data: Record<string, any>;
  }): Promise<string> {
    const response = await apiClient.post('/test/mock-data', dataSet);
    return response.data.data.id;
  }

  /**
   * Get saved mock data sets
   */
  static async getMockDataSets(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    data: Record<string, any>;
    createdAt: string;
  }>> {
    const response = await apiClient.get('/test/mock-data');
    return response.data.data;
  }

  /**
   * Delete a mock data set
   */
  static async deleteMockDataSet(id: string): Promise<void> {
    await apiClient.delete(`/test/mock-data/${id}`);
  }
}