import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import { VehicleSelector } from './pricing/VehicleSelector';
import { OptionsSelector } from './pricing/OptionsSelector';
import { DiscountsIncentives } from './pricing/DiscountsIncentives';
import { PriceSummary } from './pricing/PriceSummary';
import { FinancingCalculator } from './pricing/FinancingCalculator';
import { QuoteManager } from './pricing/QuoteManager';
import { LoadingSpinner } from './LoadingSpinner';
import { pricingService } from '../services';
import type {
  Vehicle,
  VehicleOption,
  Discount,
  Incentive,
  PricingConfiguration,
  PriceBreakdown,
  FinancingOption,
  VehicleSearchFilters
} from '../types';

const steps = [
  'Select Vehicle',
  'Choose Options',
  'Apply Discounts & Incentives',
  'Review & Calculate',
  'Financing & Quotes'
];

interface PricingCalculatorProps {
  onQuoteGenerated?: (configuration: PricingConfiguration, breakdown: PriceBreakdown) => void;
  initialVehicleId?: string;
  readOnly?: boolean;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  onQuoteGenerated,
  initialVehicleId,
  readOnly = false
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for pricing configuration
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [availableOptions, setAvailableOptions] = useState<VehicleOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [availableIncentives, setAvailableIncentives] = useState<Incentive[]>([]);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [tradeInValue, setTradeInValue] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [selectedFinancing, setSelectedFinancing] = useState<FinancingOption | null>(null);

  // Load initial vehicle if provided
  useEffect(() => {
    if (initialVehicleId) {
      loadVehicle(initialVehicleId);
    }
  }, [initialVehicleId]);

  const loadVehicle = async (vehicleId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const vehicle = await pricingService.getVehicle(vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        await loadVehicleData(vehicleId);
      } else {
        setError('Vehicle not found');
      }
    } catch (err) {
      setError('Failed to load vehicle data');
      console.error('Error loading vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleData = async (vehicleId: string) => {
    try {
      const [options, discounts, incentives] = await Promise.all([
        pricingService.getVehicleOptions(vehicleId),
        pricingService.getDiscounts(vehicleId),
        pricingService.getIncentives(vehicleId)
      ]);
      
      setAvailableOptions(options);
      setAvailableDiscounts(discounts.filter(d => d.isActive));
      setAvailableIncentives(incentives.filter(i => i.isActive));
    } catch (err) {
      console.error('Error loading vehicle data:', err);
      setError('Failed to load vehicle options and pricing data');
    }
  };

  const handleVehicleSelect = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedOptions([]);
    setSelectedDiscounts([]);
    setSelectedIncentives([]);
    setPriceBreakdown(null);
    
    await loadVehicleData(vehicle.id);
    setActiveStep(1);
  };

  const handleOptionsChange = (optionIds: string[]) => {
    setSelectedOptions(optionIds);
    setPriceBreakdown(null); // Reset price breakdown when options change
  };

  const handleDiscountsChange = (discountIds: string[]) => {
    setSelectedDiscounts(discountIds);
    setPriceBreakdown(null);
  };

  const handleIncentivesChange = (incentiveIds: string[]) => {
    setSelectedIncentives(incentiveIds);
    setPriceBreakdown(null);
  };

