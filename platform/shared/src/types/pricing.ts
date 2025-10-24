import { z } from 'zod';

// Vehicle Schema
export const VehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  trim: z.string(),
  vin: z.string().optional(),
  basePrice: z.number(),
  msrp: z.number(),
  invoicePrice: z.number(),
  stockNumber: z.string(),
  exteriorColor: z.string(),
  interiorColor: z.string(),
  engine: z.string(),
  transmission: z.string(),
  drivetrain: z.string(),
  fuelType: z.string(),
  mpgCity: z.number().optional(),
  mpgHighway: z.number().optional(),
  isAvailable: z.boolean(),
  location: z.string(),
  images: z.array(z.string()),
  features: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Vehicle = z.infer<typeof VehicleSchema>;

// Vehicle Option Schema
export const VehicleOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['exterior', 'interior', 'technology', 'safety', 'performance', 'convenience']),
  price: z.number(),
  isRequired: z.boolean(),
  isAvailable: z.boolean(),
  compatibleTrims: z.array(z.string()),
  imageUrl: z.string().optional(),
});

export type VehicleOption = z.infer<typeof VehicleOptionSchema>;

// Discount Schema
export const DiscountSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['percentage', 'fixed_amount', 'rebate']),
  value: z.number(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  isActive: z.boolean(),
  validFrom: z.date(),
  validTo: z.date(),
  eligibilityRules: z.array(z.string()),
  applicableVehicles: z.array(z.string()).optional(),
});

export type Discount = z.infer<typeof DiscountSchema>;

// Incentive Schema
export const IncentiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['cash_back', 'financing_rate', 'lease_rate', 'trade_in_bonus']),
  value: z.number(),
  isActive: z.boolean(),
  validFrom: z.date(),
  validTo: z.date(),
  eligibilityRules: z.array(z.string()),
  applicableVehicles: z.array(z.string()).optional(),
  manufacturerIncentive: z.boolean(),
});

export type Incentive = z.infer<typeof IncentiveSchema>;

// Pricing Configuration Schema
export const PricingConfigurationSchema = z.object({
  vehicleId: z.string(),
  selectedOptions: z.array(z.string()),
  appliedDiscounts: z.array(z.string()),
  appliedIncentives: z.array(z.string()),
  tradeInValue: z.number().optional(),
  downPayment: z.number().optional(),
  taxRate: z.number(),
  fees: z.record(z.number()),
});

export type PricingConfiguration = z.infer<typeof PricingConfigurationSchema>;

// Price Breakdown Schema
export const PriceBreakdownSchema = z.object({
  basePrice: z.number(),
  optionsTotal: z.number(),
  subtotal: z.number(),
  discountsTotal: z.number(),
  incentivesTotal: z.number(),
  tradeInCredit: z.number(),
  taxableAmount: z.number(),
  taxAmount: z.number(),
  feesTotal: z.number(),
  totalPrice: z.number(),
  amountDue: z.number(),
});

export type PriceBreakdown = z.infer<typeof PriceBreakdownSchema>;

// Financing Option Schema
export const FinancingOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['loan', 'lease']),
  apr: z.number(),
  termMonths: z.number(),
  downPaymentRequired: z.number(),
  monthlyPayment: z.number(),
  totalInterest: z.number(),
  totalCost: z.number(),
  isPromotional: z.boolean(),
  eligibilityRules: z.array(z.string()),
});

export type FinancingOption = z.infer<typeof FinancingOptionSchema>;

// Quote Schema
export const QuoteSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string().optional(),
  salesPersonId: z.string(),
  vehicleId: z.string(),
  configuration: PricingConfigurationSchema,
  priceBreakdown: PriceBreakdownSchema,
  selectedFinancing: FinancingOptionSchema.optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'expired']),
  validUntil: z.date(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Quote = z.infer<typeof QuoteSchema>;

// Vehicle Search Filters Schema
export const VehicleSearchFiltersSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  yearMin: z.number().optional(),
  yearMax: z.number().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  fuelType: z.string().optional(),
  drivetrain: z.string().optional(),
  transmission: z.string().optional(),
  features: z.array(z.string()).optional(),
  location: z.string().optional(),
  availableOnly: z.boolean().default(true),
});

export type VehicleSearchFilters = z.infer<typeof VehicleSearchFiltersSchema>;