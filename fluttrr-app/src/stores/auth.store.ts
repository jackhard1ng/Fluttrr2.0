import { create } from 'zustand';
import { authApi } from '@/api/auth';
import { usersApi } from '@/api/users';
import { businessApi } from '@/api/business';
import { secureStorage } from '@/services/storage';
import { extractErrorMessage } from '@/utils/error';
import { registerAndSavePushToken } from '@/services/notifications';
import type { User, Business } from '@/types/models';
import type { RegisterUserData, RegisterBusinessData, LoginData } from '@/types/api';
import { UserRole } from '@/types/enums';

type AccountType = 'user' | 'business';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accountType: AccountType | null;
  user: User | null;
  business: Business | null;
  isAdmin: boolean;
  pendingOtpEmail: string | null;

  // Actions
  hydrate: () => Promise<void>;
  login: (data: LoginData, type: AccountType) => Promise<void>;
  register: (data: RegisterUserData) => Promise<void>;
  registerBusiness: (data: RegisterBusinessData) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
  setBusiness: (business: Business) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  accountType: null,
  user: null,
  business: null,
  isAdmin: false,
  pendingOtpEmail: null,

  hydrate: async () => {
    try {
      const [accessToken, accountType, userData] = await Promise.all([
        secureStorage.getAccessToken(),
        secureStorage.getAccountType(),
        secureStorage.getUserData(),
      ]);

      if (!accessToken || !accountType) {
        set({ isLoading: false });
        return;
      }

      // Restore cached user data for instant hydration
      if (userData) {
        const parsed = JSON.parse(userData);
        if (accountType === 'user') {
          set({
            isAuthenticated: true,
            accountType,
            user: parsed,
            isAdmin: parsed.role === UserRole.ADMIN,
            isLoading: false,
          });
        } else {
          set({
            isAuthenticated: true,
            accountType,
            business: parsed,
            isLoading: false,
          });
        }
      } else {
        set({ isAuthenticated: true, accountType, isLoading: false });
      }

      // Background refresh profile for fresh data
      get().refreshProfile().catch((err) => {
        // Only logout on auth errors (401/403), not transient network failures
        const msg = extractErrorMessage(err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          get().logout();
        }
        // For network errors, keep the cached session — user can refresh manually
      });

      // Re-register push token on app relaunch
      registerAndSavePushToken().catch(() => {});
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (data: LoginData, type: AccountType) => {
    const response = type === 'user'
      ? await authApi.login(data)
      : await authApi.loginBusiness(data);

    const { accessToken, refreshToken, user, business } = response.data;

    await Promise.all([
      secureStorage.setAccessToken(accessToken),
      secureStorage.setRefreshToken(refreshToken),
      secureStorage.setAccountType(type),
      secureStorage.setUserData(JSON.stringify(user || business)),
    ]);

    if (type === 'user' && user) {
      set({
        isAuthenticated: true,
        accountType: type,
        user,
        business: null,
        isAdmin: user.role === UserRole.ADMIN,
        pendingOtpEmail: null,
      });
    } else if (business) {
      set({
        isAuthenticated: true,
        accountType: type,
        business,
        user: null,
        isAdmin: false,
        pendingOtpEmail: null,
      });
    }

    // Register push token in background after login
    registerAndSavePushToken().catch(() => {});
  },

  register: async (data: RegisterUserData) => {
    const response = await authApi.registerUser(data);
    const { accessToken, refreshToken, user } = response.data;

    await Promise.all([
      secureStorage.setAccessToken(accessToken),
      secureStorage.setRefreshToken(refreshToken),
      secureStorage.setAccountType('user'),
    ]);

    if (user) {
      await secureStorage.setUserData(JSON.stringify(user));
    }

    set({
      isAuthenticated: true,
      pendingOtpEmail: null,
      accountType: 'user',
      user: user || null,
    });

    // Register push token in background after registration
    registerAndSavePushToken().catch(() => {});
  },

  registerBusiness: async (data: RegisterBusinessData) => {
    const response = await authApi.registerBusiness(data);
    const { accessToken, refreshToken, business } = response.data;

    await Promise.all([
      secureStorage.setAccessToken(accessToken),
      secureStorage.setRefreshToken(refreshToken),
      secureStorage.setAccountType('business'),
    ]);

    if (business) {
      await secureStorage.setUserData(JSON.stringify(business));
    }

    set({
      isAuthenticated: true,
      pendingOtpEmail: null,
      accountType: 'business',
      business: business || null,
    });

    // Register push token in background after registration
    registerAndSavePushToken().catch(() => {});
  },

  verifyOtp: async (email: string, code: string) => {
    // Backend returns { message } on success — tokens were already stored during registration
    await authApi.verifyOtp({ email, code });

    // Mark as authenticated (tokens are already in storage from register step)
    set({ isAuthenticated: true, pendingOtpEmail: null });

    // Refresh profile to get updated emailVerified status
    get().refreshProfile().catch(() => {});
  },

  logout: async () => {
    await secureStorage.clearAll();
    set({
      isAuthenticated: false,
      accountType: null,
      user: null,
      business: null,
      isAdmin: false,
      pendingOtpEmail: null,
    });
  },

  refreshProfile: async () => {
    const accountType = get().accountType;
    if (accountType === 'user') {
      const { data } = await usersApi.getMe();
      await secureStorage.setUserData(JSON.stringify(data));
      set({ user: data, isAdmin: data.role === UserRole.ADMIN });
    } else if (accountType === 'business') {
      const { data } = await businessApi.getProfile();
      await secureStorage.setUserData(JSON.stringify(data));
      set({ business: data });
    }
  },

  setUser: (user: User) => set({ user }),
  setBusiness: (business: Business) => set({ business }),
}));
