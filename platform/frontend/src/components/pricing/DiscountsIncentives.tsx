import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Chip,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  LocalOffer as DiscountIcon,
  CardGiftcard as IncentiveIcon,
  DirectionsCar as TradeIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import type { Vehicle, Discount, Incentive } from '../../types';

interface DiscountsIncentivesProps {
  vehicle: Vehicle;
  availableDiscounts: Discount[];
  selectedDiscounts: string[];
  onDiscountsChange: (discountIds: string[]) => void;
  availableIncentives: Incentive[];
  selectedIncentives: string[];
  onIncentivesChange: (incentiveIds: string[]) => void;
  tradeInValue: number;
  onTradeInValueChange: (value: number) => void;
  downPayment: number;
  onDownPaymentChange: (value: number) => void;
  disabled?: boolean;
}

export const DiscountsIncentives: React.FC<DiscountsIncentivesProps> = ({
  vehicle,
  availableDiscounts,
  selectedDiscounts,
  onDiscountsChange,
  availableIncentives,
  selectedIncentives,
  onIncentivesChange,
  tradeInValue,
  onTradeInValueChange,
  downPayment,
  onDownPaymentChange,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleDiscountToggle = (discountId: string) => {
    if (disabled) return;

    const newSelected = selectedDiscounts.includes(discountId)
      ? selectedDiscounts.filter(id => id !== discountId)
      : [...selectedDiscounts, discountId];

    onDiscountsChange(newSelected);
  };

  const handleIncentiveToggle = (incentiveId: string) => {
    if (disabled) return;

    const newSelected = selectedIncentives.includes(incentiveId)
      ? selectedIncentives.filter(id => id !== incentiveId)
      : [...selectedIncentives, incentiveId];

    onIncentivesChange(newSelected);
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
    return `${value}%`;
  };

  const getDiscountValue = (discount: Discount, baseAmount: number = vehicle.msrp) => {
    switch (discount.type) {
      case 'percentage':
        const percentAmount = (baseAmount * discount.value) / 100;
        return Math.min(percentAmount, discount.maxAmount || percentAmount);
      case 'fixed_amount':
        return discount.value;
      case 'rebate':
        return discount.value;
      default:
        return 0;
    }
  };

  const getIncentiveValue = (incentive: Incentive) => {
    switch (incentive.type) {
      case 'cash_back':
        return incentive.value;
      case 'financing_rate':
        return 0; // This affects financing, not direct price
      case 'lease_rate':
        return 0; // This affects leasing, not direct price
      case 'trade_in_bonus':
        return incentive.value;
      default:
        return 0;
    }
  };

  const isDiscountApplicable = (discount: Discount) => {
    // Check if discount is applicable to this vehicle
    if (discount.applicableVehicles && discount.applicableVehicles.length > 0) {
      return discount.applicableVehicles.includes(vehicle.id);
    }
    return true; // If no specific vehicles listed, assume applicable to all
  };

  const isIncentiveApplicable = (incentive: Incentive) => {
    // Check if incentive is applicable to this vehicle
    if (incentive.applicableVehicles && incentive.applicableVehicles.length > 0) {
      return incentive.applicableVehicles.includes(vehicle.id);
    }
    return true; // If no specific vehicles listed, assume applicable to all
  };

  const selectedDiscountsData = availableDiscounts.filter(d => selectedDiscounts.includes(d.id));
  const selectedIncentivesData = availableIncentives.filter(i => selectedIncentives.includes(i.id));
  
  const totalDiscountValue = selectedDiscountsData.reduce((sum, discount) => 
    sum + getDiscountValue(discount), 0
  );
  
  const totalIncentiveValue = selectedIncentivesData.reduce((sum, incentive) => 
    sum + getIncentiveValue(incentive), 0
  );

  const renderDiscountItem = (discount: Discount) => {
    const isSelected = selectedDiscounts.includes(discount.id);
    const isApplicable = isDiscountApplicable(discount);
    const discountValue = getDiscountValue(discount);

    return (
      <ListItem 
        key={discount.id}
        button
        onClick={() => isApplicable && handleDiscountToggle(discount.id)}
        disabled={disabled || !isApplicable}
        sx={{ 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1, 
          mb: 1,
          opacity: !isApplicable ? 0.6 : 1
        }}
      >
        <ListItemIcon>
          <Checkbox
            checked={isSelected}
            disabled={disabled || !isApplicable}
            icon={<UncheckedIcon />}
            checkedIcon={<CheckIcon />}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">{discount.name}</Typography>
              <Chip 
                icon={<DiscountIcon />}
                label={
                  discount.type === 'percentage' 
                    ? `${formatPercentage(discount.value)} off`
                    : formatPrice(discount.value)
                }
                size="small"
                color="primary"
                variant="outlined"
              />
              <Tooltip title={discount.description}>
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {discount.description}
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                Saves: {formatPrice(discountValue)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Valid: {new Date(discount.validFrom).toLocaleDateString()} - {new Date(discount.validTo).toLocaleDateString()}
              </Typography>
            </Box>
          }
        />
      </ListItem>
    );
  };

  const renderIncentiveItem = (incentive: Incentive) => {
    const isSelected = selectedIncentives.includes(incentive.id);
    const isApplicable = isIncentiveApplicable(incentive);
    const incentiveValue = getIncentiveValue(incentive);

    return (
      <ListItem 
        key={incentive.id}
        button
        onClick={() => isApplicable && handleIncentiveToggle(incentive.id)}
        disabled={disabled || !isApplicable}
        sx={{ 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1, 
          mb: 1,
          opacity: !isApplicable ? 0.6 : 1
        }}
      >
        <ListItemIcon>
          <Checkbox
            checked={isSelected}
            disabled={disabled || !isApplicable}
            icon={<UncheckedIcon />}
            checkedIcon={<CheckIcon />}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">{incentive.name}</Typography>
              <Chip 
                icon={<IncentiveIcon />}
                label={
                  incentive.type === 'financing_rate' || incentive.type === 'lease_rate'
                    ? `${formatPercentage(incentive.value)} APR`
                    : formatPrice(incentive.value)
                }
                size="small"
                color="secondary"
                variant="outlined"
              />
              {incentive.manufacturerIncentive && (
                <Chip 
                  label="Manufacturer"
                  size="small"
                  variant="outlined"
                />
              )}
              <Tooltip title={incentive.description}>
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {incentive.description}
              </Typography>
              {incentiveValue > 0 && (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                  Value: {formatPrice(incentiveValue)}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Valid: {new Date(incentive.validFrom).toLocaleDateString()} - {new Date(incentive.validTo).toLocaleDateString()}
              </Typography>
            </Box>
          }
        />
      </ListItem>
    );
  };

  const renderSummary = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Savings Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Discounts Applied
            </Typography>
            <Typography variant="h6" color="primary">
              {selectedDiscountsData.length}
            </Typography>
            <Typography variant="body2" color="success.main">
              -{formatPrice(totalDiscountValue)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Incentives Applied
            </Typography>
            <Typography variant="h6" color="secondary">
              {selectedIncentivesData.length}
            </Typography>
            <Typography variant="body2" color="success.main">
              -{formatPrice(totalIncentiveValue)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Trade-In Value
            </Typography>
            <Typography variant="h6" color="info.main">
              {formatPrice(tradeInValue)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Total Savings
            </Typography>
            <Typography variant="h6" color="success.main">
              -{formatPrice(totalDiscountValue + totalIncentiveValue + tradeInValue)}
            </Typography>
          </Grid>
        </Grid>

        {(selectedDiscountsData.length > 0 || selectedIncentivesData.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Applied Savings:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedDiscountsData.map(discount => (
                <Chip
                  key={discount.id}
                  label={`${discount.name} (-${formatPrice(getDiscountValue(discount))})`}
                  size="small"
                  onDelete={disabled ? undefined : () => handleDiscountToggle(discount.id)}
                  color="primary"
                  variant="outlined"
                />
              ))}
              {selectedIncentivesData.map(incentive => (
                <Chip
                  key={incentive.id}
                  label={`${incentive.name} (-${formatPrice(getIncentiveValue(incentive))})`}
                  size="small"
                  onDelete={disabled ? undefined : () => handleIncentiveToggle(incentive.id)}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {renderSummary()}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Discounts, Incentives & Trade-In
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab icon={<DiscountIcon />} label="Discounts" />
            <Tab icon={<IncentiveIcon />} label="Incentives" />
            <Tab icon={<TradeIcon />} label="Trade-In & Down Payment" />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Available Discounts
              </Typography>
              {availableDiscounts.length === 0 ? (
                <Alert severity="info">
                  No discounts available for this vehicle.
                </Alert>
              ) : (
                <List>
                  {availableDiscounts.map(renderDiscountItem)}
                </List>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Available Incentives
              </Typography>
              {availableIncentives.length === 0 ? (
                <Alert severity="info">
                  No incentives available for this vehicle.
                </Alert>
              ) : (
                <List>
                  {availableIncentives.map(renderIncentiveItem)}
                </List>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        <TradeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Trade-In Vehicle
                      </Typography>
                      <TextField
                        fullWidth
                        label="Trade-In Value"
                        type="number"
                        value={tradeInValue || ''}
                        onChange={(e) => onTradeInValueChange(parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Enter the estimated value of your trade-in vehicle"
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Down Payment
                      </Typography>
                      <TextField
                        fullWidth
                        label="Down Payment"
                        type="number"
                        value={downPayment || ''}
                        onChange={(e) => onDownPaymentChange(parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        helperText="Enter the amount you plan to pay upfront"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                Trade-in value and down payment will be applied to reduce the final amount due.
                These values are estimates and may be adjusted during final negotiations.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};