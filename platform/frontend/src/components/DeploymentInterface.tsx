import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  RocketLaunch as DeployIcon,
  Undo as RollbackIcon,
  Timeline as PipelineIcon,
  Cloud as EnvironmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  Approval as ApprovalIcon,
} from '@mui/icons-material';

// Types (would be imported from shared types in real implementation)
interface DeploymentEnvironment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  description: string;
  quickbaseAppId: string;
  quickbaseTableId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DeploymentRecord {
  id: string;
  projectId: string;
  versionId: string;
  environmentId: string;
  deployedBy: string;
  deployedByName: string;
  status: 'pending' | 'in_progress' | 'deployed' | 'failed' | 'rolled_back';
  deploymentType: 'initial' | 'update' | 'rollback';
  quickbaseRecordId?: number;
  deploymentUrl?: string;
  deploymentLog: string[];
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  rollbackVersionId?: string;
  rollbackReason?: string;
}

interface DeploymentPipeline {
  id: string;
  projectId: string;
  name: string;
  environments: string[];
  autoPromote: boolean;
  requiresApproval: boolean;
  approvers: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

interface DeploymentApproval {
  id: string;
  deploymentId: string;
  environmentId: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  requestedAt: Date;
  respondedAt?: Date;
}

interface DeploymentInterfaceProps {
  projectId: string;
  versionId?: string;
  onDeploymentComplete?: (deployment: DeploymentRecord) => void;
}

export const DeploymentInterface: React.FC<DeploymentInterfaceProps> = ({
  projectId,
  versionId,
  onDeploymentComplete,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [pipelines, setPipelines] = useState<DeploymentPipeline[]>([]);
  const [approvals, setApprovals] = useState<DeploymentApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [deployDialog, setDeployDialog] = useState(false);
  const [rollbackDialog, setRollbackDialog] = useState(false);
  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [logDialog, setLogDialog] = useState(false);

  // Form states
  const [deploymentData, setDeploymentData] = useState({
    environmentId: '',
    deploymentType: 'update' as 'initial' | 'update',
  });
  const [rollbackData, setRollbackData] = useState({
    deploymentId: '',
    targetVersionId: '',
    reason: '',
  });
  const [pipelineData, setPipelineData] = useState({
    name: '',
    environments: [] as string[],
    autoPromote: false,
    requiresApproval: true,
    approvers: [] as string[],
  });
  const [selectedDeploymentLog, setSelectedDeploymentLog] = useState<string[]>([]);

  useEffect(() => {
    loadDeploymentData();
  }, [projectId]);

  const loadDeploymentData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load environments
      const environmentsResponse = await fetch('/api/v1/deployment/environments');
      if (environmentsResponse.ok) {
        const environmentsData = await environmentsResponse.json();
        setEnvironments(environmentsData.data.environments || []);
      }

      // Load deployments for this project
      const deploymentsResponse = await fetch(
        `/api/v1/deployment/deployments?projectId=${projectId}`
      );
      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        setDeployments(deploymentsData.data.deployments || []);
      }

      // Load pipelines for this project
      const pipelinesResponse = await fetch(
        `/api/v1/deployment/pipelines?projectId=${projectId}`
      );
      if (pipelinesResponse.ok) {
        const pipelinesData = await pipelinesResponse.json();
        setPipelines(pipelinesData.data.pipelines || []);
      }

      // Load pending approvals
      const approvalsResponse = await fetch('/api/v1/deployment/approvals');
      if (approvalsResponse.ok) {
        const approvalsData = await approvalsResponse.json();
        setApprovals(approvalsData.data.approvals || []);
      }
    } catch (err) {
      setError('Failed to load deployment data');
      console.error('Error loading deployment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!versionId) {
      setError('No version selected for deployment');
      return;
    }

    try {
      const response = await fetch('/api/v1/deployment/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          versionId,
          ...deploymentData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newDeployment = data.data.deployment;
        setDeployments(prev => [newDeployment, ...prev]);
        setDeployDialog(false);
        setDeploymentData({ environmentId: '', deploymentType: 'update' });
        
        if (onDeploymentComplete) {
          onDeploymentComplete(newDeployment);
        }
      } else {
        throw new Error('Failed to create deployment');
      }
    } catch (err) {
      setError('Failed to create deployment');
      console.error('Error creating deployment:', err);
    }
  };

