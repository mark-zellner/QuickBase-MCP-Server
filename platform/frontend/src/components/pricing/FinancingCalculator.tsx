import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Divider,
  InputAdornment,
  Slider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  TrendingUp as LoanIcon,
  DirectionsCar as LeaseIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { pricingService } from '../../services';
import type { FinancingOption, PriceBreakdown } from '../../types';

interface FinancingCalculatorProps {
  vehicleId: string;
  priceBreakdown: PriceBreakdown;
  onFinancingSelected?: (financing: FinancingOption) => void;
  disabled?: boolean;
}

export const FinancingCalculator: React.FC<FinancingCalculatorProps> = ({
  vehicleId,
  priceBreakdown,
  onFinancingSelected,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [availableOptions, setAvailableOptions] = useState<FinancingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom calculation inputs
  const [customLoan, setCustomLoan] = useState({
    amount: priceBreakdown.amountDue,
    apr: 5.99,
    termMonths: 60,
    downPayment: 0
  });
  
  const [customLease, setCustomLease] = useState({
    amount: priceBreakdown.totalPrice,
    apr: 3.99,
    termMonths: 36,
    downPayment: 0,
    residualValue: priceBreakdown.totalPrice * 0.6 // 60% residual
  });

  const [calculatedPayments, setCalculatedPayments] = useState<{
    loan?: { monthlyPayment: number; totalInterest: number; totalCost: number };
    lease?: { monthlyPayment: number; totalInterest: number; totalCost: number };
  }>({});

  useEffect(() => {
    loadFinancingOptions();
  }, [vehicleId, priceBreakdown.totalPrice]);

  useEffect(() => {
    calculateCustomPayments();
  }, [customLoan, customLease]);

  const loadFinancingOptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options = await pricingService.getFinancingOptions(vehicleId, priceBreakdown.totalPrice);
      setAvailableOptions(options);
    } catch (err) {
      setError('Failed to load financing options');
      console.error('Error loading financing options:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCustomPayments = async () => {
    try {
      const [loanCalc, leaseCalc] = await Promise.all([
        pricingService.calculateFinancing(
          customLoan.amount - customLoan.downPayment,
          customLoan.apr,
          customLoan.termMonths,
          customLoan.downPayment
        ),
        pricingService.calculateFinancing(
          customLease.amount - customLease.residualValue - customLease.downPayment,
          customLease.apr,
          customLease.termMonths,
          customLease.downPayment
        )
      ]);

      setCalculatedPayments({
        loan: loanCalc,
        lease: leaseCalc
      });
    } catch (err) {
      console.error('Error calculating payments:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const renderPresetOptions = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Available Financing Options
      </Typography>
      
      {loading ? (
        <Alert severity="info">Loading financing options...</Alert>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : availableOptions.length === 0 ? (
        <Alert severity="info">No financing options available for this vehicle.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Option</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>APR</TableCell>
                <TableCell>Term</TableCell>
                <TableCell>Down Payment</TableCell>
                <TableCell>Monthly Payment</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableOptions.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{option.name}</Typography>
                      {option.isPromotional && (
                        <Chip label="Promotional" size="small" color="secondary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={option.type === 'loan' ? <LoanIcon /> : <LeaseIcon />}
                      label={option.type.toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatPercentage(option.apr)}</TableCell>
                  <TableCell>{option.termMonths} months</TableCell>
                  <TableCell>{formatPrice(option.downPaymentRequired)}</TableCell>
                  <TableCell>
                    <Typography variant="h6" color="primary">
                      {formatPrice(option.monthlyPayment)}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatPrice(option.totalCost)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onFinancingSelected?.(option)}
                      disabled={disabled}
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderLoanCalculator = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Custom Loan Calculator
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Loan Parameters
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Loan Amount"
                    type="number"
                    value={customLoan.amount}
                    onChange={(e) => setCustomLoan(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Down Payment"
                    type="number"
                    value={customLoan.downPayment}
                    onChange={(e) => setCustomLoan(prev => ({ 
                      ...prev, 
                      downPayment: parseFloat(e.target.value) || 0 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography gutterBottom>APR: {formatPercentage(customLoan.apr)}</Typography>
                  <Slider
                    value={customLoan.apr}
                    onChange={(_, value) => setCustomLoan(prev => ({ 
                      ...prev, 
                      apr: value as number 
                    }))}
                    min={0.99}
                    max={15.99}
                    step={0.25}
                    marks={[
                      { value: 0.99, label: '0.99%' },
                      { value: 5.99, label: '5.99%' },
                      { value: 10.99, label: '10.99%' },
                      { value: 15.99, label: '15.99%' }
                    ]}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Loan Term</InputLabel>
                    <Select
                      value={customLoan.termMonths}
                      label="Loan Term"
                      onChange={(e) => setCustomLoan(prev => ({ 
                        ...prev, 
                        termMonths: e.target.value as number 
                      }))}
                      disabled={disabled}
                    >
                      <MenuItem value={36}>36 months</MenuItem>
                      <MenuItem value={48}>48 months</MenuItem>
                      <MenuItem value={60}>60 months</MenuItem>
                      <MenuItem value={72}>72 months</MenuItem>
                      <MenuItem value={84}>84 months</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Payment Breakdown
              </Typography>
              
              {calculatedPayments.loan ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Financed Amount:</Typography>
                    <Typography>{formatPrice(customLoan.amount - customLoan.downPayment)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Monthly Payment:</Typography>
                    <Typography variant="h6" color="primary">
                      {formatPrice(calculatedPayments.loan.monthlyPayment)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Total Interest:</Typography>
                    <Typography>{formatPrice(calculatedPayments.loan.totalInterest)}</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">Total Cost:</Typography>
                    <Typography variant="h6">
                      {formatPrice(calculatedPayments.loan.totalCost + customLoan.downPayment)}
                    </Typography>
                  </Box>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CalculateIcon />}
                    onClick={() => calculatedPayments.loan && onFinancingSelected?.({
                      id: 'custom-loan',
                      name: 'Custom Loan',
                      type: 'loan',
                      apr: customLoan.apr,
                      termMonths: customLoan.termMonths,
                      downPaymentRequired: customLoan.downPayment,
                      monthlyPayment: calculatedPayments.loan.monthlyPayment,
                      totalInterest: calculatedPayments.loan.totalInterest,
                      totalCost: calculatedPayments.loan.totalCost,
                      isPromotional: false,
                      eligibilityRules: []
                    })}
                    disabled={disabled || !calculatedPayments.loan}
                  >
                    Use This Loan
                  </Button>
                </Box>
              ) : (
                <Alert severity="info">Calculating payment...</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderLeaseCalculator = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Custom Lease Calculator
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Lease Parameters
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Vehicle MSRP"
                    type="number"
                    value={customLease.amount}
                    onChange={(e) => setCustomLease(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Down Payment"
                    type="number"
                    value={customLease.downPayment}
                    onChange={(e) => setCustomLease(prev => ({ 
                      ...prev, 
                      downPayment: parseFloat(e.target.value) || 0 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Residual Value"
                    type="number"
                    value={customLease.residualValue}
                    onChange={(e) => setCustomLease(prev => ({ 
                      ...prev, 
                      residualValue: parseFloat(e.target.value) || 0 
                    }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText={`${((customLease.residualValue / customLease.amount) * 100).toFixed(1)}% of MSRP`}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography gutterBottom>Money Factor (APR): {formatPercentage(customLease.apr)}</Typography>
                  <Slider
                    value={customLease.apr}
                    onChange={(_, value) => setCustomLease(prev => ({ 
                      ...prev, 
                      apr: value as number 
                    }))}
                    min={0.99}
                    max={8.99}
                    step={0.25}
                    marks={[
                      { value: 0.99, label: '0.99%' },
                      { value: 3.99, label: '3.99%' },
                      { value: 6.99, label: '6.99%' },
                      { value: 8.99, label: '8.99%' }
                    ]}
                    disabled={disabled}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Lease Term</InputLabel>
                    <Select
                      value={customLease.termMonths}
                      label="Lease Term"
                      onChange={(e) => setCustomLease(prev => ({ 
                        ...prev, 
                        termMonths: e.target.value as number 
                      }))}
                      disabled={disabled}
                    >
                      <MenuItem value={24}>24 months</MenuItem>
                      <MenuItem value={36}>36 months</MenuItem>
                      <MenuItem value={48}>48 months</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Payment Breakdown
              </Typography>
              
              {calculatedPayments.lease ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Depreciation:</Typography>
                    <Typography>
                      {formatPrice(customLease.amount - customLease.residualValue)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Monthly Payment:</Typography>
                    <Typography variant="h6" color="primary">
                      {formatPrice(calculatedPayments.lease.monthlyPayment)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Total Payments:</Typography>
                    <Typography>
                      {formatPrice(calculatedPayments.lease.monthlyPayment * customLease.termMonths)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">Total Cost:</Typography>
                    <Typography variant="h6">
                      {formatPrice(calculatedPayments.lease.totalCost + customLease.downPayment)}
                    </Typography>
                  </Box>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CalculateIcon />}
                    onClick={() => calculatedPayments.lease && onFinancingSelected?.({
                      id: 'custom-lease',
                      name: 'Custom Lease',
                      type: 'lease',
                      apr: customLease.apr,
                      termMonths: customLease.termMonths,
                      downPaymentRequired: customLease.downPayment,
                      monthlyPayment: calculatedPayments.lease.monthlyPayment,
                      totalInterest: calculatedPayments.lease.totalInterest,
                      totalCost: calculatedPayments.lease.totalCost,
                      isPromotional: false,
                      eligibilityRules: []
                    })}
                    disabled={disabled || !calculatedPayments.lease}
                  >
                    Use This Lease
                  </Button>
                </Box>
              ) : (
                <Alert severity="info">Calculating payment...</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Financing Calculator
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Calculate monthly payments for loans and leases based on the configured vehicle price of {formatPrice(priceBreakdown.totalPrice)}.
          </Alert>

          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Available Options" />
            <Tab label="Loan Calculator" />
            <Tab label="Lease Calculator" />
          </Tabs>

          {activeTab === 0 && renderPresetOptions()}
          {activeTab === 1 && renderLoanCalculator()}
          {activeTab === 2 && renderLeaseCalculator()}
        </CardContent>
      </Card>
    </Box>
  );
};