import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Settings,
  ExpandMore,
} from '@mui/icons-material';
import { TestConfig, ExecuteTestInput } from '../types/shared';

interface TestExecutionControlsProps {
  projectId: string;
  versionId?: string;
  isRunning: boolean;
  onExecuteTest: (input: ExecuteTestInput) => void;
  onStopTest: () => void;
}

export const TestExecutionControls: React.FC<TestExecutionControlsProps> = ({
  projectId,
  versionId,
  isRunning,
  onExecuteTest,
  onStopTest,
}) => {
  const [config, setConfig] = useState<TestConfig>({
    timeout: 30000,
    memoryLimit: 134217728, // 128MB
    apiCallLimit: 100,
    environment: 'development',
  });
  
  const [testData, setTestData] = useState<string>('{}');
  const [testDataError, setTestDataError] = useState<string>('');

  const handleExecuteTest = () => {
    // Validate test data JSON
    let parsedTestData;
    try {
      parsedTestData = JSON.parse(testData);
      setTestDataError('');
    } catch (error) {
      setTestDataError('Invalid JSON format');
      return;
    }

    const input: ExecuteTestInput = {
      projectId,
      versionId,
      config,
      testData: parsedTestData,
    };

    onExecuteTest(input);
  };

  const handleConfigChange = (field: keyof TestConfig, value: any) => {
    setConfig((prev: TestConfig) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Test Execution
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={handleExecuteTest}
              disabled={isRunning || !!testDataError}
            >
              Run Test
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={onStopTest}
              disabled={!isRunning}
            >
              Stop
            </Button>
          </Box>
        </Box>

        {/* Test Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Settings />
              <Typography>Test Configuration</Typography>
              <Chip 
                label={config.environment} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Timeout (ms)"
                  type="number"
                  value={config.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  inputProps={{ min: 1000, max: 300000 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Memory Limit (MB)"
                  type="number"
                  value={Math.round(config.memoryLimit / 1024 / 1024)}
                  onChange={(e) => handleConfigChange('memoryLimit', parseInt(e.target.value) * 1024 * 1024)}
                  inputProps={{ min: 16, max: 512 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API Call Limit"
                  type="number"
                  value={config.apiCallLimit}
                  onChange={(e) => handleConfigChange('apiCallLimit', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 1000 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Environment</InputLabel>
                  <Select
                    value={config.environment}
                    label="Environment"
                    onChange={(e) => handleConfigChange('environment', e.target.value)}
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Test Data Input */}
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>
            Test Data (JSON)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={testData}
            onChange={(e) => {
              setTestData(e.target.value);
              setTestDataError('');
            }}
            placeholder='{\n  "userId": "test-user-123",\n  "vehicleId": "vehicle-456",\n  "options": ["leather", "sunroof"]\n}'
            error={!!testDataError}
            helperText={testDataError || 'Provide test data as JSON object'}
          />
          {testDataError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {testDataError}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};