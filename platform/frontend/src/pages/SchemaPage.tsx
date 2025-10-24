import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { SchemaVisualization } from '../components/SchemaVisualization';
import { TableManager } from '../components/TableManager';
import { FieldManager } from '../components/FieldManager';
import { RelationshipManager } from '../components/RelationshipManager';
import { SchemaChangeLog } from '../components/SchemaChangeLog';
import { SchemaApprovalWorkflow } from '../components/SchemaApprovalWorkflow';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schema-tabpanel-${index}`}
      aria-labelledby={`schema-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `schema-tab-${index}`,
    'aria-controls': `schema-tabpanel-${index}`,
  };
}

export const SchemaPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize schema data loading
    const initializeSchema = async () => {
      try {
        setLoading(true);
        setError(null);
        // Schema data will be loaded by individual components
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schema data');
      } finally {
        setLoading(false);
      }
    };

    initializeSchema();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    setTabValue(1); // Switch to table management tab
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Schema Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="schema management tabs">
            <Tab label="Schema Overview" {...a11yProps(0)} />
            <Tab label="Tables" {...a11yProps(1)} />
            <Tab label="Fields" {...a11yProps(2)} />
            <Tab label="Relationships" {...a11yProps(3)} />
            <Tab label="Change Log" {...a11yProps(4)} />
            <Tab label="Approvals" {...a11yProps(5)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <SchemaVisualization 
            onTableSelect={handleTableSelect}
            selectedTableId={selectedTableId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableManager 
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <FieldManager 
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <RelationshipManager 
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <SchemaChangeLog 
            selectedTableId={selectedTableId}
            onRefresh={() => {
              // Refresh other components when changes are made
              window.location.reload();
            }}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <SchemaApprovalWorkflow 
            onApprovalComplete={() => {
              // Refresh other components when approvals are completed
              window.location.reload();
            }}
          />
        </TabPanel>
      </Card>
    </Box>
  );
};