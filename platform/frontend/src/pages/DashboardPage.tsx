import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import { Code, BugReport, Storage, TrendingUp } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const dashboardCards = [
    {
      title: 'Recent Projects',
      description: 'View and manage your codepage projects',
      icon: <Code sx={{ fontSize: 40 }} />,
      action: 'View Projects',
      path: '/projects',
    },
    {
      title: 'Test Results',
      description: 'Review recent test executions and results',
      icon: <BugReport sx={{ fontSize: 40 }} />,
      action: 'View Tests',
      path: '/projects',
    },
    {
      title: 'Schema Management',
      description: 'Manage QuickBase application schemas',
      icon: <Storage sx={{ fontSize: 40 }} />,
      action: 'Manage Schema',
      path: '/schema',
      roles: ['admin', 'manager'],
    },
    {
      title: 'Analytics',
      description: 'View platform usage and performance metrics',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      action: 'View Analytics',
      path: '/analytics',
      roles: ['admin'],
    },
  ];

  const filteredCards = dashboardCards.filter(card => {
    if (!card.roles) return true;
    return card.roles.includes(user?.role || '');
  });

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome back, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your QuickBase codepage projects and applications from your dashboard.
      </Typography>

      <Grid container spacing={3}>
        {filteredCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {card.icon}
                  <Typography variant="h6" component="h2" sx={{ ml: 2 }}>
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" href={card.path}>
                  {card.action}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};