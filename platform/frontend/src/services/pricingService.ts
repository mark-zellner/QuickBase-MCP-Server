import { apiClient } from './apiClient';
import type { 
  Vehicle, 
  VehicleOption, 
  Discount, 
  Incentive, 
  PricingConfiguration, 
  PriceBreakdown, 
  FinancingOption,
  Quote,
  VehicleSearchFilters,
  ApiResponse 
} from '../types';

class PricingService {
  // Vehicle operations
  async searchVehicles(filters: VehicleSearchFilters): Promise<Vehicle[]> {
    const response = await apiClient.post<ApiResponse<Vehicle[]>>('/api/pricing/vehicles/search', filters);
    return response.data.data || [];
  }

  async getVehicle(vehicleId: string): Promise<Vehicle | null> {
    try {
      const response = await apiClient.get<ApiResponse<Vehicle>>(`/api/pricing/vehicles/${vehicleId}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      return null;
    }
  }

  async getVehicleOptions(vehicleId: string): Promise<VehicleOption[]> {
    const response = await apiClient.get<ApiResponse<VehicleOption[]>>(`/api/pricing/vehicles/${vehicleId}/options`);
    return response.data.data || [];
  }

  // Pricing operations
  async calculatePrice(configuration: PricingConfiguration): Promise<PriceBreakdown> {
    const response = await apiClient.post<ApiResponse<PriceBreakdown>>('/api/pricing/calculate', configuration);
    return response.data.data!;
  }

  async getDiscounts(vehicleId?: string): Promise<Discount[]> {
    const url = vehicleId ? `/api/pricing/discounts?vehicleId=${vehicleId}` : '/api/pricing/discounts';
    const response = await apiClient.get<ApiResponse<Discount[]>>(url);
    return response.data.data || [];
  }

  async getIncentives(vehicleId?: string): Promise<Incentive[]> {
    const url = vehicleId ? `/api/pricing/incentives?vehicleId=${vehicleId}` : '/api/pricing/incentives';
    const response = await apiClient.get<ApiResponse<Incentive[]>>(url);
    return response.data.data || [];
  }

  // Financing operations
  async getFinancingOptions(vehicleId: string, totalAmount: number): Promise<FinancingOption[]> {
    const response = await apiClient.get<ApiResponse<FinancingOption[]>>(
      `/api/pricing/financing?vehicleId=${vehicleId}&amount=${totalAmount}`
    );
    return response.data.data || [];
  }

  async calculateFinancing(
    amount: number, 
    apr: number, 
    termMonths: number, 
    downPayment: number = 0
  ): Promise<{ monthlyPayment: number; totalInterest: number; totalCost: number }> {
    const response = await apiClient.post<ApiResponse<any>>('/api/pricing/financing/calculate', {
      amount,
      apr,
      termMonths,
      downPayment
    });
    return response.data.data!;
  }

  // Quote operations
  async createQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
    const response = await apiClient.post<ApiResponse<Quote>>('/api/pricing/quotes', quote);
    return response.data.data!;
  }

  async getQuote(quoteId: string): Promise<Quote | null> {
    try {
      const response = await apiClient.get<ApiResponse<Quote>>(`/api/pricing/quotes/${quoteId}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
  }

  async updateQuote(quoteId: string, updates: Partial<Quote>): Promise<Quote> {
    const response = await apiClient.patch<ApiResponse<Quote>>(`/api/pricing/quotes/${quoteId}`, updates);
    return response.data.data!;
  }

  async sendQuote(quoteId: string, customerEmail: string): Promise<void> {
    await apiClient.post(`/api/pricing/quotes/${quoteId}/send`, { customerEmail });
  }

  // Utility methods
  async validateConfiguration(configuration: PricingConfiguration): Promise<{ isValid: boolean; errors: string[] }> {
    const response = await apiClient.post<ApiResponse<{ isValid: boolean; errors: string[] }>>(
      '/api/pricing/validate', 
      configuration
    );
    return response.data.data!;
  }

  async getInventoryCount(filters: VehicleSearchFilters): Promise<number> {
    const response = await apiClient.post<ApiResponse<{ count: number }>>('/api/pricing/vehicles/count', filters);
    return response.data.data?.count || 0;
  }
}

export const pricingService = new PricingService();