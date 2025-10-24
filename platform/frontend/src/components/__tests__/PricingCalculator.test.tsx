import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PricingCalculator } from '../PricingCalculator';

// Mock the pricing service
vi.mock('../../services/pricingService', () => ({
  pricingService: {
    getVehicles: vi.fn().mockResolvedValue([
      { id: 1, make: 'Toyota', model: 'Camry', basePrice: 28000 },
      { id: 2, make: 'Honda', model: 'Accord', basePrice: 32000 },
    ]),
    getOptions: vi.fn().mockResolvedValue([
      { id: 'premium', name: 'Premium Package', price: 2500 },
      { id: 'navigation', name: 'Navigation System', price: 1200 },
    ]),
    getDiscounts: vi.fn().mockResolvedValue([
      { id: 'loyalty', name: 'Loyalty Discount', amount: 1000 },
      { id: 'military', name: 'Military Discount', amount: 500 },
    ]),
    calculateFinancing: vi.fn().mockReturnValue({
      monthlyPayment: 450,
      totalInterest: 5400,
      totalAmount: 33400,
    }),
    saveQuote: vi.fn().mockResolvedValue({ id: 'quote-123' }),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PricingCalculator', () => {
  it('renders the pricing calculator interface', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    expect(screen.getByText(/vehicle pricing calculator/i)).toBeInTheDocument();
    
    // Wait for vehicles to load
    await waitFor(() => {
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
    });
  });

  it('displays vehicle selection options', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('Honda Accord')).toBeInTheDocument();
    });
  });

  it('updates total price when vehicle is selected', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: '1' } });
    });

    expect(screen.getByText(/\$28,000/)).toBeInTheDocument();
  });

  it('displays and handles option selection', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Premium Package')).toBeInTheDocument();
      expect(screen.getByText('Navigation System')).toBeInTheDocument();
    });

    const premiumOption = screen.getByLabelText(/premium package/i);
    fireEvent.click(premiumOption);

    // Should update the total price
    await waitFor(() => {
      expect(screen.getByText(/\$30,500/)).toBeInTheDocument(); // 28000 + 2500
    });
  });

  it('applies discounts correctly', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    // Select a vehicle first
    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: '1' } });
    });

    // Apply loyalty discount
    const loyaltyDiscount = screen.getByLabelText(/loyalty discount/i);
    fireEvent.click(loyaltyDiscount);

    await waitFor(() => {
      expect(screen.getByText(/\$27,000/)).toBeInTheDocument(); // 28000 - 1000
    });
  });

  it('calculates financing options', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    // Select a vehicle
    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: '1' } });
    });

    // Set financing options
    const downPaymentInput = screen.getByLabelText(/down payment/i);
    fireEvent.change(downPaymentInput, { target: { value: '5000' } });

    const loanTermSelect = screen.getByLabelText(/loan term/i);
    fireEvent.change(loanTermSelect, { target: { value: '60' } });

    await waitFor(() => {
      expect(screen.getByText(/monthly payment/i)).toBeInTheDocument();
      expect(screen.getByText(/\$450/)).toBeInTheDocument();
    });
  });

  it('saves quote when save button is clicked', async () => {
    const { pricingService } = await import('../../services/pricingService');
    
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    // Select a vehicle
    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: '1' } });
    });

    const saveButton = screen.getByText(/save quote/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(pricingService.saveQuote).toHaveBeenCalled();
    });
  });

  it('resets calculator when reset button is clicked', async () => {
    render(
      <TestWrapper>
        <PricingCalculator />
      </TestWrapper>
    );

    // Select a vehicle and options
    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: '1' } });
    });

    const premiumOption = screen.getByLabelText(/premium package/i);
    fireEvent.click(premiumOption);

    // Reset the calculator
    const resetButton = screen.getByText(/reset/i);
    fireEvent.click(resetButton);

    await waitFor(() => {
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      expect(vehicleSelect).toHaveValue('');
      expect(premiumOption).not.toBeChecked();
    });
  });

  it('handles load