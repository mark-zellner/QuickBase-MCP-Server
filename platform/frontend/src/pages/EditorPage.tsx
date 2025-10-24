import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Toolbar,
  Button,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as RunIcon,
  History as HistoryIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  CloudUpload as DeployIcon,
  ArrowBack as BackIcon,
  MoreVert as MoreIcon,
  People as CollaboratorsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CodeEditor } from '../components/CodeEditor';
import { projectService, collaborationService } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface CollaboratorUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [code, setCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [isConnectedToCollaboration, setIsConnectedToCollaboration] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [versionDialog, setVersionDialog] = useState(false);
  const [versionChangelog, setVersionChangelog] = useState('');

  // Fetch project data
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await projectService.getProject(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  // Fetch current code
  const { isLoading: codeLoading } = useQuery({
    queryKey: ['project-code', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await projectService.getCode(projectId);
      return response.data;
    },
    enabled: !!projectId,
    onSuccess: (data) => {
      setCode(data?.code || '');
    },
  });

  // Fetch project versions
  useQuery({
    queryKey: ['project-versions', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await projectService.getProjectVersions(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  // Save code mutation
  const saveCodeMutation = useMutation({
    mutationFn: async (codeToSave: string) => {
      if (!projectId) throw new Error('Project ID is required');
      return await projectService.saveCode(projectId, codeToSave);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      showSnackbar('Code saved successfully', 'success');
      queryClient.invalidateQueries(['project-code', projectId]);
    },
    onError: (error: any) => {
      showSnackbar(`Error saving code: ${error.message}`, 'error');
    },
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async ({ changelog }: { changelog: string }) => {
      if (!projectId) throw new Error('Project ID is required');
      return await projectService.createVersion({
        projectId,
        code,
        changelog,
      });
    },
    onSuccess: () => {
      setVersionDialog(false);
      setVersionChangelog('');
      showSnackbar('Version created successfully', 'success');
      queryClient.invalidateQueries(['project-versions', projectId]);
    },
    onError: (error: any) => {
      showSnackbar(`Error creating version: ${error.message}`, 'error');
    },
  });

  // Deploy project mutation
  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      return await projectService.deployProject(projectId);
    },
    onSuccess: () => {
      showSnackbar('Project deployed successfully', 'success');
      queryClient.invalidateQueries(['project', projectId]);
    },
    onError: (error: any) => {
      showSnackbar(`Error deploying project: ${error.message}`, 'error');
    },
  });

  // Initialize collaboration
  useEffect(() => {
    if (projectId && user) {
      const initCollaboration = async () => {
        try {
          await collaborationService.connect(projectId, user.id);
          setIsConnectedToCollaboration(true);

          // Set up collaboration event handlers
          const unsubscribeUserJoined = collaborationService.onUserJoined((userId) => {
            // Add user to collaborators list (in real implementation, fetch user details)
            const newCollaborator: CollaboratorUser = {
              id: userId,
              name: `User ${userId.slice(0, 8)}`,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            };
            setCollaborators(prev => [...prev.filter(c => c.id !== userId), newCollaborator]);
          });

          const unsubscribeUserLeft = collaborationService.onUserLeft((userId) => {
            setCollaborators(prev => prev.filter(c => c.id !== userId));
          });

          const unsubscribeCursorPosition = collaborationService.onCursorPosition((userId, line, column) => {
            setCollaborators(prev => prev.map(c => 
              c.id === userId ? { ...c, cursor: { line, column } } : c
            ));
          });

          // Cleanup on unmount
          return () => {
            unsubscribeUserJoined();
            unsubscribeUserLeft();
            unsubscribeCursorPosition();
            collaborationService.disconnect();
          };
        } catch (error) {
          console.error('Failed to connect to collaboration service:', error);
        }
      };

      initCollaboration();
    }

    return () => {
      collaborationService.disconnect();
    };
  }, [projectId, user]);

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setHasUnsavedChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    saveCodeMutation.mutate(code);
  }, [code, saveCodeMutation]);

  // Handle run/test
  const handleRun = useCallback(() => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/testing`);
  }, [projectId, navigate]);

  // Show snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle version creation
  const handleCreateVersion = () => {
    if (!versionChangelog.trim()) {
      showSnackbar('Please enter a changelog for this version', 'warning');
      return;
    }
    createVersionMutation.mutate({ changelog: versionChangelog });
  };

  if (projectLoading || codeLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (projectError || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading project: {(projectError as any)?.message || 'Project not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Toolbar */}
      <Paper elevation={1} sx={{ zIndex: 1 }}>
        <Toolbar>
          <IconButton onClick={() => navigate('/projects')} sx={{ mr: 1 }}>
            <BackIcon />
          </IconButton>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div">
              {project.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {project.description}
            </Typography>
          </Box>

          {/* Status Indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Chip
              label={project.status}
              color={project.status === 'deployed' ? 'success' : 'default'}
              size="small"
            />
            {hasUnsavedChanges && (
              <Chip label="Unsaved" color="warning" size="small" />
            )}
            {isConnectedToCollaboration && (
              <Tooltip title="Connected to collaboration">
                <CollaboratorsIcon color="success" fontSize="small" />
              </Tooltip>
            )}
          </Box>

          {/* Action Buttons */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<RunIcon />}
            onClick={handleRun}
            sx={{ mr: 1 }}
          >
            Test
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveCodeMutation.isLoading}
            sx={{ mr: 1 }}
          >
            Save
          </Button>

          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            size="small"
          >
            <MoreIcon />
          </IconButton>
        </Toolbar>
      </Paper>

      {/* Main Editor */}
      <Box sx={{ flex: 1, p: 1 }}>
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          onSave={handleSave}
          onRun={handleRun}
          collaborators={collaborators}
          isLoading={saveCodeMutation.isLoading}
          error={(projectError as any)?.message}
        />
      </Box>

      {/* More Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setVersionDialog(true); setMenuAnchor(null); }}>
          <HistoryIcon sx={{ mr: 1 }} />
          Create Version
        </MenuItem>
        <MenuItem onClick={() => { deployMutation.mutate(); setMenuAnchor(null); }}>
          <DeployIcon sx={{ mr: 1 }} />
          Deploy
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ShareIcon sx={{ mr: 1 }} />
          Share Project
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <SettingsIcon sx={{ mr: 1 }} />
          Project Settings
        </MenuItem>
      </Menu>

      {/* Version Creation Dialog */}
      <Dialog open={versionDialog} onClose={() => setVersionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Version</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Changelog"
            multiline
            rows={4}
            value={versionChangelog}
            onChange={(e) => setVersionChangelog(e.target.value)}
            placeholder="Describe the changes in this version..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateVersion}
            disabled={createVersionMutation.isLoading}
          >
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};