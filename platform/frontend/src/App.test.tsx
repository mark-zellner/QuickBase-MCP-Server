import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import { theme } from './theme';

// Mock the auth service
vi.mock('./services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('No token')),
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({ 
  children, 
  initialEntries = ['/'] 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper initialEntries={['/login']}>
        <App />
      </TestWrapper>
    );
    
    // Should show login page when not authenticated
    expect(screen.getByText(/QuickBase Platform/i)).toBeInTheDocument();
  });
});