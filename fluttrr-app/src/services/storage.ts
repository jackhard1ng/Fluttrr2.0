import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';

// Secure storage wrapper for sensitive data (tokens)
export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(Config.ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(Config.ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(Config.REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(Config.REFRESH_TOKEN_KEY, token);
  },

  async getAccountType(): Promise<'user' | 'business' | null> {
    const type = await SecureStore.getItemAsync(Config.ACCOUNT_TYPE_KEY);
    return type as 'user' | 'business' | null;
  },

  async setAccountType(type: 'user' | 'business'): Promise<void> {
    await SecureStore.setItemAsync(Config.ACCOUNT_TYPE_KEY, type);
  },

  async getUserData(): Promise<string | null> {
    return SecureStore.getItemAsync(Config.USER_DATA_KEY);
  },

  async setUserData(data: string): Promise<void> {
    await SecureStore.setItemAsync(Config.USER_DATA_KEY, data);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(Config.ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(Config.REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(Config.ACCOUNT_TYPE_KEY),
      SecureStore.deleteItemAsync(Config.USER_DATA_KEY),
    ]);
  },
};
