import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccountTree as RelationshipIcon,
  Storage as TableIcon,
} from '@mui/icons-material';
import { TableDefinition, FieldDefinition, RelationshipDefinition } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';

interface SchemaVisualizationProps {
  onTableSelect: (tableId: string) => void;
  selectedTableId: string | null;
}

interface TableInfo {
  id: string;
  name: string;
  description?: string;
  fieldCount: number;
  recordCount: number;
  relationships: RelationshipDefinition[];
}

export const SchemaVisualization: React.FC<SchemaVisualizationProps> = ({
  onTableSelect,
  selectedTableId,
}) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableInfo | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all tables from QuickBase
      const tablesResponse = await apiClient.get('/api/schema/tables');
      if (!tablesResponse.data.success) {
        throw new Error(tablesResponse.data.error?.message || 'Failed to load tables');
      }

      const tableList = tablesResponse.data.data || [];
      const enrichedTables: TableInfo[] = [];

      // Enrich each table with additional information
      for (const table of tableList) {
        try {
          // Get field count
          const fieldsResponse = await apiClient.get(`/api/schema/tables/${table.id}/fields`);
          const fieldCount = fieldsResponse.data.success ? fieldsResponse.data.data.length : 0;

          // Get relationships
          const relationshipsResponse = await apiClient.get(`/api/schema/tables/${table.id}/relationships`);
          const relationships = relationshipsResponse.data.success ? relationshipsResponse.data.data : [];

          // Get record count (optional - may be slow for large tables)
          let recordCount = 0;
          try {
            const recordsResponse = await apiClient.get(`/api/schema/tables/${table.id}/records/count`);
            recordCount = recordsResponse.data.success ? recordsResponse.data.data.count : 0;
          } catch {
            // Ignore record count errors
          }

          enrichedTables.push({
            id: table.id,
            name: table.name,
            description: table.description,
            fieldCount,
            recordCount,
            relationships,
          });
        } catch (err) {
          console.warn(`Failed to enrich table ${table.id}:`, err);
          enrichedTables.push({
            id: table.id,
            name: table.name,
            description: table.description,
            fieldCount: 0,
            recordCount: 0,
            relationships: [],
          });
        }
      }

      setTables(enrichedTables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table: TableInfo) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      const response = await apiClient.delete(`/api/schema/tables/${tableToDelete.id}`);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete table');
      }

      // Refresh tables list
      await loadTables();
      
      // Clear selection if deleted table was selected
      if (selectedTableId === tableToDelete.id) {
        onTableSelect('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    } finally {
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  const getRelationshipSummary = (relationships: RelationshipDefinition[]) => {
    const parentCount = relationships.filter(r => r.childTableId === selectedTableId).length;
    const childCount = relationships.filter(r => r.parentTableId === selectedTableId).length;
    
    if (parentCount === 0 && childCount === 0) return 'No relationships';
    
    const parts = [];
    if (parentCount > 0) parts.push(`${parentCount} parent${parentCount > 1 ? 's' : ''}`);
    if (childCount > 0) parts.push(`${childCount} child${childCount > 1 ? 'ren' : ''}`);
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadTables}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          QuickBase Application Schema
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* TODO: Open create table dialog */}}
        >
          Create Table
        </Button>
      </Box>

      {tables.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <TableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Tables Found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create your first table to get started with schema management.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Create Table
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {tables.map((table) => (
            <Grid item xs={12} sm={6} md={4} key={table.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: selectedTableId === table.id ? 2 : 1,
                  borderColor: selectedTableId === table.id ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
                onClick={() => onTableSelect(table.id)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TableIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h3" noWrap>
                      {table.name}
                    </Typography>
                  </Box>

                  {table.description && (
                    <Typography variant="body2" color="text.secondary" mb={2} noWrap>
                      {table.description}
                    </Typography>
                  )}

                  <Box mb={2}>
                    <Chip
                      label={`${table.fieldCount} fields`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={`${table.recordCount.toLocaleString()} records`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <RelationshipIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {getRelationshipSummary(table.relationships)}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
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
                        // TODO: Open edit table dialog
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
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Table</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the table "{tableToDelete?.name}"? 
            This action cannot be undone and will permanently remove all data and relationships.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteTable} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};