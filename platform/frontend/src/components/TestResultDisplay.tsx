import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  KeyboardArrowDown,
  KeyboardArrowRight,
  Error,
  Warning,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { TestResult, TestError } from '../types/shared';

interface TestResultDisplayProps {
  testResult: TestResult;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const TestResultDisplay: React.FC<TestResultDisplayProps> = ({
  testResult,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getErrorSeverityIcon = (errorType: string) => {
    switch (errorType.toLowerCase()) {
      case 'syntaxerror':
      case 'referenceerror':
        return <Error color="error" />;
      case 'typeerror':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Test Results
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={testResult.status === 'passed' ? <CheckCircle /> : <Error />}
              label={testResult.status.toUpperCase()}
              color={getStatusColor(testResult.status) as any}
            />
            <Typography variant="body2" color="text.secondary">
              {formatTimestamp(testResult.createdAt)}
            </Typography>
          </Box>
        </Box>

        {/* Status Alert */}
        {testResult.status === 'failed' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Test execution failed with {testResult.errors.length} error(s)
          </Alert>
        )}
        {testResult.status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Test execution encountered a critical error
          </Alert>
        )}
        {testResult.status === 'passed' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            All tests passed successfully
          </Alert>
        )}

        {/* Tabs for different result views */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Summary" />
            <Tab label={`Errors (${testResult.errors.length})`} />
            <Tab label="Performance" />
            {testResult.logs && <Tab label="Logs" />}
          </Tabs>
        </Box>

        {/* Summary Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">Status</TableCell>
                  <TableCell>
                    <Chip 
                      label={testResult.status} 
                      color={getStatusColor(testResult.status) as any}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Execution Time</TableCell>
                  <TableCell>{testResult.executionTime}ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Memory Usage</TableCell>
                  <TableCell>{(testResult.memoryUsage / 1024 / 1024).toFixed(2)} MB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">API Calls</TableCell>
                  <TableCell>{testResult.apiCallCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Started At</TableCell>
                  <TableCell>{formatTimestamp(testResult.createdAt)}</TableCell>
                </TableRow>
                {testResult.completedAt && (
                  <TableRow>
                    <TableCell component="th" scope="row">Completed At</TableCell>
                    <TableCell>{formatTimestamp(testResult.completedAt)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Errors Tab */}
        <TabPanel value={tabValue} index={1}>
          {testResult.errors.length === 0 ? (
            <Alert severity="success">
              No errors detected during test execution
            </Alert>
          ) : (
            <List>
              {testResult.errors.map((error: TestError, index: number) => (
                <React.Fragment key={index}>
                  <ListItem
                    button
                    onClick={() => toggleErrorExpansion(index)}
                    sx={{ 
                      border: 1, 
                      borderColor: 'error.main', 
                      borderRadius: 1, 
                      mb: 1,
                      bgcolor: 'error.light',
                      '&:hover': {
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                      }
                    }}
                  >
                    <IconButton size="small">
                      {expandedErrors.has(index) ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                    </IconButton>
                    {getErrorSeverityIcon(error.type)}
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {error.type}
                          </Typography>
                          {error.lineNumber && (
                            <Chip 
                              label={`Line ${error.lineNumber}`} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={error.message}
                    />
                  </ListItem>
                  <Collapse in={expandedErrors.has(index)}>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      {error.stack && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                            <Typography 
                              variant="body2" 
                              component="pre" 
                              sx={{ 
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                              }}
                            >
                              {error.stack}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                      {error.lineNumber && error.columnNumber && (
                        <Box mt={1}>
                          <Typography variant="body2" color="text.secondary">
                            Location: Line {error.lineNumber}, Column {error.columnNumber}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                  {index < testResult.errors.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Execution Time</TableCell>
                  <TableCell>{testResult.performanceMetrics.executionTime}ms</TableCell>
                  <TableCell>
                    <Chip 
                      label={testResult.performanceMetrics.executionTime < 5000 ? 'Good' : 'Slow'}
                      color={testResult.performanceMetrics.executionTime < 5000 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Memory Usage</TableCell>
                  <TableCell>{(testResult.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)} MB</TableCell>
                  <TableCell>
                    <Chip 
                      label={testResult.performanceMetrics.memoryUsage < 67108864 ? 'Good' : 'High'}
                      color={testResult.performanceMetrics.memoryUsage < 67108864 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>API Calls</TableCell>
                  <TableCell>{testResult.performanceMetrics.apiCallCount}</TableCell>
                  <TableCell>
                    <Chip 
                      label={testResult.performanceMetrics.apiCallCount < 50 ? 'Good' : 'High'}
                      color={testResult.performanceMetrics.apiCallCount < 50 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Avg API Response Time</TableCell>
                  <TableCell>{testResult.performanceMetrics.apiResponseTime}ms</TableCell>
                  <TableCell>
                    <Chip 
                      label={testResult.performanceMetrics.apiResponseTime < 1000 ? 'Good' : 'Slow'}
                      color={testResult.performanceMetrics.apiResponseTime < 1000 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                {testResult.performanceMetrics.cpuUsage && (
                  <TableRow>
                    <TableCell>CPU Usage</TableCell>
                    <TableCell>{testResult.performanceMetrics.cpuUsage.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Chip 
                        label={testResult.performanceMetrics.cpuUsage < 80 ? 'Good' : 'High'}
                        color={testResult.performanceMetrics.cpuUsage < 80 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Logs Tab */}
        {testResult.logs && (
          <TabPanel value={tabValue} index={3}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
              {testResult.logs.length === 0 ? (
                <Typography color="text.secondary">No logs available</Typography>
              ) : (
                testResult.logs.map((log, index) => (
                  <Typography 
                    key={index}
                    variant="body2" 
                    component="div"
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      mb: 0.5,
                      borderBottom: index < testResult.logs!.length - 1 ? '1px solid #eee' : 'none',
                      pb: 0.5
                    }}
                  >
                    {log}
                  </Typography>
                ))
              )}
            </Paper>
          </TabPanel>
        )}
      </CardContent>
    </Card>
  );
};