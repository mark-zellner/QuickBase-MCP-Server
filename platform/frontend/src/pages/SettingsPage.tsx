import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Profile
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Name: {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email: {user?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Role: {user?.role}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Email notifications"
              />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-save codepages"
              />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch />}
                label="Dark mode"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};