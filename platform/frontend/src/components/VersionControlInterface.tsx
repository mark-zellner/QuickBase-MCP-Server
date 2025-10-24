import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  Divider,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  History as HistoryIcon,
  Compare as CompareIcon,
  Merge as MergeIcon,
  Tag as TagIcon,
  Branch as BranchIcon,
  Rollback as RollbackIcon,
  Deploy as DeployIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Types (would be imported from shared types in real implementation)
interface VersionControlEntry {
  id: string;
  projectId: string;
  versionNumber: string;
  code: string;
  changelog: string;
  authorId: string;
  authorName: string;
  parentVersionId?: string;
  branchName: string;
  tags: string[];
  commitHash: string;
  createdAt: Date;
  deploymentStatus: 'pending' | 'deployed' | 'failed';
  isActive: boolean;
}

interface BranchInfo {
  name: string;
  projectId: string;
  baseVersionId: string;
  headVersionId: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  description?: string;
}

interface ConflictResolution {
  conflictId: string;
  projectId: string;
  baseVersionId: string;
  incomingVersionId: string;
  conflicts: MergeConflict[];
  resolvedCode?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  status: 'pending' | 'resolved' | 'abandoned';
}

interface MergeConflict {
  id: string;
  startLine: number;
  endLine: number;
  baseContent: string;
  incomingContent: string;
  currentContent: string;
  type: 'content' | 'deletion' | 'addition';
}

interface VersionControlInterfaceProps {
  projectId: string;
  currentVersionId?: string;
  onVersionSelect?: (version: VersionControlEntry) => void;
  onVersionCreate?: (version: VersionControlEntry) => void;
}

