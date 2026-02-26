// API response types

import type { User, Business, Event, Message, Chat, Notification, EventAttendee, Review, Report, AdminMessage } from './models';

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Auth
export interface AuthResponse {
  user?: User;
  business?: Business;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  bio?: string;
  city?: string;
}

export interface RegisterBusinessData {
  email: string;
  password: string;
  businessName: string;
  address: string;
  description?: string;
  phone?: string;
  website?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyOtpData {
  email: string;
  code: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}

// Events
export interface EventListParams {
  page?: number;
  limit?: number;
  category?: string;
  date?: string;
  area?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface EventSearchParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  area?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime?: string;
  date: string;
  maxSpots?: number;
  area?: string;
  color?: string;
  emoji?: string;
  recurring?: string;
  recurringDay?: number;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

// Chat
export interface SendMessageData {
  content: string;
}

export interface StartDmData {
  targetUserId?: string;
  targetBusinessId?: string;
}

// User profile
export interface UpdateUserData {
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  city?: string;
}

// Business profile
export interface UpdateBusinessData {
  businessName?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
}

// Reviews
export interface CreateReviewData {
  rating: number;
  content?: string;
}

// Reports
export interface CreateReportData {
  reportType: string;
  targetId: string;
  reason: string;
  details?: string;
}

// Admin
export interface AdminStatsResponse {
  totalUsers: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  totalEvents: number;
  activeEvents: number;
  totalReports: number;
  pendingReports: number;
}

export interface BusinessStatsResponse {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalViews: number;
  averageRating: number;
  totalReviews: number;
}

export interface AdminSendMessageData {
  targetType: string;
  targetId?: string;
  subject: string;
  body: string;
}

// Error
export interface ApiError {
  error: string;
  code?: string;
  errors?: { field: string; message: string }[];
}
