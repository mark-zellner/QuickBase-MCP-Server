import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Storage as TableIcon,
} from '@mui/icons-material';
import { TableDefinition } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';

interface TableManagerProps {
  selectedTableId: string | null;
  onTableSelect: (tableId: string) => void;
}

interface TableInfo {
  id: string;
  name: string;
  description?: string;
  fieldCount: number;
  recordCount: number;
  createdDate?: string;
  modifiedDate?: string;
}

export const TableManager: React.FC<TableManagerProps> = ({
  selectedTableId,
  onTableSelect,
}) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/schema/tables');
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load tables');
      }

      const tableList = response.data.data || [];
      const enrichedTables: TableInfo[] = [];

      for (const table of tableList) {
        try {
          // Get additional table information
          const infoResponse = await apiClient.get(`/api/schema/tables/${table.id}`);
          const fieldsResponse = await apiClient.get(`/api/schema/tables/${table.id}/fields`);
          
          const tableInfo = infoResponse.data.success ? infoResponse.data.data : {};
          const fieldCount = fieldsResponse.data.success ? fieldsResponse.data.data.length : 0;

          enrichedTables.push({
            id: table.id,
            name: table.name,
            description: table.description || tableInfo.description,
            fieldCount,
            recordCount: tableInfo.recordCount || 0,
            createdDate: tableInfo.createdDate,
            modifiedDate: tableInfo.modifiedDate,
          });
        } catch (err) {
          console.warn(`Failed to enrich table ${table.id}:`, err);
          enrichedTables.push({
            id: table.id,
            name: table.name,
            description: table.description,
            fieldCount: 0,
            recordCount: 0,
          });
        }
      }

      setTables(enrichedTables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = () => {
    setFormData({ name: '', description: '' });
    setCreateDialogOpen(true);
  };

  const handleEditTable = (table: TableInfo) => {
    setSelectedTable(table);
    setFormData({
      name: table.name,
      description: table.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteTable = (table: TableInfo) => {
    setSelectedTable(table);
    setDeleteDialogOpen(true);
  };

  const submitCreateTable = async () => {
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      const response = await apiClient.post('/api/schema/tables', {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to create table');
      }

      await loadTables();
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });

      // Select the newly created table
      const newTableId = response.data.data?.tableId;
      if (newTableId) {
        onTableSelect(newTableId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEditTable = async () => {
    if (!selectedTable || !formData.name.trim()) return;

    try {
      setSubmitting(true);
      const response = await apiClient.put(`/api/schema/tables/${selectedTable.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to update table');
      }

      await loadTables();
      setEditDialogOpen(false);
      setSelectedTable(null);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update table');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteTable = async () => {
    if (!selectedTable) return;

    try {
      setSubmitting(true);
      const response = await apiClient.delete(`/api/schema/tables/${selectedTable.id}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete table');
      }

      await loadTables();
      setDeleteDialogOpen(false);
      setSelectedTable(null);

      // Clear selection if deleted table was selected
      if (selectedTableId === selectedTable.id) {
        onTableSelect('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
          Table Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTable}
        >
          Create Table
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tables.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <TableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Tables Found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create your first table to get started.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateTable}>
                Create Table
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Fields</TableCell>
                <TableCell align="center">Records</TableCell>
                <TableCell align="center">Created</TableCell>
                <TableCell align="center">Modified</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tables.map((table) => (
                <TableRow 
                  key={table.id}
                  selected={selectedTableId === table.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onTableSelect(table.id)}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <TableIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {table.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {table.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={table.fieldCount} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={table.recordCount.toLocaleString()} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatDate(table.createdDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatDate(table.modifiedDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTableSelect(table.id);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Table">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTable(table);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Table">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Table Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Table</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Table Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitCreateTable} 
            variant="contained"
            disabled={!formData.name.trim() || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Table</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Table Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitEditTable} 
            variant="contained"
            disabled={!formData.name.trim() || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Table</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the table "{selectedTable?.name}"? 
            This action cannot be undone and will permanently remove all data and relationships.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteTable} 
            color="error" 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};