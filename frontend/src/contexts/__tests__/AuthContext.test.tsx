import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should login and store user data', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: 'user-123',
      email: 'test@captivia.com',
      locale: 'fr',
      isPremium: false,
    };
    const mockToken = 'jwt-token-123';

    act(() => {
      result.current.login(mockToken, mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toEqual(mockToken);
    expect(localStorage.getItem('token')).toEqual(mockToken);
    expect(localStorage.getItem('user')).toEqual(JSON.stringify(mockUser));
  });

  it('should logout and clear data', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: 'user-123',
      email: 'test@captivia.com',
      locale: 'fr',
      isPremium: false,
    };
    const mockToken = 'jwt-token-123';

    act(() => {
      result.current.login(mockToken, mockUser);
    });

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should restore session from localStorage', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@captivia.com',
      locale: 'fr',
      isPremium: false,
    };
    const mockToken = 'jwt-token-123';

    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toEqual(mockToken);
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should handle isPremium flag correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const premiumUser = {
      id: 'user-123',
      email: 'premium@captivia.com',
      locale: 'fr',
      isPremium: true,
    };

    act(() => {
      result.current.login('token', premiumUser);
    });

    expect(result.current.user?.isPremium).toBe(true);
  });

  it('should update localStorage when user logs in multiple times', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const user1 = {
      id: 'user-1',
      email: 'user1@captivia.com',
      locale: 'fr',
      isPremium: false,
    };

    const user2 = {
      id: 'user-2',
      email: 'user2@captivia.com',
      locale: 'en',
      isPremium: true,
    };

    act(() => {
      result.current.login('token-1', user1);
    });

    expect(result.current.user?.id).toBe('user-1');

    act(() => {
      result.current.login('token-2', user2);
    });

    expect(result.current.user?.id).toBe('user-2');
    expect(result.current.token).toBe('token-2');
    expect(localStorage.getItem('token')).toBe('token-2');
  });
});
