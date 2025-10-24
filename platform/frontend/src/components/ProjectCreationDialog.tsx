import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { CodepageTemplate, CreateProjectInput } from '../types/shared.js';
import { TemplateSelector } from './TemplateSelector';

interface ProjectCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (project: CreateProjectInput) => Promise<void>;
  templates: CodepageTemplate[];
  isLoading?: boolean;
  error?: string;
}

const steps = ['Select Template', 'Project Details'];

export const ProjectCreationDialog: React.FC<ProjectCreationDialogProps> = ({
  open,
  onClose,
  onCreate,
  templates,
  isLoading = false,
  error,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<CodepageTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleReset = () => {
    setActiveStep(0);
    setSelectedTemplate(null);
    setProjectName('');
    setProjectDescription('');
    setValidationErrors({});
    setShowTemplateSelector(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleTemplateSelect = (template: CodepageTemplate) => {
    setSelectedTemplate(template);
    setProjectName(`${template.name} Project`);
    setActiveStep(1);
  };

  const validateProjectDetails = (): boolean => {
    const errors: Record<string, string> = {};

    if (!projectName.trim()) {
      errors.name = 'Project name is required';
    } else if (projectName.length > 100) {
      errors.name = 'Project name must be 100 characters or less';
    }

    if (projectDescription.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !validateProjectDetails()) {
      return;
    }

    try {
      await onCreate({
        name: projectName.trim(),
        description: projectDescription.trim(),
        templateId: selectedTemplate.id,
      });
      handleClose();
    } catch (err) {
      // Error handling is done by parent component
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setShowTemplateSelector(true);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  return (
    <>
      <Dialog
        open={open && !showTemplateSelector}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            Create New Codepage Project
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Choose a Template
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a template to get started with your codepage project. Templates provide
                pre-built functionality and best practices for common use cases.
              </Typography>

              {selectedTemplate ? (
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CodeIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">{selectedTemplate.name}</Typography>
                      <Chip
                        label={selectedTemplate.category}
                        size="small"
                        color="primary"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTemplate.description}
                    </Typography>
                    {selectedTemplate.dependencies.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Dependencies: {selectedTemplate.dependencies.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => setShowTemplateSelector(true)}
                >
                  <CodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select a Template
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click here to browse available templates
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Project Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Provide details for your new codepage project.
              </Typography>

              <TextField
                fullWidth
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                error={!!validationErrors.name}
                helperText={validationErrors.name || 'Enter a descriptive name for your project'}
                sx={{ mb: 2 }}
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                fullWidth
                label="Description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                error={!!validationErrors.description}
                helperText={
                  validationErrors.description ||
                  `Optional description (${projectDescription.length}/500 characters)`
                }
                multiline
                rows={3}
                inputProps={{ maxLength: 500 }}
              />

              {selectedTemplate && (
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Template
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">{selectedTemplate.name}</Typography>
                      <Chip
                        label={selectedTemplate.category}
                        size="small"
                        color="primary"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Back</Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isLoading || (activeStep === 0 && !selectedTemplate)}
          >
            {activeStep === steps.length - 1 ? 'Create Project' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
        templates={templates}
      />
    </>
  );
};