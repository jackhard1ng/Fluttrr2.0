import client from './client';
import type { EventRecap } from '@/types/models';

interface RecapsListResponse {
  recaps: EventRecap[];
  total: number;
  page: number;
  totalPages: number;
}

export const recapsApi = {
  /** Create a recap for an event (business auth) */
  create(data: { eventId: string; content?: string; photos?: string[] }) {
    return client.post<EventRecap>('/api/recaps', data);
  },

  /** Get all recaps for the authenticated business */
  mine(params?: { page?: number; limit?: number }) {
    return client.get<RecapsListResponse>('/api/recaps/mine', { params });
  },

  /** Get all recaps for a public business profile */
  forBusiness(businessId: string, params?: { page?: number; limit?: number }) {
    return client.get<RecapsListResponse>(`/api/recaps/business/${businessId}`, { params });
  },

  /** Update a recap */
  update(id: string, data: { content?: string; photos?: string[] }) {
    return client.put<EventRecap>(`/api/recaps/${id}`, data);
  },

  /** Delete a recap */
  delete(id: string) {
    return client.delete<{ message: string }>(`/api/recaps/${id}`);
  },
};
