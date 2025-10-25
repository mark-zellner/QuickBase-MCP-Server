import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pending as PendingIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { SchemaChange } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface SchemaApprovalWorkflowProps {
  onApprovalComplete?: () => void;
}

interface PendingChange extends SchemaChange {
  authorName?: string;
  tableName?: string;
  approvals: ApprovalRecord[];
  requiredApprovals: number;
  currentStep: number;
}

interface ApprovalRecord {
  id: string;
  changeId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp: Date;
}

interface ApprovalStep {
  name: string;
  description: string;
  requiredRole: string[];
  minApprovals: number;
}

const APPROVAL_STEPS: ApprovalStep[] = [
  {
    name: 'Technical Review',
    description: 'Review by development team for technical feasibility',
    requiredRole: ['developer', 'admin'],
    minApprovals: 1,
  },
  {
    name: 'Manager Approval',
    description: 'Approval by manager for business impact',
    requiredRole: ['manager', 'admin'],
    minApprovals: 1,
  },
  {
    name: 'Final Approval',
    description: 'Final approval by administrator',
    requiredRole: ['admin'],
    minApprovals: 1,
  },
];

const CHANGE_TYPE_LABELS: Record<string, string> = {
  table_create: 'Table Creation',
  table_update: 'Table Update',
  table_delete: 'Table Deletion',
  field_create: 'Field Creation',
  field_update: 'Field Update',
  field_delete: 'Field Deletion',
  relationship_create: 'Relationship Creation',
  relationship_delete: 'Relationship Deletion',
};

