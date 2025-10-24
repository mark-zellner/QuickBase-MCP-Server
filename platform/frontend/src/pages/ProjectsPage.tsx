import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  PlayArrow as TestIcon,
  CloudUpload as DeployIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectCreationDialog } from '../components/ProjectCreationDialog';
import { projectService, templateService } from '../services';
import { CreateProjectInput, ProjectStatus } from '../types/shared.js';

export const ProjectsPage: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State management
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; projectId: string } | null>(null);

  // Fetch projects
  const { data: projectsResponse, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects', searchQuery, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.query = searchQuery;
      if (statusFilter !== 'all') params.filters = { status: statusFilter };
      return await projectService.getProjects(params);
    },
  });

  // Fetch templates for project creation
  const { data: templatesResponse } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      // Get both public templates and built-in templates
      const [publicResponse, builtInTemplates] = await Promise.all([
        templateService.getPublicTemplates(),
        templateService.getDealershipTemplates(),
      ]);
      
      return {
        data: [...(publicResponse.data || []), ...builtInTemplates],
      };
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      return await projectService.createProject(input);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['projects']);
      setCreateDialogOpen(false);
      // Navigate to the new project's editor
      if (response.data) {
        navigate(`/projects/${response.data.id}/editor`);
      }
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await projectService.deleteProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setMenuAnchor(null);
    },
  });

  const projects = projectsResponse?.data || [];
  const templates = templatesResponse?.data || [];

  const filteredProjects = projects.filter((project: any) => {
    const matchesSearch = !searchQuery || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (input: CreateProjectInput) => {
    await createProjectMutation.mutateAsync(input);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'deployed':
        return 'success';
      case 'testing':
        return 'warning';
      case 'development':
      default:
        return 'default';
    }
  };

  const handleStatusFilterChange = (_: React.SyntheticEvent, newValue: ProjectStatus | 'all') => {
    setStatusFilter(newValue);
  };

  if (projectsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Codepage Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Project
        </Button>
      </Box>

      {/* Error Display */}
      {projectsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading projects: {(projectsError as any).message}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Tabs
          value={statusFilter}
          onChange={handleStatusFilterChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Projects" value="all" />
          <Tab label="Development" value="development" />
          <Tab label="Testing" value="testing" />
          <Tab label="Deployed" value="deployed" />
        </Tabs>
      </Box>

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {filteredProjects.map((project: any) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
                    {project.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor({ element: e.currentTarget, projectId: project.id })}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {project.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={project.status}
                    color={getStatusColor(project.status)}
                    size="small"
                  />
                  {project.collaborators.length > 0 && (
                    <Chip
                      label={`${project.collaborators.length} collaborator${project.collaborators.length > 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<CodeIcon />}
                  onClick={() => navigate(`/projects/${project.id}/editor`)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<TestIcon />}
                  onClick={() => navigate(`/projects/${project.id}/testing`)}
                >
                  Test
                </Button>
                {project.status === 'deployed' && (
                  <Button
                    size="small"
                    startIcon={<DeployIcon />}
                    color="success"
                    disabled
                  >
                    Live
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {filteredProjects.length === 0 && !projectsLoading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery || statusFilter !== 'all' ? 'No projects found' : 'No projects yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first codepage project to get started'
            }
          </Typography>
          {!searchQuery && statusFilter === 'all' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Project
            </Button>
          )}
        </Box>
      )}

      {/* Project Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              navigate(`/projects/${menuAnchor.projectId}/editor`);
            }
            setMenuAnchor(null);
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Edit Project
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              handleDeleteProject(menuAnchor.projectId);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Project
        </MenuItem>
      </Menu>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateProject}
        templates={templates}
        isLoading={createProjectMutation.isLoading}
        error={(createProjectMutation.error as any)?.message}
      />
    </>
  );
};