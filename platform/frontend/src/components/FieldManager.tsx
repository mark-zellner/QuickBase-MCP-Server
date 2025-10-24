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
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ViewColumn as FieldIcon,
} from '@mui/icons-material';
import { FieldDefinition, QuickBaseFieldType } from '../../../shared/src/types/schema';
import { apiClient } from '../services/apiClient';

interface FieldManagerProps {
  selectedTableId: string | null;
  onTableSelect: (tableId: string) => void;
}

interface FieldInfo extends FieldDefinition {
  id: number;
  tableId: string;
  tableName?: string;
}

interface TableOption {
  id: string;
  name: string;
}

const FIELD_TYPES: { value: QuickBaseFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text' },
  { value: 'text_multiline', label: 'Multi-line Text', description: 'Multiple lines of text' },
  { value: 'text_choice', label: 'Multiple Choice', description: 'Dropdown with predefined options' },
  { value: 'richtext', label: 'Rich Text', description: 'Formatted text with HTML' },
  { value: 'numeric', label: 'Numeric', description: 'Numbers with decimal places' },
  { value: 'currency', label: 'Currency', description: 'Monetary values' },
  { value: 'percent', label: 'Percent', description: 'Percentage values' },
  { value: 'date', label: 'Date', description: 'Date only' },
  { value: 'datetime', label: 'Date/Time', description: 'Date and time' },
  { value: 'checkbox', label: 'Checkbox', description: 'True/false values' },
  { value: 'email', label: 'Email', description: 'Email addresses' },
  { value: 'phone', label: 'Phone', description: 'Phone numbers' },
  { value: 'url', label: 'URL', description: 'Web addresses' },
  { value: 'address', label: 'Address', description: 'Physical addresses' },
  { value: 'file', label: 'File Attachment', description: 'File uploads' },
  { value: 'lookup', label: 'Lookup', description: 'Values from related tables' },
  { value: 'formula', label: 'Formula', description: 'Calculated values' },
  { value: 'reference', label: 'Reference', description: 'Links to other records' },
];

