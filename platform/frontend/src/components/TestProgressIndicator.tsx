import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  Timer,
  Memory,
  Api,
  CheckCircle,
  Error,
  PlayArrow,
} from '@mui/icons-material';
import { TestResult, TestStatus } from '../types/shared';

interface TestProgressIndicatorProps {
  testResult?: TestResult;
  isRunning: boolean;
  progress?: number; // 0-100
}

export const TestProgressIndicator: React.FC<TestProgressIndicatorProps> = ({
  testResult,
  isRunning,
  progress = 0,
}) => {
  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle />;
      case 'failed':
      case 'error':
        return <Error />;
      case 'running':
        return <PlayArrow />;
      default:
        return null;
    }
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Test Progress
          </Typography>
          {testResult && (
            <Chip
              icon={getStatusIcon(testResult.status) || undefined}
              label={testResult.status.toUpperCase()}
              color={getStatusColor(testResult.status)}
              variant="outlined"
            />
          )}
        </Box>

        {/* Progress Bar */}
        {isRunning && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Executing test...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant={progress > 0 ? "determinate" : "indeterminate"} 
              value={progress} 
            />
          </Box>
        )}

        {/* Test Metrics */}
        {testResult && (
          <>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Timer color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Execution Time
                    </Typography>
                    <Typography variant="h6">
                      {formatTime(testResult.executionTime)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Memory color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Memory Usage
                    </Typography>
                    <Typography variant="h6">
                      {formatMemory(testResult.memoryUsage)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Api color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      API Calls
                    </Typography>
                    <Typography variant="h6">
                      {testResult.apiCallCount}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Timer color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Avg API Response
                    </Typography>
                    <Typography variant="h6">
                      {formatTime(testResult.performanceMetrics.apiResponseTime)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Performance Metrics */}
            {testResult.performanceMetrics && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Metrics
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      CPU Usage: {testResult.performanceMetrics.cpuUsage?.toFixed(1) || 'N/A'}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Memory Peak: {formatMemory(testResult.performanceMetrics.memoryUsage)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Test Coverage */}
            {testResult.coverage && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Code Coverage
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Overall Coverage
                  </Typography>
                  <Chip 
                    label={`${testResult.coverage.percentage.toFixed(1)}%`}
                    size="small"
                    color={testResult.coverage.percentage >= 80 ? 'success' : 'warning'}
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={testResult.coverage.percentage} 
                  color={testResult.coverage.percentage >= 80 ? 'success' : 'warning'}
                />
                <Grid container spacing={1} mt={1}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Lines: {testResult.coverage.linesCovered}/{testResult.coverage.linesTotal}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Functions: {testResult.coverage.functionsCovered}/{testResult.coverage.functionsTotal}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Branches: {testResult.coverage.branchesCovered}/{testResult.coverage.branchesTotal}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};