export const VersionControlInterface: React.FC<VersionControlInterfaceProps> = ({
  projectId,
  currentVersionId,
  onVersionSelect,
  onVersionCreate,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [versions, setVersions] = useState<VersionControlEntry[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createVersionDialog, setCreateVersionDialog] = useState(false);
  const [createBranchDialog, setCreateBranchDialog] = useState(false);
  const [compareDialog, setCompareDialog] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(false);

  // Form states
  const [newVersionData, setNewVersionData] = useState({
    code: '',
    changelog: '',
    tags: [] as string[],
  });
  const [newBranchData, setNewBranchData] = useState({
    name: '',
    description: '',
    baseVersionId: '',
  });
  const [compareVersions, setCompareVersions] = useState({
    fromVersionId: '',
    toVersionId: '',
  });

  useEffect(() => {
    loadVersionData();
  }, [projectId, selectedBranch]);

  const loadVersionData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load versions for the selected branch
      const versionsResponse = await fetch(
        `/api/v1/version-control/${projectId}/versions?branchName=${selectedBranch}`
      );
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData.data.versions || []);
      }

      // Load branches
      const branchesResponse = await fetch(`/api/v1/version-control/${projectId}/branches`);
      if (branchesResponse.ok) {
        const branchesData = await branchesResponse.json();
        setBranches(branchesData.data.branches || []);
      }

      // Load conflicts
      const conflictsResponse = await fetch(`/api/v1/version-control/${projectId}/conflicts`);
      if (conflictsResponse.ok) {
        const conflictsData = await conflictsResponse.json();
        setConflicts(conflictsData.data.conflicts || []);
      }
    } catch (err) {
      setError('Failed to load version control data');
      console.error('Error loading version data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      const response = await fetch(`/api/v1/version-control/${projectId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newVersionData,
          branchName: selectedBranch,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newVersion = data.data.version;
        setVersions(prev => [newVersion, ...prev]);
        setCreateVersionDialog(false);
        setNewVersionData({ code: '', changelog: '', tags: [] });
        
        if (onVersionCreate) {
          onVersionCreate(newVersion);
        }
      } else {
        throw new Error('Failed to create version');
      }
    } catch (err) {
      setError('Failed to create version');
      console.error('Error creating version:', err);
    }
  };

  const handleCreateBranch = async () => {
    try {
      const response = await fetch(`/api/v1/version-control/${projectId}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchName: newBranchData.name,
          baseVersionId: newBranchData.baseVersionId || versions[0]?.id,
          description: newBranchData.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBranches(prev => [...prev, data.data.branch]);
        setCreateBranchDialog(false);
        setNewBranchData({ name: '', description: '', baseVersionId: '' });
      } else {
        throw new Error('Failed to create branch');
      }
    } catch (err) {
      setError('Failed to create branch');
      console.error('Error creating branch:', err);
    }
  };

  const handleCompareVersions = async () => {
    try {
      const response = await fetch(`/api/v1/version-control/${projectId}/versions/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compareVersions),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle comparison result - would show in a diff viewer
        console.log('Version comparison:', data.data.comparison);
      } else {
        throw new Error('Failed to compare versions');
      }
    } catch (err) {
      setError('Failed to compare versions');
      console.error('Error comparing versions:', err);
    }
  };

  const handleTagVersion = async (versionId: string, tag: string) => {
    try {
      const response = await fetch(`/api/v1/version-control/${projectId}/versions/${versionId}/tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag }),
      });

      if (response.ok) {
        loadVersionData(); // Reload to show updated tags
      } else {
        throw new Error('Failed to tag version');
      }
    } catch (err) {
      setError('Failed to tag version');
      console.error('Error tagging version:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const renderVersionHistory = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Version History - {selectedBranch}</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BranchIcon />}
            onClick={() => setCreateBranchDialog(true)}
            sx={{ mr: 1 }}
          >
            New Branch
          </Button>
          <Button
            variant="contained"
            startIcon={<HistoryIcon />}
            onClick={() => setCreateVersionDialog(true)}
          >
            Create Version
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress />}

      <List>
        {versions.map((version, index) => (
          <React.Fragment key={version.id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {version.versionNumber}
                    </Typography>
                    {getStatusIcon(version.deploymentStatus)}
                    {version.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" color="primary" />
                    ))}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {version.changelog}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By {version.authorName} on {formatDate(version.createdAt)}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondary>
                <Box display="flex" gap={1}>
                  <Tooltip title="Tag Version">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const tag = prompt('Enter tag name:');
                        if (tag) handleTagVersion(version.id, tag);
                      }}
                    >
                      <TagIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Compare">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCompareVersions(prev => ({ ...prev, fromVersionId: version.id }));
                        setCompareDialog(true);
                      }}
                    >
                      <CompareIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onVersionSelect?.(version)}
                  >
                    Select
                  </Button>
                </Box>
              </ListItemSecondary>
            </ListItem>
            {index < versions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  const renderBranches = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Branches</Typography>
        <Button
          variant="contained"
          startIcon={<BranchIcon />}
          onClick={() => setCreateBranchDialog(true)}
        >
          Create Branch
        </Button>
      </Box>

      <Grid container spacing={2}>
        {branches.map(branch => (
          <Grid item xs={12} md={6} key={branch.name}>
            <Card
              variant={branch.name === selectedBranch ? "outlined" : "elevation"}
              sx={{
                cursor: 'pointer',
                border: branch.name === selectedBranch ? 2 : 0,
                borderColor: 'primary.main',
              }}
              onClick={() => setSelectedBranch(branch.name)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {branch.name}
                  {branch.name === 'main' && (
                    <Chip label="Main" size="small" color="primary" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {branch.description || 'No description'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Created by {branch.createdBy} on {formatDate(branch.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderConflicts = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Merge Conflicts
      </Typography>

      {conflicts.length === 0 ? (
        <Alert severity="success">No active conflicts</Alert>
      ) : (
        <List>
          {conflicts.map(conflict => (
            <ListItem key={conflict.conflictId}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WarningIcon color="warning" />
                    <Typography variant="subtitle1">
                      Conflict #{conflict.conflictId.slice(-8)}
                    </Typography>
                    <Chip
                      label={conflict.status}
                      size="small"
                      color={conflict.status === 'resolved' ? 'success' : 'warning'}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {conflict.conflicts.length} conflicts between versions
                  </Typography>
                }
              />
              <ListItemSecondary>
                <Button
                  variant="outlined"
                  startIcon={<MergeIcon />}
                  onClick={() => setConflictDialog(true)}
                  disabled={conflict.status === 'resolved'}
                >
                  Resolve
                </Button>
              </ListItemSecondary>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Version History" />
          <Tab label="Branches" />
          <Tab label="Conflicts" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && renderVersionHistory()}
        {activeTab === 1 && renderBranches()}
        {activeTab === 2 && renderConflicts()}
      </Box>

      {/* Create Version Dialog */}
      <Dialog open={createVersionDialog} onClose={() => setCreateVersionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Version</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Code"
            value={newVersionData.code}
            onChange={(e) => setNewVersionData(prev => ({ ...prev, code: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Changelog"
            value={newVersionData.changelog}
            onChange={(e) => setNewVersionData(prev => ({ ...prev, changelog: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={newVersionData.tags.join(', ')}
            onChange={(e) => setNewVersionData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateVersionDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateVersion} variant="contained">Create Version</Button>
        </DialogActions>
      </Dialog>

      {/* Create Branch Dialog */}
      <Dialog open={createBranchDialog} onClose={() => setCreateBranchDialog(false)}>
        <DialogTitle>Create New Branch</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Branch Name"
            value={newBranchData.name}
            onChange={(e) => setNewBranchData(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={newBranchData.description}
            onChange={(e) => setNewBranchData(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBranchDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateBranch} variant="contained">Create Branch</Button>
        </DialogActions>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={compareDialog} onClose={() => setCompareDialog(false)}>
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="From Version"
            value={compareVersions.fromVersionId}
            onChange={(e) => setCompareVersions(prev => ({ ...prev, fromVersionId: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            SelectProps={{ native: true }}
          >
            <option value="">Select version...</option>
            {versions.map(version => (
              <option key={version.id} value={version.id}>
                {version.versionNumber} - {version.changelog}
              </option>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="To Version"
            value={compareVersions.toVersionId}
            onChange={(e) => setCompareVersions(prev => ({ ...prev, toVersionId: e.target.value }))}
            SelectProps={{ native: true }}
          >
            <option value="">Select version...</option>
            {versions.map(version => (
              <option key={version.id} value={version.id}>
                {version.versionNumber} - {version.changelog}
              </option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>Cancel</Button>
          <Button onClick={handleCompareVersions} variant="contained">Compare</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};