import client from './client';
import type { Business, Event, Review } from '@/types/models';
import type { CreateEventData } from '@/types/api';

interface BusinessProfileResponse extends Business {
  eventCount: number;
  reviewCount: number;
  avgRating: number | null;
}

interface BusinessStatsResponse {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalViews: number;
  avgRating: number | null;
  reviewCount: number;
  recentAttendees: number;
}

interface BusinessEventItem extends Event {
  attendeeCount: number;
}

interface BusinessEventsResponse {
  events: BusinessEventItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface PublicBusinessResponse {
  id: string;
  businessName: string;
  description: string | null;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  photos: string[];
  verified: boolean;
  createdAt: string;
  events: (Event & { attendeeCount: number })[];
  reviews: (Review & { user: { id: string; username: string; displayName: string; profilePhoto: string } })[];
  avgRating: number | null;
  reviewCount: number;
}

interface PublicReviewsResponse {
  reviews: (Review & { user: { id: string; username: string; displayName: string; profilePhoto: string } })[];
  total: number;
  page: number;
  totalPages: number;
}

export type { BusinessProfileResponse, BusinessStatsResponse, BusinessEventsResponse, BusinessEventItem, PublicBusinessResponse, PublicReviewsResponse };

export const businessApi = {
  getProfile() {
    return client.get<BusinessProfileResponse>('/api/business/profile');
  },

  updateProfile(data: {
    businessName?: string;
    description?: string;
    address?: string;
    phone?: string;
    website?: string;
    logo?: string;
    photos?: string[];
    fcmToken?: string;
  }) {
    return client.put<BusinessProfileResponse>('/api/business/profile', data);
  },

  getStats() {
    return client.get<BusinessStatsResponse>('/api/business/stats');
  },

  getAnalytics(days?: number) {
    return client.get<{
      period: number;
      dailyJoins: { date: string; count: number }[];
      topEvents: { id: string; title: string; views: number; date: string }[];
      categoryBreakdown: { category: string; count: number }[];
      recentReviews: { id: string; rating: number; content: string | null; user: { displayName: string; profilePhoto: string }; createdAt: string }[];
      eventsThisMonth: number;
      subscriptionTier: string;
    }>('/api/business/analytics', { params: { days } });
  },

  getEvents(params?: { filter?: 'all' | 'active' | 'past'; page?: number; limit?: number }) {
    return client.get<BusinessEventsResponse>('/api/business/events', { params });
  },

  createEvent(data: CreateEventData) {
    return client.post<Event & { chatId: string }>('/api/events', data);
  },

  updateEvent(id: string, data: Partial<CreateEventData>) {
    return client.put<Event>(`/api/events/${id}`, data);
  },

  deleteEvent(id: string) {
    return client.delete<{ message: string }>(`/api/events/${id}`);
  },
};

export const stripeApi = {
  checkout(plan: 'GROWTH' | 'PRO') {
    return client.post<{ url: string; sessionId: string }>('/api/stripe/checkout', { plan });
  },
  portal() {
    return client.post<{ url: string }>('/api/stripe/portal');
  },
  status() {
    return client.get<{ tier: string; endsAt: string | null; hasSubscription: boolean }>('/api/stripe/status');
  },
};

export const businessPublicApi = {
  getById(id: string) {
    return client.get<PublicBusinessResponse>(`/api/business/${id}`);
  },

  getReviews(id: string, params?: { page?: number; limit?: number }) {
    return client.get<PublicReviewsResponse>(`/api/business/${id}/reviews`, { params });
  },

  createReview(businessId: string, data: { rating: number; content?: string }) {
    return client.post(`/api/business/${businessId}/reviews`, data);
  },

  updateReview(businessId: string, data: { rating?: number; content?: string }) {
    return client.put(`/api/business/${businessId}/reviews`, data);
  },

  deleteReview(businessId: string) {
    return client.delete(`/api/business/${businessId}/reviews`);
  },
};
