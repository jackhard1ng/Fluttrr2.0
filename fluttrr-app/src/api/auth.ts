import client from './client';
import type {
  AuthResponse,
  LoginData,
  RegisterUserData,
  RegisterBusinessData,
  VerifyOtpData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/types/api';

export const authApi = {
  registerUser(data: RegisterUserData) {
    return client.post<AuthResponse>('/api/auth/register', data);
  },

  registerBusiness(data: RegisterBusinessData) {
    return client.post<AuthResponse>('/api/auth/register/business', data);
  },

  login(data: LoginData) {
    return client.post<AuthResponse>('/api/auth/login', data);
  },

  loginBusiness(data: LoginData) {
    return client.post<AuthResponse>('/api/auth/login/business', data);
  },

  verifyOtp(data: VerifyOtpData) {
    return client.post<{ message: string }>('/api/auth/verify-otp', data);
  },

  resendOtp(email: string) {
    return client.post('/api/auth/resend-otp', { email });
  },

  refresh(refreshToken: string) {
    return client.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken });
  },

  forgotPassword(data: ForgotPasswordData) {
    return client.post('/api/auth/forgot-password', data);
  },

  resetPassword(data: ResetPasswordData) {
    return client.post('/api/auth/reset-password', data);
  },
};
