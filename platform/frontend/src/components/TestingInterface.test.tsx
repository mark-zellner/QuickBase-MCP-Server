import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';
import { TestExecutionControls } from './TestExecutionControls';
import { TestProgressIndicator } from './TestProgressIndicator';
import { TestResultDisplay } from './TestResultDisplay';
import { MockDataManager } from './MockDataManager';
import { TestResult, TestStatus } from '../types/shared';

// Mock test data
const mockTestResult: TestResult = {
  id: 'test-123',
  projectId: 'project-456',
  versionId: 'version-789',
  status: 'passed' as TestStatus,
  executionTime: 2500,
  memoryUsage: 45000000,
  apiCallCount: 12,
  errors: [],
  performanceMetrics: {
    executionTime: 2500,
    memoryUsage: 45000000,
    cpuUsage: 35.5,
    apiCallCount: 12,
    apiResponseTime: 250,
  },
  coverage: {
    linesTotal: 100,
    linesCovered: 85,
    functionsTotal: 10,
    functionsCovered: 9,
    branchesTotal: 20,
    branchesCovered: 17,
    percentage: 85,
  },
  logs: [
    '[INFO] Test execution started',
    '[DEBUG] Loading test data...',
    '[INFO] Test completed successfully',
  ],
  createdAt: new Date('2024-01-15T10:30:00Z'),
  completedAt: new Date('2024-01-15T10:30:02Z'),
};

const mockFailedTestResult: TestResult = {
  ...mockTestResult,
  id: 'test-failed-123',
  status: 'failed' as TestStatus,
  errors: [
    {
      message: 'Cannot read property "price" of undefined',
      stack: 'TypeError: Cannot read property "price" of undefined\n    at calculateTotal (codepage.js:15:23)',
      lineNumber: 15,
      columnNumber: 23,
      type: 'TypeError',
    },
  ],
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TestExecutionControls', () => {
  const mockProps = {
    projectId: 'project-123',
    versionId: 'version-456',
    isRunning: false,
    onExecuteTest: vi.fn(),
    onStopTest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders test execution controls', () => {
    renderWithTheme(<TestExecutionControls {...mockProps} />);
    
    expect(screen.getByText('Test Execution')).toBeInTheDocument();
    expect(screen.getByText('Run Test')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('enables run button when not running', () => {
    renderWithTheme(<TestExecutionControls {...mockProps} />);
    
    const runButton = screen.getByText('Run Test');
    expect(runButton).not.toBeDisabled();
  });

  it('disables run button when running', () => {
    renderWithTheme(<TestExecutionControls {...mockProps} isRunning={true} />);
    
    const runButton = screen.getByText('Run Test');
    expect(runButton).toBeDisabled();
  });

  it('calls onExecuteTest when run button is clicked', async () => {
    renderWithTheme(<TestExecutionControls {...mockProps} />);
    
    const runButton = screen.getByText('Run Test');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(mockProps.onExecuteTest).toHaveBeenCalledWith({
        projectId: 'project-123',
        versionId: 'version-456',
        config: expect.objectContaining({
          timeout: 30000,
          memoryLimit: 134217728,
          apiCallLimit: 100,
          environment: 'development',
        }),
        testData: {},
      });
    });
  });

  it('validates JSON test data', async () => {
    renderWithTheme(<TestExecutionControls {...mockProps} />);
    
    const testDataField = screen.getByPlaceholderText(/Provide test data as JSON/);
    fireEvent.change(testDataField, { target: { value: 'invalid json' } });
    
    const runButton = screen.getByText('Run Test');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
      expect(mockProps.onExecuteTest).not.toHaveBeenCalled();
    });
  });
});

describe('TestProgressIndicator', () => {
  it('shows progress when test is running', () => {
    renderWithTheme(
      <TestProgressIndicator 
        isRunning={true} 
        progress={50} 
      />
    );
    
    expect(screen.getByText('Test Progress')).toBeInTheDocument();
    expect(screen.getByText('Executing test...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays test metrics when result is available', () => {
    renderWithTheme(
      <TestProgressIndicator 
        testResult={mockTestResult}
        isRunning={false}
      />
    );
    
    expect(screen.getByText('2.50s')).toBeInTheDocument(); // Execution time
    expect(screen.getByText('42.91 MB')).toBeInTheDocument(); // Memory usage
    expect(screen.getByText('12')).toBeInTheDocument(); // API calls
  });

  it('shows status chip with correct color', () => {
    renderWithTheme(
      <TestProgressIndicator 
        testResult={mockTestResult}
        isRunning={false}
      />
    );
    
    expect(screen.getByText('PASSED')).toBeInTheDocument();
  });
});

describe('TestResultDisplay', () => {
  it('renders test result summary', () => {
    renderWithTheme(<TestResultDisplay testResult={mockTestResult} />);
    
    expect(screen.getByText('Test Results')).toBeInTheDocument();
    expect(screen.getByText('PASSED')).toBeInTheDocument();
    expect(screen.getByText('All tests passed successfully')).toBeInTheDocument();
  });

  it('displays error information for failed tests', () => {
    renderWithTheme(<TestResultDisplay testResult={mockFailedTestResult} />);
    
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Test execution failed with 1 error(s)')).toBeInTheDocument();
  });

  it('shows performance metrics in performance tab', async () => {
    renderWithTheme(<TestResultDisplay testResult={mockTestResult} />);
    
    const performanceTab = screen.getByText('Performance');
    fireEvent.click(performanceTab);
    
    await waitFor(() => {
      expect(screen.getByText('2500ms')).toBeInTheDocument();
      expect(screen.getByText('42.91 MB')).toBeInTheDocument();
    });
  });

  it('expands error details when clicked', async () => {
    renderWithTheme(<TestResultDisplay testResult={mockFailedTestResult} />);
    
    const errorsTab = screen.getByText('Errors (1)');
    fireEvent.click(errorsTab);
    
    await waitFor(() => {
      expect(screen.getByText('TypeError')).toBeInTheDocument();
      expect(screen.getByText('Cannot read property "price" of undefined')).toBeInTheDocument();
    });
  });
});

describe('MockDataManager', () => {
  const mockOnDataSetSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mock data manager', () => {
    renderWithTheme(
      <MockDataManager onDataSetSelect={mockOnDataSetSelect} />
    );
    
    expect(screen.getByText('Mock Data Sets')).toBeInTheDocument();
    expect(screen.getByText('Add Data Set')).toBeInTheDocument();
  });

  it('shows default data sets', () => {
    renderWithTheme(
      <MockDataManager onDataSetSelect={mockOnDataSetSelect} />
    );
    
    expect(screen.getByText('Sample Vehicle Data')).toBeInTheDocument();
    expect(screen.getByText('Customer Profile')).toBeInTheDocument();
  });

  it('opens create dialog when add button is clicked', async () => {
    renderWithTheme(
      <MockDataManager onDataSetSelect={mockOnDataSetSelect} />
    );
    
    const addButton = screen.getByText('Add Data Set');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create Mock Data Set')).toBeInTheDocument();
    });
  });

  it('validates JSON data in create dialog', async () => {
    renderWithTheme(
      <MockDataManager onDataSetSelect={mockOnDataSetSelect} />
    );
    
    const addButton = screen.getByText('Add Data Set');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const nameField = screen.getByLabelText('Name');
      const dataField = screen.getByDisplayValue('{}');
      
      fireEvent.change(nameField, { target: { value: 'Test Data' } });
      fireEvent.change(dataField, { target: { value: 'invalid json' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
    });
  });
});