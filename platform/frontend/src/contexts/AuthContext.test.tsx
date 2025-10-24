import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the auth service
vi.mock('../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('No token')),
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{user ? user.name : 'No user'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  it('provides authentication state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for loading to complete and check final state
    await screen.findByTestId('authenticated');
    
    // Should show not authenticated when no token
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
  });
});