import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Calculate as CalculateIcon,
  Dashboard as DashboardIcon,
  Assignment as FormIcon,
  Build as UtilityIcon,
} from '@mui/icons-material';
import type { CodepageTemplate, TemplateCategory } from '../../../shared/src/types/template';

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: CodepageTemplate) => void;
  templates: CodepageTemplate[];
  isLoading?: boolean;
}

const categoryIcons: Record<TemplateCategory, React.ReactElement> = {
  calculator: <CalculateIcon />,
  form: <FormIcon />,
  dashboard: <DashboardIcon />,
  utility: <UtilityIcon />,
};

const categoryLabels: Record<TemplateCategory, string> = {
  calculator: 'Calculators',
  form: 'Forms',
  dashboard: 'Dashboards',
  utility: 'Utilities',
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  onSelect,
  templates,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = (template.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryChange = (_: React.SyntheticEvent, newValue: TemplateCategory | 'all') => {
    setSelectedCategory(newValue);
  };

  const handleTemplateSelect = (template: CodepageTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon />
          Select a Template
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Search and Filter */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Tabs
            value={selectedCategory}
            onChange={handleCategoryChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All Templates" value="all" />
            <Tab
              label={categoryLabels.calculator}
              value="calculator"
              icon={categoryIcons.calculator}
              iconPosition="start"
            />
            <Tab
              label={categoryLabels.form}
              value="form"
              icon={categoryIcons.form}
              iconPosition="start"
            />
            <Tab
              label={categoryLabels.dashboard}
              value="dashboard"
              icon={categoryIcons.dashboard}
              iconPosition="start"
            />
            <Tab
              label={categoryLabels.utility}
              value="utility"
              icon={categoryIcons.utility}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Template Grid */}
        <Grid container spacing={2}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {template.category && categoryIcons[template.category]}
                    <Typography variant="h6" component="h3" sx={{ ml: 1, flex: 1 }}>
                      {template.name || 'Unnamed Template'}
                    </Typography>
                    {template.category && (
                      <Chip
                        label={categoryLabels[template.category]}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.description || 'No description available'}
                  </Typography>

                  {template.dependencies && template.dependencies.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Dependencies:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {template.dependencies.map((dep: string, index: number) => (
                          <Chip
                            key={index}
                            label={dep}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                    <Typography variant="caption" color="text.secondary">
                      {template.isPublic ? 'Public Template' : 'Private Template'}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template);
                    }}
                  >
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredTemplates.length === 0 && !isLoading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No templates found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};