  const handleRollback = async () => {
    try {
      const response = await fetch(`/api/v1/deployment/deployments/${rollbackData.deploymentId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVersionId: rollbackData.targetVersionId || undefined,
          reason: rollbackData.reason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeployments(prev => [data.data.deployment, ...prev]);
        setRollbackDialog(false);
        setRollbackData({ deploymentId: '', targetVersionId: '', reason: '' });
        loadDeploymentData(); // Reload to update statuses
      } else {
        throw new Error('Failed to rollback deployment');
      }
    } catch (err) {
      setError('Failed to rollback deployment');
      console.error('Error rolling back deployment:', err);
    }
  };

  const handleCreatePipeline = async () => {
    try {
      const response = await fetch('/api/v1/deployment/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          ...pipelineData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPipelines(prev => [...prev, data.data.pipeline]);
        setPipelineDialog(false);
        setPipelineData({
          name: '',
          environments: [],
          autoPromote: false,
          requiresApproval: true,
          approvers: [],
        });
      } else {
        throw new Error('Failed to create pipeline');
      }
    } catch (err) {
      setError('Failed to create pipeline');
      console.error('Error creating pipeline:', err);
    }
  };

  const handleDeployToPipeline = async (pipelineId: string) => {
    if (!versionId) {
      setError('No version selected for deployment');
      return;
    }

    try {
      const response = await fetch(`/api/v1/deployment/pipelines/${pipelineId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ versionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeployments(prev => [...data.data.deployments, ...prev]);
        loadDeploymentData(); // Reload to get updated data
      } else {
        throw new Error('Failed to deploy to pipeline');
      }
    } catch (err) {
      setError('Failed to deploy to pipeline');
      console.error('Error deploying to pipeline:', err);
    }
  };

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/v1/deployment/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        loadDeploymentData(); // Reload to update approvals
      } else {
        throw new Error(`Failed to ${action} deployment`);
      }
    } catch (err) {
      setError(`Failed to ${action} deployment`);
      console.error(`Error ${action}ing deployment:`, err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'rolled_back':
        return <RollbackIcon color="warning" />;
      case 'in_progress':
        return <PendingIcon color="info" />;
      case 'pending':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const getEnvironmentColor = (type: string) => {
    switch (type) {
      case 'production':
        return 'error';
      case 'staging':
        return 'warning';
      case 'development':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const renderDeployments = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Deployments</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDeploymentData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DeployIcon />}
            onClick={() => setDeployDialog(true)}
            disabled={!versionId}
          >
            Deploy
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress />}

      <List>
        {deployments.map((deployment, index) => {
          const environment = environments.find(env => env.id === deployment.environmentId);
          
          return (
            <React.Fragment key={deployment.id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(deployment.status)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {environment?.name || 'Unknown Environment'}
                      </Typography>
                      <Chip
                        label={environment?.type || 'unknown'}
                        size="small"
                        color={getEnvironmentColor(environment?.type || 'default') as any}
                      />
                      <Chip
                        label={deployment.deploymentType}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Version: {deployment.versionId} | Status: {deployment.status}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        By {deployment.deployedByName} on {formatDate(deployment.startedAt)}
                        {deployment.completedAt && ` | Completed: ${formatDate(deployment.completedAt)}`}
                      </Typography>
                      {deployment.errorMessage && (
                        <Typography variant="caption" color="error">
                          Error: {deployment.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedDeploymentLog(deployment.deploymentLog);
                        setLogDialog(true);
                      }}
                    >
                      View Log
                    </Button>
                    {deployment.status === 'deployed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<RollbackIcon />}
                        onClick={() => {
                          setRollbackData(prev => ({ ...prev, deploymentId: deployment.id }));
                          setRollbackDialog(true);
                        }}
                      >
                        Rollback
                      </Button>
                    )}
                    {deployment.deploymentUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        href={deployment.deploymentUrl}
                        target="_blank"
                      >
                        Open
                      </Button>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < deployments.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  const renderPipelines = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Deployment Pipelines</Typography>
        <Button
          variant="contained"
          startIcon={<PipelineIcon />}
          onClick={() => setPipelineDialog(true)}
        >
          Create Pipeline
        </Button>
      </Box>

      <Grid container spacing={2}>
        {pipelines.map(pipeline => (
          <Grid item xs={12} md={6} key={pipeline.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {pipeline.name}
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Environments:
                  </Typography>
                  <Stepper orientation="vertical" sx={{ pl: 2 }}>
                    {pipeline.environments.map((envId, index) => {
                      const env = environments.find(e => e.id === envId);
                      return (
                        <Step key={envId} active={true}>
                          <StepLabel>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">
                                {env?.name || 'Unknown'}
                              </Typography>
                              <Chip
                                label={env?.type || 'unknown'}
                                size="small"
                                color={getEnvironmentColor(env?.type || 'default') as any}
                              />
                            </Box>
                          </StepLabel>
                        </Step>
                      );
                    })}
                  </Stepper>
                </Box>
                <Box display="flex" gap={1} mb={2}>
                  {pipeline.autoPromote && (
                    <Chip label="Auto-promote" size="small" color="success" />
                  )}
                  {pipeline.requiresApproval && (
                    <Chip label="Requires approval" size="small" color="warning" />
                  )}
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DeployIcon />}
                  onClick={() => handleDeployToPipeline(pipeline.id)}
                  disabled={!versionId}
                >
                  Deploy to Pipeline
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderApprovals = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Approvals
      </Typography>

      {approvals.length === 0 ? (
        <Alert severity="info">No pending approvals</Alert>
      ) : (
        <List>
          {approvals.map(approval => {
            const environment = environments.find(env => env.id === approval.environmentId);
            
            return (
              <ListItem key={approval.id}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <ApprovalIcon color="warning" />
                      <Typography variant="subtitle1">
                        Deployment to {environment?.name || 'Unknown Environment'}
                      </Typography>
                      <Chip
                        label={environment?.type || 'unknown'}
                        size="small"
                        color={getEnvironmentColor(environment?.type || 'default') as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      Requested by {approval.requestedBy} on {formatDate(approval.requestedAt)}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleApproval(approval.id, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):');
                        handleApproval(approval.id, 'reject', reason || undefined);
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Deployments" />
          <Tab label="Pipelines" />
          <Tab label="Approvals" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && renderDeployments()}
        {activeTab === 1 && renderPipelines()}
        {activeTab === 2 && renderApprovals()}
      </Box>

      {/* Deploy Dialog */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)}>
        <DialogTitle>Deploy Version</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={deploymentData.environmentId}
              onChange={(e) => setDeploymentData(prev => ({ ...prev, environmentId: e.target.value }))}
            >
              {environments.map(env => (
                <MenuItem key={env.id} value={env.id}>
                  {env.name} ({env.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Deployment Type</InputLabel>
            <Select
              value={deploymentData.deploymentType}
              onChange={(e) => setDeploymentData(prev => ({ ...prev, deploymentType: e.target.value as any }))}
            >
              <MenuItem value="initial">Initial Deployment</MenuItem>
              <MenuItem value="update">Update Deployment</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>Cancel</Button>
          <Button onClick={handleDeploy} variant="contained">Deploy</Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialog} onClose={() => setRollbackDialog(false)}>
        <DialogTitle>Rollback Deployment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Target Version ID (optional)"
            value={rollbackData.targetVersionId}
            onChange={(e) => setRollbackData(prev => ({ ...prev, targetVersionId: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            helperText="Leave empty to rollback to previous version"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rollback Reason"
            value={rollbackData.reason}
            onChange={(e) => setRollbackData(prev => ({ ...prev, reason: e.target.value }))}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialog(false)}>Cancel</Button>
          <Button onClick={handleRollback} variant="contained" color="warning">Rollback</Button>
        </DialogActions>
      </Dialog>

      {/* Create Pipeline Dialog */}
      <Dialog open={pipelineDialog} onClose={() => setPipelineDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Deployment Pipeline</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Pipeline Name"
            value={pipelineData.name}
            onChange={(e) => setPipelineData(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Environments</InputLabel>
            <Select
              multiple
              value={pipelineData.environments}
              onChange={(e) => setPipelineData(prev => ({ ...prev, environments: e.target.value as string[] }))}
            >
              {environments.map(env => (
                <MenuItem key={env.id} value={env.id}>
                  {env.name} ({env.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Add more pipeline configuration fields as needed */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPipelineDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePipeline} variant="contained">Create Pipeline</Button>
        </DialogActions>
      </Dialog>

      {/* Deployment Log Dialog */}
      <Dialog open={logDialog} onClose={() => setLogDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Deployment Log</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace' }}>
            {selectedDeploymentLog.map((logEntry, index) => (
              <Typography key={index} variant="body2" component="div">
                {logEntry}
              </Typography>
            ))}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};