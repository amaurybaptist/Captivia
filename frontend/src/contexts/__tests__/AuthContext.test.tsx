import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { disablePush, syncExistingPushSubscription } from '@/lib/push-notifications';
jest.mock('@/lib/push-notifications', () => ({ disablePush: jest.fn().mockResolvedValue(undefined), syncExistingPushSubscription: jest.fn().mockResolvedValue(undefined) }));

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should provide initial auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should login and store user data', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

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

  it('should logout and clear data', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

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
    expect(disablePush).toHaveBeenCalledWith(mockToken);
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
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toEqual(mockToken);
    expect(syncExistingPushSubscription).toHaveBeenCalledWith(mockToken);
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should handle isPremium flag correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

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

  it('should update localStorage when user logs in multiple times', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

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
  it('une réponse de profil tardive ne rétablit pas une session déconnectée', async () => {
    const cached = { id: 'user', email: 'local@example.test', locale: 'fr', isPremium: false };
    localStorage.setItem('token', 'old-token'); localStorage.setItem('user', JSON.stringify(cached));
    let complete!: (value: Response) => void;
    global.fetch = jest.fn(() => new Promise<Response>(resolve => { complete = resolve; }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.logout());
    await act(async () => { complete({ ok: true, json: async () => cached } as Response); });
    expect(result.current.user).toBeNull(); expect(result.current.token).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

});
