import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Save,
  Cancel,
  FileCopy,
} from '@mui/icons-material';

interface MockDataSet {
  id: string;
  name: string;
  description: string;
  data: Record<string, any>;
  category: 'vehicle' | 'customer' | 'pricing' | 'inventory' | 'custom';
  createdAt: Date;
}

interface MockDataManagerProps {
  onDataSetSelect: (dataSet: MockDataSet) => void;
  selectedDataSet?: MockDataSet;
}

export const MockDataManager: React.FC<MockDataManagerProps> = ({
  onDataSetSelect,
  selectedDataSet,
}) => {
  const [dataSets, setDataSets] = useState<MockDataSet[]>([
    {
      id: '1',
      name: 'Sample Vehicle Data',
      description: 'Basic vehicle information for pricing calculator',
      category: 'vehicle',
      data: {
        vehicleId: 'VEH001',
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        basePrice: 28000,
        options: ['leather', 'sunroof', 'navigation'],
        inventory: 15
      },
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Customer Profile',
      description: 'Sample customer data for testing forms',
      category: 'customer',
      data: {
        customerId: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0123',
        creditScore: 750,
        preferredContact: 'email'
      },
      createdAt: new Date('2024-01-16'),
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState<MockDataSet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as MockDataSet['category'],
    data: '{}',
  });
  const [jsonError, setJsonError] = useState('');

  const handleOpenDialog = (dataSet?: MockDataSet) => {
    if (dataSet) {
      setEditingDataSet(dataSet);
      setFormData({
        name: dataSet.name,
        description: dataSet.description,
        category: dataSet.category,
        data: JSON.stringify(dataSet.data, null, 2),
      });
    } else {
      setEditingDataSet(null);
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        data: '{}',
      });
    }
    setJsonError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDataSet(null);
    setJsonError('');
  };

  const handleSave = () => {
    // Validate JSON
    let parsedData;
    try {
      parsedData = JSON.parse(formData.data);
    } catch (error) {
      setJsonError('Invalid JSON format');
      return;
    }

    const newDataSet: MockDataSet = {
      id: editingDataSet?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      category: formData.category,
      data: parsedData,
      createdAt: editingDataSet?.createdAt || new Date(),
    };

    if (editingDataSet) {
      setDataSets(prev => prev.map(ds => ds.id === editingDataSet.id ? newDataSet : ds));
    } else {
      setDataSets(prev => [...prev, newDataSet]);
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setDataSets(prev => prev.filter(ds => ds.id !== id));
    if (selectedDataSet?.id === id) {
      onDataSetSelect(dataSets[0] || dataSets.find(ds => ds.id !== id)!);
    }
  };

  const handleDuplicate = (dataSet: MockDataSet) => {
    const duplicated: MockDataSet = {
      ...dataSet,
      id: Date.now().toString(),
      name: `${dataSet.name} (Copy)`,
      createdAt: new Date(),
    };
    setDataSets(prev => [...prev, duplicated]);
  };

  const getCategoryColor = (category: MockDataSet['category']) => {
    switch (category) {
      case 'vehicle': return 'primary';
      case 'customer': return 'secondary';
      case 'pricing': return 'success';
      case 'inventory': return 'warning';
      default: return 'default';
    }
  };

  const getPresetTemplates = () => {
    return {
      vehicle: {
        vehicleId: 'VEH001',
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        basePrice: 28000,
        options: ['leather', 'sunroof'],
        inventory: 10
      },
      customer: {
        customerId: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0123',
        creditScore: 750
      },
      pricing: {
        basePrice: 25000,
        options: {
          leather: 2000,
          sunroof: 1500,
          navigation: 1200
        },
        discounts: {
          loyalty: 0.05,
          seasonal: 0.03
        },
        taxRate: 0.08
      },
      inventory: {
        vehicles: [
          { id: 'VEH001', make: 'Toyota', model: 'Camry', count: 5 },
          { id: 'VEH002', make: 'Honda', model: 'Accord', count: 3 }
        ],
        lastUpdated: new Date().toISOString()
      }
    };
  };

  const loadTemplate = (category: MockDataSet['category']) => {
    const templates = getPresetTemplates();
    setFormData(prev => ({
      ...prev,
      category,
      data: JSON.stringify(templates[category] || {}, null, 2)
    }));
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            Mock Data Sets
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Data Set
          </Button>
        </Box>

        {dataSets.length === 0 ? (
          <Alert severity="info">
            No mock data sets available. Create one to get started.
          </Alert>
        ) : (
          <List>
            {dataSets.map((dataSet) => (
              <ListItem
                key={dataSet.id}
                button
                selected={selectedDataSet?.id === dataSet.id}
                onClick={() => onDataSetSelect(dataSet)}
                sx={{ 
                  border: 1, 
                  borderColor: selectedDataSet?.id === dataSet.id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {dataSet.name}
                      </Typography>
                      <Chip 
                        label={dataSet.category} 
                        size="small" 
                        color={getCategoryColor(dataSet.category) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {dataSet.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created: {dataSet.createdAt.toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(dataSet);
                    }}
                  >
                    <FileCopy />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(dataSet);
                    }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dataSet.id);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Selected Data Preview */}
        {selectedDataSet && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                Preview: {selectedDataSet.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(selectedDataSet.data, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingDataSet ? 'Edit Mock Data Set' : 'Create Mock Data Set'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as MockDataSet['category'] }))}
                  SelectProps={{ native: true }}
                >
                  <option value="vehicle">Vehicle</option>
                  <option value="customer">Customer</option>
                  <option value="pricing">Pricing</option>
                  <option value="inventory">Inventory</option>
                  <option value="custom">Custom</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2">Data (JSON)</Typography>
                  <Button
                    size="small"
                    onClick={() => loadTemplate(formData.category)}
                  >
                    Load Template
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={formData.data}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, data: e.target.value }));
                    setJsonError('');
                  }}
                  error={!!jsonError}
                  helperText={jsonError}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              startIcon={<Save />}
              disabled={!formData.name || !!jsonError}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};