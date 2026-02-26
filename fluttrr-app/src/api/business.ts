import client from './client';
import type { Business, Event } from '@/types/models';
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

export type { BusinessProfileResponse, BusinessStatsResponse, BusinessEventsResponse, BusinessEventItem };

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
    fcmToken?: string;
  }) {
    return client.put<BusinessProfileResponse>('/api/business/profile', data);
  },

  getStats() {
    return client.get<BusinessStatsResponse>('/api/business/stats');
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
