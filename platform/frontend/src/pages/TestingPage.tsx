import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { TestExecutionControls } from '../components/TestExecutionControls';
import { TestProgressIndicator } from '../components/TestProgressIndicator';
import { TestResultDisplay } from '../components/TestResultDisplay';
import { MockDataManager } from '../components/MockDataManager';
import { 
  TestResult, 
  ExecuteTestInput, 
  TestStatus 
} from '../types/shared';

interface MockDataSet {
  id: string;
  name: string;
  description: string;
  data: Record<string, any>;
  category: 'vehicle' | 'customer' | 'pricing' | 'inventory' | 'custom';
  createdAt: Date;
}

export const TestingPage: React.FC = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [currentTestResult, setCurrentTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [selectedMockData, setSelectedMockData] = useState<MockDataSet | undefined>(undefined);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Mock project data - in real implementation, this would come from props or context
  const mockProjectId = 'project-123';
  const mockVersionId = 'version-456';

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const simulateTestExecution = async (input: ExecuteTestInput): Promise<TestResult> => {
    // Simulate test execution with progress updates
    const startTime = Date.now();
    const testId = `test-${Date.now()}`;
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTestProgress(prev => {
        const newProgress = prev + Math.random() * 20;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 500);

    // Simulate test duration
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    clearInterval(progressInterval);
    setTestProgress(100);

    const executionTime = Date.now() - startTime;
    const hasErrors = Math.random() < 0.3; // 30% chance of errors
    const status: TestStatus = hasErrors ? 'failed' : 'passed';

    const mockErrors = hasErrors ? [
      {
        message: 'Cannot read property "price" of undefined',
        stack: 'TypeError: Cannot read property "price" of undefined\n    at calculateTotal (codepage.js:15:23)\n    at Object.execute (codepage.js:45:12)',
        lineNumber: 15,
        columnNumber: 23,
        type: 'TypeError',
      },
    ] : [];

    const result: TestResult = {
      id: testId,
      projectId: input.projectId,
      versionId: input.versionId || 'current',
      status,
      executionTime,
      memoryUsage: Math.floor(Math.random() * 50000000) + 10000000, // 10-60MB
      apiCallCount: Math.floor(Math.random() * 20) + 5,
      errors: mockErrors,
      performanceMetrics: {
        executionTime,
        memoryUsage: Math.floor(Math.random() * 50000000) + 10000000,
        cpuUsage: Math.random() * 80 + 10,
        apiCallCount: Math.floor(Math.random() * 20) + 5,
        apiResponseTime: Math.floor(Math.random() * 500) + 100,
      },
      coverage: {
        linesTotal: 100,
        linesCovered: Math.floor(Math.random() * 30) + 70,
        functionsTotal: 10,
        functionsCovered: Math.floor(Math.random() * 3) + 7,
        branchesTotal: 20,
        branchesCovered: Math.floor(Math.random() * 6) + 14,
        percentage: Math.floor(Math.random() * 30) + 70,
      },
      logs: [
        '[INFO] Test execution started',
        '[DEBUG] Loading test data...',
        '[INFO] Executing codepage with mock data',
        '[DEBUG] API call: GET /vehicles/VEH001',
        '[DEBUG] API response: 200 OK (150ms)',
        hasErrors ? '[ERROR] TypeError occurred during execution' : '[INFO] Codepage executed successfully',
        '[INFO] Test execution completed',
      ],
      createdAt: new Date(startTime),
      completedAt: new Date(),
    };

    return result;
  };

  const handleExecuteTest = async (input: ExecuteTestInput) => {
    try {
      setIsTestRunning(true);
      setTestProgress(0);
      setCurrentTestResult(null);
      
      showNotification('Starting test execution...', 'info');
      
      const result = await simulateTestExecution(input);
      
      setCurrentTestResult(result);
      setTestHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      const message = result.status === 'passed' 
        ? 'Test completed successfully!' 
        : `Test failed with ${result.errors.length} error(s)`;
      const severity = result.status === 'passed' ? 'success' : 'error';
      
      showNotification(message, severity);
      
    } catch (error) {
      console.error('Test execution failed:', error);
      showNotification('Test execution failed due to system error', 'error');
    } finally {
      setIsTestRunning(false);
      setTestProgress(0);
    }
  };

  const handleStopTest = () => {
    setIsTestRunning(false);
    setTestProgress(0);
    showNotification('Test execution stopped', 'warning');
  };

  const handleMockDataSelect = (dataSet: MockDataSet) => {
    setSelectedMockData(dataSet);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Codepage Testing
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Test your codepages in a safe environment with mock data and comprehensive result analysis.
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Controls and Mock Data */}
        <Grid item xs={12} lg={6}>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Test Execution Controls */}
            <TestExecutionControls
              projectId={mockProjectId}
              versionId={mockVersionId}
              isRunning={isTestRunning}
              onExecuteTest={handleExecuteTest}
              onStopTest={handleStopTest}
            />

            {/* Mock Data Manager */}
            <MockDataManager
              onDataSetSelect={handleMockDataSelect}
              selectedDataSet={selectedMockData}
            />
          </Box>
        </Grid>

        {/* Right Column - Progress and Results */}
        <Grid item xs={12} lg={6}>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Test Progress */}
            <TestProgressIndicator
              testResult={currentTestResult}
              isRunning={isTestRunning}
              progress={testProgress}
            />

            {/* Test Results */}
            {currentTestResult && (
              <TestResultDisplay testResult={currentTestResult} />
            )}

            {/* No Results Message */}
            {!currentTestResult && !isTestRunning && (
              <Alert severity="info">
                No test results yet. Configure your test settings and click "Run Test" to get started.
              </Alert>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};