  const calculatePrice = useCallback(async () => {
    if (!selectedVehicle) return;

    setLoading(true);
    setError(null);

    try {
      const configuration: PricingConfiguration = {
        vehicleId: selectedVehicle.id,
        selectedOptions,
        appliedDiscounts: selectedDiscounts,
        appliedIncentives: selectedIncentives,
        tradeInValue: tradeInValue > 0 ? tradeInValue : undefined,
        downPayment: downPayment > 0 ? downPayment : undefined,
        taxRate: 0.08, // Default 8% tax rate - should be configurable
        fees: {
          documentation: 299,
          registration: 150,
          dealer: 500
        }
      };

      const breakdown = await pricingService.calculatePrice(configuration);
      setPriceBreakdown(breakdown);
      
      if (onQuoteGenerated) {
        onQuoteGenerated(configuration, breakdown);
      }
    } catch (err) {
      setError('Failed to calculate price');
      console.error('Error calculating price:', err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedVehicle,
    selectedOptions,
    selectedDiscounts,
    selectedIncentives,
    tradeInValue,
    downPayment,
    onQuoteGenerated
  ]);

  const handleNext = () => {
    if (activeStep === 3 && !priceBreakdown) {
      // Calculate price before moving to financing step
      calculatePrice();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedVehicle !== null;
      case 1:
        return true; // Options are optional
      case 2:
        return true; // Discounts and incentives are optional
      case 3:
        return priceBreakdown !== null; // Need calculated price to proceed to financing
      case 4:
        return true; // Financing and quotes are optional
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VehicleSelector
            onVehicleSelect={handleVehicleSelect}
            selectedVehicle={selectedVehicle}
            disabled={readOnly}
          />
        );
      case 1:
        return (
          <OptionsSelector
            vehicle={selectedVehicle!}
            availableOptions={availableOptions}
            selectedOptions={selectedOptions}
            onOptionsChange={handleOptionsChange}
            disabled={readOnly}
          />
        );
      case 2:
        return (
          <DiscountsIncentives
            vehicle={selectedVehicle!}
            availableDiscounts={availableDiscounts}
            selectedDiscounts={selectedDiscounts}
            onDiscountsChange={handleDiscountsChange}
            availableIncentives={availableIncentives}
            selectedIncentives={selectedIncentives}
            onIncentivesChange={handleIncentivesChange}
            tradeInValue={tradeInValue}
            onTradeInValueChange={setTradeInValue}
            downPayment={downPayment}
            onDownPaymentChange={setDownPayment}
            disabled={readOnly}
          />
        );
      case 3:
        return (
          <PriceSummary
            vehicle={selectedVehicle!}
            selectedOptions={availableOptions.filter(opt => selectedOptions.includes(opt.id))}
            selectedDiscounts={availableDiscounts.filter(disc => selectedDiscounts.includes(disc.id))}
            selectedIncentives={availableIncentives.filter(inc => selectedIncentives.includes(inc.id))}
            tradeInValue={tradeInValue}
            downPayment={downPayment}
            priceBreakdown={priceBreakdown}
            onRecalculate={calculatePrice}
            loading={loading}
          />
        );
      case 4:
        return (
          <Box>
            {priceBreakdown && (
              <FinancingCalculator
                vehicleId={selectedVehicle!.id}
                priceBreakdown={priceBreakdown}
                onFinancingSelected={setSelectedFinancing}
                disabled={readOnly}
              />
            )}
            <QuoteManager
              vehicleId={selectedVehicle?.id}
              configuration={selectedVehicle ? {
                vehicleId: selectedVehicle.id,
                selectedOptions,
                appliedDiscounts: selectedDiscounts,
                appliedIncentives: selectedIncentives,
                tradeInValue: tradeInValue > 0 ? tradeInValue : undefined,
                downPayment: downPayment > 0 ? downPayment : undefined,
                taxRate: 0.08,
                fees: {
                  documentation: 299,
                  registration: 150,
                  dealer: 500
                }
              } : undefined}
              priceBreakdown={priceBreakdown}
              selectedFinancing={selectedFinancing}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  if (loading && !selectedVehicle) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            Vehicle Pricing Calculator
          </Typography>
          
          {selectedVehicle && (
            <Box sx={{ mb: 3 }}>
              <Chip 
                label={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.trim}`}
                color="primary"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Chip 
                label={`Stock #${selectedVehicle.stockNumber}`}
                variant="outlined"
              />
            </Box>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent()}
          </Box>

          {!readOnly && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                >
                  {activeStep === 3 && !priceBreakdown ? 'Calculate Price' : 
                   activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};