export const SchemaApprovalWorkflow: React.FC<SchemaApprovalWorkflowProps> = ({
  onApprovalComplete,
}) => {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadPendingChanges();
  }, []);

  const loadPendingChanges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get pending schema changes
      const response = await apiClient.get('/api/schema/approvals/pending');
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load pending changes');
      }

      const changeList = response.data.data || [];
      
      // Enrich changes with additional information
      const enrichedChanges: PendingChange[] = await Promise.all(
        changeList.map(async (change: any) => {
          try {
            // Get author information
            const authorResponse = await apiClient.get(`/api/users/${change.authorId}`);
            const authorName = authorResponse.data.success ? 
              authorResponse.data.data.name : 
              `User ${change.authorId}`;

            // Get table name if available
            let tableName = change.tableId;
            if (change.tableId) {
              try {
                const tableResponse = await apiClient.get(`/api/schema/tables/${change.tableId}`);
                if (tableResponse.data.success) {
                  tableName = tableResponse.data.data.name;
                }
              } catch {
                // Ignore table name lookup errors
              }
            }

            // Get approval records
            const approvalsResponse = await apiClient.get(`/api/schema/approvals/${change.id}`);
            const approvals = approvalsResponse.data.success ? approvalsResponse.data.data : [];

            return {
              ...change,
              authorName,
              tableName,
              approvals,
              requiredApprovals: getRequiredApprovals(change.type),
              currentStep: getCurrentApprovalStep(approvals),
              timestamp: new Date(change.timestamp),
            };
          } catch (err) {
            return {
              ...change,
              authorName: `User ${change.authorId}`,
              tableName: change.tableId,
              approvals: [],
              requiredApprovals: getRequiredApprovals(change.type),
              currentStep: 0,
              timestamp: new Date(change.timestamp),
            };
          }
        })
      );

      setPendingChanges(enrichedChanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending changes');
    } finally {
      setLoading(false);
    }
  };

  const getRequiredApprovals = (changeType: string): number => {
    // More critical changes require more approvals
    switch (changeType) {
      case 'table_delete':
      case 'field_delete':
        return 3; // All steps
      case 'table_create':
      case 'relationship_create':
        return 2; // Technical + Manager
      default:
        return 1; // Technical only
    }
  };

  const getCurrentApprovalStep = (approvals: ApprovalRecord[]): number => {
    // Determine current step based on approvals received
    const approvedSteps = APPROVAL_STEPS.map((step, index) => {
      const stepApprovals = approvals.filter(approval => 
        approval.status === 'approved' && 
        step.requiredRole.includes(approval.approverRole)
      );
      return stepApprovals.length >= step.minApprovals;
    });

    return approvedSteps.findIndex(approved => !approved);
  };

  const canUserApprove = (change: PendingChange): boolean => {
    if (!user) return false;
    
    const currentStep = APPROVAL_STEPS[change.currentStep];
    if (!currentStep) return false;

    // Check if user has required role
    if (!currentStep.requiredRole.includes(user.role)) return false;

    // Check if user hasn't already approved this change
    const userApproval = change.approvals.find(approval =>
      approval.approverId === user.id
    );
    
    return !userApproval || userApproval.status === 'pending';
  };

  const handleApproval = (change: PendingChange, action: 'approve' | 'reject') => {
    setSelectedChange(change);
    setApprovalAction(action);
    setComments('');
    setApprovalDialogOpen(true);
  };

  const submitApproval = async () => {
    if (!selectedChange || !user) return;

    try {
      setSubmitting(true);
      
      const response = await apiClient.post(`/api/schema/approvals/${selectedChange.id}`, {
        action: approvalAction,
        comments: comments.trim() || undefined,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to submit approval');
      }

      await loadPendingChanges();
      if (onApprovalComplete) {
        onApprovalComplete();
      }
      
      setApprovalDialogOpen(false);
      setSelectedChange(null);
      setComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setSubmitting(false);
    }
  };

  const getApprovalProgress = (change: PendingChange) => {
    const totalSteps = Math.min(change.requiredApprovals, APPROVAL_STEPS.length);
    const completedSteps = change.currentStep === -1 ? totalSteps : change.currentStep;
    return `${completedSteps}/${totalSteps}`;
  };

  const isChangeFullyApproved = (change: PendingChange) => {
    return change.currentStep === -1 || change.currentStep >= change.requiredApprovals;
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Schema Change Approval Workflow
        </Typography>
        <Button
          variant="outlined"
          onClick={loadPendingChanges}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {pendingChanges.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <PendingIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Pending Approvals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All schema changes have been processed.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {pendingChanges.map((change) => (
            <Card key={change.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {CHANGE_TYPE_LABELS[change.type] || change.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Table: {change.tableName || change.tableId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Author: {change.authorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submitted: {formatTimestamp(change.timestamp)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Chip 
                      label={`Progress: ${getApprovalProgress(change)}`}
                      color={isChangeFullyApproved(change) ? 'success' : 'primary'}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                {/* Approval Steps */}
                <Stepper activeStep={change.currentStep} orientation="vertical">
                  {APPROVAL_STEPS.slice(0, change.requiredApprovals).map((step, index) => (
                    <Step key={step.name}>
                      <StepLabel>
                        {step.name}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {step.description}
                        </Typography>
                        
                        {/* Show approvals for this step */}
                        <List dense>
                          {change.approvals
                            .filter(approval => step.requiredRole.includes(approval.approverRole))
                            .map((approval) => (
                              <ListItem key={approval.id}>
                                <ListItemIcon>
                                  {approval.status === 'approved' ? (
                                    <ApproveIcon color="success" />
                                  ) : approval.status === 'rejected' ? (
                                    <RejectIcon color="error" />
                                  ) : (
                                    <PendingIcon color="warning" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={approval.approverName}
                                  secondary={
                                    <Box>
                                      <Typography variant="caption" display="block">
                                        {approval.approverRole} • {formatTimestamp(approval.timestamp)}
                                      </Typography>
                                      {approval.comments && (
                                        <Typography variant="caption" display="block">
                                          "{approval.comments}"
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                        </List>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>

                {/* Risk Assessment */}
                {(change.type === 'table_delete' || change.type === 'field_delete') && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>High Risk Change:</strong> This operation will permanently delete data.
                      Extra approval steps are required.
                    </Typography>
                  </Alert>
                )}
              </CardContent>

              {canUserApprove(change) && (
                <CardActions>
                  <Button
                    startIcon={<ApproveIcon />}
                    color="success"
                    onClick={() => handleApproval(change, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    startIcon={<RejectIcon />}
                    color="error"
                    onClick={() => handleApproval(change, 'reject')}
                  >
                    Reject
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
        </Box>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? 'Approve' : 'Reject'} Schema Change
        </DialogTitle>
        <DialogContent>
          {selectedChange && (
            <Box>
              <Typography gutterBottom>
                {approvalAction === 'approve' 
                  ? 'Are you sure you want to approve this schema change?'
                  : 'Are you sure you want to reject this schema change?'
                }
              </Typography>
              
              <Box mt={2} mb={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Change:</strong> {CHANGE_TYPE_LABELS[selectedChange.type] || selectedChange.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Table:</strong> {selectedChange.tableName || selectedChange.tableId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Author:</strong> {selectedChange.authorName}
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comments (Optional)"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Add any comments about your approval...'
                    : 'Please explain why you are rejecting this change...'
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitApproval} 
            color={approvalAction === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 
             (approvalAction === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};