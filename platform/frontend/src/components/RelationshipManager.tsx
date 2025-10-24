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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as RelationshipIcon,
  ArrowForward as ArrowIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { RelationshipDefinition } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';

interface RelationshipManagerProps {
  selectedTableId: string | null;
  onTableSelect: (tableId: string) => void;
}

interface RelationshipInfo extends RelationshipDefinition {
  id: string;
  parentTableName?: string;
  childTableName?: string;
}

interface TableOption {
  id: string;
  name: string;
}

interface FieldOption {
  id: number;
  label: string;
  fieldType: string;
}

interface LookupFieldConfig {
  parentFieldId: number;
  childFieldLabel: string;
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  selectedTableId,
  onTableSelect,
}) => {
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [parentFields, setParentFields] = useState<FieldOption[]>([]);
  const [childFields, setChildFields] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipInfo | null>(null);
  const [formData, setFormData] = useState<{
    parentTableId: string;
    childTableId: string;
    foreignKeyFieldId: number | '';
    type: 'one-to-many' | 'many-to-many';
    referenceFieldLabel: string;
    lookupFields: LookupFieldConfig[];
  }>({
    parentTableId: '',
    childTableId: '',
    foreignKeyFieldId: '',
    type: 'one-to-many',
    referenceFieldLabel: '',
    lookupFields: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTableId) {
      loadRelationships(selectedTableId);
    } else {
      setRelationships([]);
    }
  }, [selectedTableId]);

  useEffect(() => {
    if (formData.parentTableId) {
      loadTableFields(formData.parentTableId, 'parent');
    }
  }, [formData.parentTableId]);

  useEffect(() => {
    if (formData.childTableId) {
      loadTableFields(formData.childTableId, 'child');
    }
  }, [formData.childTableId]);

  const loadTables = async () => {
    try {
      const response = await apiClient.get('/api/schema/tables');
      if (response.data.success) {
        setTables(response.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to load tables:', err);
    }
  };

  const loadTableFields = async (tableId: string, type: 'parent' | 'child') => {
    try {
      const response = await apiClient.get(`/api/schema/tables/${tableId}/fields`);
      if (response.data.success) {
        const fields = response.data.data || [];
        const fieldOptions = fields.map((field: any) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
        }));

        if (type === 'parent') {
          setParentFields(fieldOptions);
        } else {
          setChildFields(fieldOptions);
        }
      }
    } catch (err) {
      console.warn(`Failed to load ${type} fields:`, err);
    }
  };

  const loadRelationships = async (tableId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/api/schema/tables/${tableId}/relationships`);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load relationships');
      }

      const relationshipList = response.data.data || [];
      const enrichedRelationships: RelationshipInfo[] = relationshipList.map((rel: any) => ({
        ...rel,
        parentTableName: tables.find(t => t.id === rel.parentTableId)?.name,
        childTableName: tables.find(t => t.id === rel.childTableId)?.name,
      }));

      setRelationships(enrichedRelationships);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      parentTableId: '',
      childTableId: '',
      foreignKeyFieldId: '',
      type: 'one-to-many',
      referenceFieldLabel: '',
      lookupFields: [],
    });
    setParentFields([]);
    setChildFields([]);
  };

  const handleCreateRelationship = () => {
    resetFormData();
    setCreateDialogOpen(true);
  };

  const handleDeleteRelationship = (relationship: RelationshipInfo) => {
    setSelectedRelationship(relationship);
    setDeleteDialogOpen(true);
  };

  const addLookupField = () => {
    setFormData({
      ...formData,
      lookupFields: [
        ...formData.lookupFields,
        { parentFieldId: 0, childFieldLabel: '' },
      ],
    });
  };

  const updateLookupField = (index: number, field: Partial<LookupFieldConfig>) => {
    const updatedLookupFields = [...formData.lookupFields];
    updatedLookupFields[index] = { ...updatedLookupFields[index], ...field };
    setFormData({ ...formData, lookupFields: updatedLookupFields });
  };

  const removeLookupField = (index: number) => {
    const updatedLookupFields = formData.lookupFields.filter((_, i) => i !== index);
    setFormData({ ...formData, lookupFields: updatedLookupFields });
  };

  const submitCreateRelationship = async () => {
    if (!formData.parentTableId || !formData.childTableId || !formData.referenceFieldLabel.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        parentTableId: formData.parentTableId,
        childTableId: formData.childTableId,
        referenceFieldLabel: formData.referenceFieldLabel.trim(),
        relationshipType: formData.type,
        lookupFields: formData.lookupFields.filter(lf => 
          lf.parentFieldId > 0 && lf.childFieldLabel.trim()
        ),
      };

      const response = await apiClient.post('/api/schema/relationships', payload);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to create relationship');
      }

      // Reload relationships for both tables
      if (selectedTableId) {
        await loadRelationships(selectedTableId);
      }
      
      setCreateDialogOpen(false);
      resetFormData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteRelationship = async () => {
    if (!selectedRelationship) return;

    try {
      setSubmitting(true);
      const response = await apiClient.delete(`/api/schema/relationships/${selectedRelationship.id}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete relationship');
      }

      if (selectedTableId) {
        await loadRelationships(selectedTableId);
      }
      
      setDeleteDialogOpen(false);
      setSelectedRelationship(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
    } finally {
      setSubmitting(false);
    }
  };

  const getRelationshipDirection = (relationship: RelationshipInfo) => {
    if (!selectedTableId) return 'Unknown';
    
    if (relationship.parentTableId === selectedTableId) {
      return `Parent of ${relationship.childTableName || relationship.childTableId}`;
    } else if (relationship.childTableId === selectedTableId) {
      return `Child of ${relationship.parentTableName || relationship.parentTableId}`;
    }
    return 'Related';
  };

  if (!selectedTableId) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <RelationshipIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Table Selected
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select a table to manage its relationships.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Relationship Management
          {selectedTableId && (
            <Typography variant="body2" color="text.secondary">
              Table: {tables.find(t => t.id === selectedTableId)?.name || selectedTableId}
            </Typography>
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateRelationship}
          disabled={!selectedTableId}
        >
          Create Relationship
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : relationships.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <RelationshipIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Relationships Found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create relationships to connect this table with other tables.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateRelationship}>
                Create Relationship
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Relationship</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Lookup Fields</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relationships.map((relationship) => (
                <TableRow key={relationship.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <RelationshipIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {relationship.parentTableName || relationship.parentTableId}
                          <ArrowIcon sx={{ mx: 1, fontSize: 16 }} />
                          {relationship.childTableName || relationship.childTableId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {relationship.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={relationship.type || 'one-to-many'}
                      size="small"
                      variant="outlined"
                      color={relationship.type === 'many-to-many' ? 'secondary' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getRelationshipDirection(relationship)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {relationship.lookupFields && relationship.lookupFields.length > 0 ? (
                      <Chip 
                        label={`${relationship.lookupFields.length} lookup fields`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No lookup fields
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Delete Relationship">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteRelationship(relationship)}
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

      {/* Create Relationship Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Relationship</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Parent Table</InputLabel>
              <Select
                value={formData.parentTableId}
                onChange={(e) => setFormData({ ...formData, parentTableId: e.target.value })}
                label="Parent Table"
              >
                {tables.map((table) => (
                  <MenuItem key={table.id} value={table.id}>
                    {table.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Child Table</InputLabel>
              <Select
                value={formData.childTableId}
                onChange={(e) => setFormData({ ...formData, childTableId: e.target.value })}
                label="Child Table"
              >
                {tables.map((table) => (
                  <MenuItem key={table.id} value={table.id}>
                    {table.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Reference Field Label"
              fullWidth
              variant="outlined"
              value={formData.referenceFieldLabel}
              onChange={(e) => setFormData({ ...formData, referenceFieldLabel: e.target.value })}
              helperText="Name for the reference field that will be created in the child table"
              required
            />

            <FormControl fullWidth margin="dense">
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'one-to-many' | 'many-to-many' })}
                label="Relationship Type"
              >
                <MenuItem value="one-to-many">One-to-Many</MenuItem>
                <MenuItem value="many-to-many">Many-to-Many</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Lookup Fields (Optional)</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addLookupField}
                disabled={!formData.parentTableId || parentFields.length === 0}
              >
                Add Lookup Field
              </Button>
            </Box>

            {formData.lookupFields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Lookup fields allow you to display data from the parent table in the child table.
              </Typography>
            ) : (
              <List>
                {formData.lookupFields.map((lookupField, index) => (
                  <ListItem key={index} divider>
                    <Box sx={{ width: '100%' }}>
                      <Box display="flex" gap={2} alignItems="center">
                        <FormControl sx={{ minWidth: 200 }}>
                          <InputLabel>Parent Field</InputLabel>
                          <Select
                            value={lookupField.parentFieldId || ''}
                            onChange={(e) => updateLookupField(index, { parentFieldId: Number(e.target.value) })}
                            label="Parent Field"
                            size="small"
                          >
                            {parentFields.map((field) => (
                              <MenuItem key={field.id} value={field.id}>
                                {field.label} ({field.fieldType})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <TextField
                          label="Child Field Label"
                          value={lookupField.childFieldLabel}
                          onChange={(e) => updateLookupField(index, { childFieldLabel: e.target.value })}
                          size="small"
                          sx={{ flexGrow: 1 }}
                        />
                        
                        <IconButton
                          color="error"
                          onClick={() => removeLookupField(index)}
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitCreateRelationship} 
            variant="contained"
            disabled={
              !formData.parentTableId || 
              !formData.childTableId || 
              !formData.referenceFieldLabel.trim() || 
              submitting
            }
          >
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Relationship</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this relationship? 
            This action cannot be undone and may affect related lookup fields.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteRelationship} 
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