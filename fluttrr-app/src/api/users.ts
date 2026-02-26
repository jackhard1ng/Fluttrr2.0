import client from './client';
import type { User, Notification } from '@/types/models';
import type { PaginatedResponse, UpdateUserData } from '@/types/api';

export const usersApi = {
  getMe() {
    return client.get<User>('/api/users/me');
  },

  updateMe(data: UpdateUserData) {
    return client.put<User>('/api/users/me', data);
  },

  getMyEvents(params?: { page?: number; status?: string }) {
    return client.get('/api/users/me/events', { params });
  },

  getNotifications(params?: { page?: number }) {
    return client.get<PaginatedResponse<Notification>>('/api/users/me/notifications', { params });
  },

  markAllNotificationsRead() {
    return client.put('/api/users/me/notifications/read');
  },

  getUserById(id: string) {
    return client.get<User>(`/api/users/${id}`);
  },

  blockUser(id: string) {
    return client.post(`/api/users/${id}/block`);
  },

  unblockUser(id: string) {
    return client.delete(`/api/users/${id}/block`);
  },

  getBlockedUsers() {
    return client.get('/api/users/me/blocked');
  },

  report(data: { reportType: string; targetId: string; reason: string; details?: string }) {
    return client.post('/api/users/report', data);
  },
};
