import client from './client';
import type { Event, EventAttendee } from '@/types/models';

// Response types matching the backend exactly
interface EventListResponse {
  events: (Event & { attendeeCount: number; spotsLeft: number | null })[];
  total: number;
  page: number;
  totalPages: number;
}

interface FeaturedResponse {
  events: (Event & { attendeeCount: number; spotsLeft: number | null })[];
}

interface EventDetailResponse extends Omit<Event, 'attendees'> {
  attendees: {
    id: string;
    username: string;
    displayName: string;
    profilePhoto: string;
    joinedAt: string;
  }[];
  attendeeCount: number;
  spotsLeft: number | null;
  chatId: string | null;
}

interface AttendeesResponse {
  attendees: {
    id: string;
    username: string;
    displayName: string;
    profilePhoto: string;
    joinedAt: string;
  }[];
}

export type { EventListResponse, FeaturedResponse, EventDetailResponse, AttendeesResponse };

export interface EventListParams {
  category?: string;
  date?: string;
  area?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
  sort?: 'date' | 'newest' | 'popular' | 'distance';
}

export const eventsApi = {
  list(params?: EventListParams) {
    return client.get<EventListResponse>('/api/events', { params });
  },

  featured() {
    return client.get<FeaturedResponse>('/api/events/featured');
  },

  search(q: string, params?: { page?: number; limit?: number }) {
    return client.get<EventListResponse>('/api/events/search', {
      params: { q, ...params },
    });
  },

  getById(id: string) {
    return client.get<EventDetailResponse>(`/api/events/${id}`);
  },

  join(id: string, guestCount?: number) {
    return client.post<{ message: string; chatId: string | null; guestCount: number }>(`/api/events/${id}/join`, guestCount ? { guestCount } : undefined);
  },

  leave(id: string) {
    return client.delete<{ message: string }>(`/api/events/${id}/leave`);
  },

  getAttendees(id: string) {
    return client.get<AttendeesResponse>(`/api/events/${id}/attendees`);
  },
};
