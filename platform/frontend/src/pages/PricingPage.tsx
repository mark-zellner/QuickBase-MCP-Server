import React from 'react';
import {
  Box,
  Container,
  Typography
} from '@mui/material';
import { PricingCalculator } from '../components';

export const PricingPage: React.FC = () => {

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Vehicle Pricing Calculator
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Configure vehicle options, apply discounts and incentives, and generate accurate pricing quotes for customers.
        </Typography>
      </Box>

      <PricingCalculator />
    </Container>
  );
};