export const FieldManager: React.FC<FieldManagerProps> = ({
  selectedTableId,
  onTableSelect,
}) => {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldInfo | null>(null);
  const [formData, setFormData] = useState<Partial<FieldDefinition>>({
    label: '',
    fieldType: 'text',
    required: false,
    unique: false,
    choices: [],
    formula: '',
    lookupTableId: '',
    lookupFieldId: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTableId) {
      loadFields(selectedTableId);
    } else {
      setFields([]);
    }
  }, [selectedTableId]);

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

  const loadFields = async (tableId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/api/schema/tables/${tableId}/fields`);
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load fields');
      }

      const fieldList = response.data.data || [];
      const enrichedFields: FieldInfo[] = fieldList.map((field: any) => ({
        ...field,
        tableId,
        tableName: tables.find(t => t.id === tableId)?.name,
      }));

      setFields(enrichedFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      label: '',
      fieldType: 'text',
      required: false,
      unique: false,
      choices: [],
      formula: '',
      lookupTableId: '',
      lookupFieldId: undefined,
    });
  };

  const handleCreateField = () => {
    resetFormData();
    setCreateDialogOpen(true);
  };

  const handleEditField = (field: FieldInfo) => {
    setSelectedField(field);
    setFormData({
      label: field.label,
      fieldType: field.fieldType,
      required: field.required || false,
      unique: field.unique || false,
      choices: field.choices || [],
      formula: field.formula || '',
      lookupTableId: field.lookupTableId || '',
      lookupFieldId: field.lookupFieldId,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteField = (field: FieldInfo) => {
    setSelectedField(field);
    setDeleteDialogOpen(true);
  };

  const submitCreateField = async () => {
    if (!selectedTableId || !formData.label?.trim()) return;

    try {
      setSubmitting(true);
      const response = await apiClient.post(`/api/schema/tables/${selectedTableId}/fields`, formData);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to create field');
      }

      await loadFields(selectedTableId);
      setCreateDialogOpen(false);
      resetFormData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create field');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEditField = async () => {
    if (!selectedField || !formData.label?.trim()) return;

    try {
      setSubmitting(true);
      const response = await apiClient.put(
        `/api/schema/tables/${selectedField.tableId}/fields/${selectedField.id}`,
        formData
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to update field');
      }

      await loadFields(selectedField.tableId);
      setEditDialogOpen(false);
      setSelectedField(null);
      resetFormData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteField = async () => {
    if (!selectedField) return;

    try {
      setSubmitting(true);
      const response = await apiClient.delete(
        `/api/schema/tables/${selectedField.tableId}/fields/${selectedField.id}`
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete field');
      }

      await loadFields(selectedField.tableId);
      setDeleteDialogOpen(false);
      setSelectedField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldTypeInfo = (fieldType: QuickBaseFieldType) => {
    return FIELD_TYPES.find(ft => ft.value === fieldType) || FIELD_TYPES[0];
  };

  const renderFieldTypeSpecificInputs = () => {
    switch (formData.fieldType) {
      case 'text_choice':
        return (
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={formData.choices || []}
            onChange={(_, newValue) => setFormData({ ...formData, choices: newValue })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Choice Options"
                placeholder="Type and press Enter to add choices"
                helperText="Enter the available choices for this field"
              />
            )}
          />
        );

      case 'formula':
        return (
          <TextField
            margin="dense"
            label="Formula"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={formData.formula || ''}
            onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
            helperText="Enter the QuickBase formula expression"
          />
        );

      case 'lookup':
        return (
          <>
            <FormControl fullWidth margin="dense">
              <InputLabel>Lookup Table</InputLabel>
              <Select
                value={formData.lookupTableId || ''}
                onChange={(e) => setFormData({ ...formData, lookupTableId: e.target.value })}
                label="Lookup Table"
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
              label="Lookup Field ID"
              fullWidth
              variant="outlined"
              type="number"
              value={formData.lookupFieldId || ''}
              onChange={(e) => setFormData({ ...formData, lookupFieldId: parseInt(e.target.value) || undefined })}
              helperText="Field ID from the lookup table to display"
            />
          </>
        );

      default:
        return null;
    }
  };

  if (!selectedTableId) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <FieldIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Table Selected
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select a table to manage its fields.
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
          Field Management
          {selectedTableId && (
            <Typography variant="body2" color="text.secondary">
              Table: {tables.find(t => t.id === selectedTableId)?.name || selectedTableId}
            </Typography>
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateField}
          disabled={!selectedTableId}
        >
          Add Field
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
      ) : fields.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <FieldIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Fields Found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Add fields to define the structure of your table.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateField}>
                Add Field
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Field Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Required</TableCell>
                <TableCell align="center">Unique</TableCell>
                <TableCell>Properties</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <FieldIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {field.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getFieldTypeInfo(field.fieldType).label}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {field.required ? (
                      <Chip label="Required" size="small" color="error" />
                    ) : (
                      <Chip label="Optional" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {field.unique ? (
                      <Chip label="Unique" size="small" color="warning" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      {field.fieldType === 'text_choice' && field.choices && (
                        <Typography variant="caption" color="text.secondary">
                          {field.choices.length} choices
                        </Typography>
                      )}
                      {field.fieldType === 'lookup' && field.lookupTableId && (
                        <Typography variant="caption" color="text.secondary">
                          Lookup: {tables.find(t => t.id === field.lookupTableId)?.name || field.lookupTableId}
                        </Typography>
                      )}
                      {field.fieldType === 'formula' && (
                        <Typography variant="caption" color="text.secondary">
                          Formula field
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Field">
                      <IconButton 
                        size="small"
                        onClick={() => handleEditField(field)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Field">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteField(field)}
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

      {/* Create Field Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Field</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Field Name"
              fullWidth
              variant="outlined"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
            />

            <FormControl fullWidth margin="dense">
              <InputLabel>Field Type</InputLabel>
              <Select
                value={formData.fieldType || 'text'}
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as QuickBaseFieldType })}
                label="Field Type"
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography variant="body2">{type.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {renderFieldTypeSpecificInputs()}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.required || false}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  />
                }
                label="Required Field"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.unique || false}
                    onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
                  />
                }
                label="Unique Values"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitCreateField} 
            variant="contained"
            disabled={!formData.label?.trim() || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Field</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Field Name"
              fullWidth
              variant="outlined"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
            />

            <FormControl fullWidth margin="dense">
              <InputLabel>Field Type</InputLabel>
              <Select
                value={formData.fieldType || 'text'}
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as QuickBaseFieldType })}
                label="Field Type"
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography variant="body2">{type.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {renderFieldTypeSpecificInputs()}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.required || false}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  />
                }
                label="Required Field"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.unique || false}
                    onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
                  />
                }
                label="Unique Values"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitEditField} 
            variant="contained"
            disabled={!formData.label?.trim() || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Field</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the field "{selectedField?.label}"? 
            This action cannot be undone and will permanently remove all data in this field.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteField} 
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