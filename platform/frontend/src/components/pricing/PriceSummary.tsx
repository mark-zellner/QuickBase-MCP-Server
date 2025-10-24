import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Build as OptionsIcon,
  LocalOffer as DiscountIcon,
  CardGiftcard as IncentiveIcon,
  AttachMoney as MoneyIcon,
  Receipt as TaxIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import type { 
  Vehicle, 
  VehicleOption, 
  Discount, 
  Incentive, 
  PriceBreakdown 
} from '../../types';

interface PriceSummaryProps {
  vehicle: Vehicle;
  selectedOptions: VehicleOption[];
  selectedDiscounts: Discount[];
  selectedIncentives: Incentive[];
  tradeInValue: number;
  downPayment: number;
  priceBreakdown: PriceBreakdown | null;
  onRecalculate: () => void;
  loading: boolean;
}

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  vehicle,
  selectedOptions,
  selectedDiscounts,
  selectedIncentives,
  tradeInValue,
  downPayment,
  priceBreakdown,
  onRecalculate,
  loading
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const renderVehicleInfo = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <CarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Vehicle Information
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stock #{vehicle.stockNumber} • VIN: {vehicle.vin || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {vehicle.exteriorColor} / {vehicle.interiorColor}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Engine: {vehicle.engine}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Transmission: {vehicle.transmission}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drivetrain: {vehicle.drivetrain}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderSelectedItems = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Selected Items
        </Typography>

        {selectedOptions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <OptionsIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'small' }} />
              Options ({selectedOptions.length})
            </Typography>
            <List dense>
              {selectedOptions.map(option => (
                <ListItem key={option.id} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={option.name}
                    secondary={option.description}
                  />
                  <Typography variant="body2" color="primary">
                    {option.price === 0 ? 'Included' : `+${formatPrice(option.price)}`}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {selectedDiscounts.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <DiscountIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'small' }} />
              Discounts ({selectedDiscounts.length})
            </Typography>
            <List dense>
              {selectedDiscounts.map(discount => (
                <ListItem key={discount.id} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={discount.name}
                    secondary={discount.description}
                  />
                  <Typography variant="body2" color="success.main">
                    -{formatPrice(discount.value)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {selectedIncentives.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <IncentiveIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'small' }} />
              Incentives ({selectedIncentives.length})
            </Typography>
            <List dense>
              {selectedIncentives.map(incentive => (
                <ListItem key={incentive.id} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={incentive.name}
                    secondary={incentive.description}
                  />
                  <Typography variant="body2" color="success.main">
                    -{formatPrice(incentive.value)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {(tradeInValue > 0 || downPayment > 0) && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'small' }} />
              Additional Credits
            </Typography>
            <List dense>
              {tradeInValue > 0 && (
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Trade-In Value" />
                  <Typography variant="body2" color="success.main">
                    -{formatPrice(tradeInValue)}
                  </Typography>
                </ListItem>
              )}
              {downPayment > 0 && (
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Down Payment" />
                  <Typography variant="body2" color="info.main">
                    -{formatPrice(downPayment)}
                  </Typography>
                </ListItem>
              )}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderPriceBreakdown = () => {
    if (!priceBreakdown) {
      return (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CalculateIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ready to Calculate
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click the button below to calculate the final price with all selected options, discounts, and incentives.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={onRecalculate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
            >
              {loading ? 'Calculating...' : 'Calculate Price'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Price Breakdown
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onRecalculate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Recalculate
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2">Base Vehicle Price</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">{formatPrice(priceBreakdown.basePrice)}</Typography>
                  </TableCell>
                </TableRow>

                {priceBreakdown.optionsTotal > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Options Total</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" color="primary">
                        +{formatPrice(priceBreakdown.optionsTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2">Subtotal</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {formatPrice(priceBreakdown.subtotal)}
                    </Typography>
                  </TableCell>
                </TableRow>

                {priceBreakdown.discountsTotal > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" color="success.main">
                        Discounts Applied
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" color="success.main">
                        -{formatPrice(priceBreakdown.discountsTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {priceBreakdown.incentivesTotal > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" color="success.main">
                        Incentives Applied
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" color="success.main">
                        -{formatPrice(priceBreakdown.incentivesTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {priceBreakdown.tradeInCredit > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" color="success.main">
                        Trade-In Credit
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" color="success.main">
                        -{formatPrice(priceBreakdown.tradeInCredit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2">Taxable Amount</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      {formatPrice(priceBreakdown.taxableAmount)}
                    </Typography>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2">
                      <TaxIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'small' }} />
                      Tax
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      +{formatPrice(priceBreakdown.taxAmount)}
                    </Typography>
                  </TableCell>
                </TableRow>

                {priceBreakdown.feesTotal > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Fees</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1">
                        +{formatPrice(priceBreakdown.feesTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow>
                  <TableCell>
                    <Divider sx={{ my: 1 }} />
                  </TableCell>
                  <TableCell>
                    <Divider sx={{ my: 1 }} />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <Typography variant="h6">Total Price</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="primary">
                      {formatPrice(priceBreakdown.totalPrice)}
                    </Typography>
                  </TableCell>
                </TableRow>

                {downPayment > 0 && (
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" color="info.main">
                        Down Payment
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" color="info.main">
                        -{formatPrice(downPayment)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell>
                    <Typography variant="h6" color="success.main">
                      Amount Due
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="success.main">
                      {formatPrice(priceBreakdown.amountDue)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 2 }}>
            This is an estimate. Final pricing may vary based on financing terms, additional fees, 
            and final negotiations. Contact your sales representative for official pricing.
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {renderVehicleInfo()}
      {renderSelectedItems()}
      {renderPriceBreakdown()}
    </Box>
  );
};