import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  History as HistoryIcon,
  Undo as UndoIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  Error as FailedIcon,
} from '@mui/icons-material';
import { SchemaChange } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';

interface SchemaChangeLogProps {
  selectedTableId?: string | null;
  onRefresh?: () => void;
}

interface SchemaChangeInfo extends SchemaChange {
  authorName?: string;
  tableName?: string;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  table_create: 'Table Created',
  table_update: 'Table Updated',
  table_delete: 'Table Deleted',
  field_create: 'Field Created',
  field_update: 'Field Updated',
  field_delete: 'Field Deleted',
  relationship_create: 'Relationship Created',
  relationship_delete: 'Relationship Deleted',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  applied: 'success',
  failed: 'error',
  rolled_back: 'secondary',
};

export const SchemaChangeLog: React.FC<SchemaChangeLogProps> = ({
  selectedTableId,
  onRefresh,
}) => {
  const [changes, setChanges] = useState<SchemaChangeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<SchemaChangeInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    changeType: '',
    status: '',
    author: '',
  });

  useEffect(() => {
    loadChangeLog();
  }, [selectedTableId]);

  const loadChangeLog = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedTableId) {
        params.append('tableId', selectedTableId);
      }
      params.append('limit', '100');

      const response = await apiClient.get(`/api/schema/changelog?${params.toString()}`);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load change log');
      }

      const changeList = response.data.data || [];
      
      // Enrich changes with additional information
      const enrichedChanges: SchemaChangeInfo[] = await Promise.all(
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

            return {
              ...change,
              authorName,
              tableName,
              timestamp: new Date(change.timestamp),
            };
          } catch (err) {
            return {
              ...change,
              authorName: `User ${change.authorId}`,
              tableName: change.tableId,
              timestamp: new Date(change.timestamp),
            };
          }
        })
      );

      setChanges(enrichedChanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load change log');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = (change: SchemaChangeInfo) => {
    setSelectedChange(change);
    setRollbackDialogOpen(true);
  };

  const handleViewDetails = (change: SchemaChangeInfo) => {
    setSelectedChange(change);
    setDetailsDialogOpen(true);
  };

  const confirmRollback = async () => {
    if (!selectedChange) return;

    try {
      setSubmitting(true);
      const response = await apiClient.post(`/api/schema/rollback/${selectedChange.id}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to rollback change');
      }

      await loadChangeLog();
      if (onRefresh) {
        onRefresh();
      }
      
      setRollbackDialogOpen(false);
      setSelectedChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback change');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredChanges = () => {
    return changes.filter(change => {
      if (filters.changeType && change.type !== filters.changeType) return false;
      if (filters.status && change.status !== filters.status) return false;
      if (filters.author && !change.authorName?.toLowerCase().includes(filters.author.toLowerCase())) return false;
      return true;
    });
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const canRollback = (change: SchemaChangeInfo) => {
    return change.status === 'applied' && change.rollbackData;
  };

  const renderChangeDetails = (change: SchemaChangeInfo) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Change Details
        </Typography>
        
        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Change ID: {change.id}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Type: {CHANGE_TYPE_LABELS[change.type] || change.type}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Table: {change.tableName || change.tableId}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Author: {change.authorName}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Timestamp: {formatTimestamp(change.timestamp)}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Status: <Chip label={change.status} color={STATUS_COLORS[change.status]} size="small" />
          </Typography>
        </Box>

        {change.fieldId && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Field ID: {change.fieldId}
          </Typography>
        )}

        {change.relationshipId && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Relationship ID: {change.relationshipId}
          </Typography>
        )}

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Changes Made</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
            }}>
              {JSON.stringify(change.changes, null, 2)}
            </pre>
          </AccordionDetails>
        </Accordion>

        {change.rollbackData && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Rollback Data</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
              }}>
                {JSON.stringify(change.rollbackData, null, 2)}
              </pre>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  const filteredChanges = getFilteredChanges();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Schema Change Log
          {selectedTableId && (
            <Typography variant="body2" color="text.secondary">
              Showing changes for selected table
            </Typography>
          )}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={loadChangeLog}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Change Type</InputLabel>
              <Select
                value={filters.changeType}
                onChange={(e) => setFilters({ ...filters, changeType: e.target.value })}
                label="Change Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="applied">Applied</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="rolled_back">Rolled Back</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Author"
              value={filters.author}
              onChange={(e) => setFilters({ ...filters, author: e.target.value })}
              sx={{ minWidth: 150 }}
            />

            <Button
              variant="outlined"
              onClick={() => setFilters({ changeType: '', status: '', author: '' })}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {filteredChanges.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Changes Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {changes.length === 0 
                  ? 'No schema changes have been made yet.'
                  : 'No changes match the current filters.'
                }
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Author</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredChanges.map((change) => (
                <TableRow key={change.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(change.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {CHANGE_TYPE_LABELS[change.type] || change.type}
                    </Typography>
                    {change.fieldId && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Field ID: {change.fieldId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {change.tableName || change.tableId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {change.authorName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={change.status}
                      color={STATUS_COLORS[change.status]}
                      size="small"
                      icon={
                        change.status === 'applied' ? <ApprovedIcon /> :
                        change.status === 'failed' ? <FailedIcon /> :
                        change.status === 'rolled_back' ? <UndoIcon /> :
                        <PendingIcon />
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => handleViewDetails(change)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {canRollback(change) && (
                      <Tooltip title="Rollback Change">
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => handleRollback(change)}
                        >
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onClose={() => setRollbackDialogOpen(false)}>
        <DialogTitle>Rollback Schema Change</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to rollback this schema change?
          </Typography>
          {selectedChange && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                <strong>Change:</strong> {CHANGE_TYPE_LABELS[selectedChange.type] || selectedChange.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Table:</strong> {selectedChange.tableName || selectedChange.tableId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Author:</strong> {selectedChange.authorName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Timestamp:</strong> {formatTimestamp(selectedChange.timestamp)}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The rollback will attempt to restore the previous state.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmRollback} 
            color="warning" 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Rollback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Change Details</DialogTitle>
        <DialogContent>
          {selectedChange && renderChangeDetails(selectedChange)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};