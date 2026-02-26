import client from './client';
import type { Moment, MomentComment } from '@/types/models';

interface MomentWithCounts extends Omit<Moment, 'user'> {
  likeCount: number;
  commentCount: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePhoto: string;
  };
}

interface MomentDetailResponse extends MomentWithCounts {
  comments: (MomentComment & {
    user: { id: string; username: string; displayName: string; profilePhoto: string };
  })[];
}

interface MomentsListResponse {
  moments: MomentWithCounts[];
  total: number;
  page: number;
  totalPages: number;
}

interface CommentsResponse {
  comments: (MomentComment & {
    user: { id: string; username: string; displayName: string; profilePhoto: string };
  })[];
  total: number;
  page: number;
  totalPages: number;
}

export type { MomentWithCounts, MomentDetailResponse, MomentsListResponse, CommentsResponse };

export const momentsApi = {
  list(params?: { page?: number; limit?: number; userId?: string; eventId?: string }) {
    return client.get<MomentsListResponse>('/api/moments', { params });
  },

  getById(id: string) {
    return client.get<MomentDetailResponse>(`/api/moments/${id}`);
  },

  create(data: { content?: string; photos?: string[]; eventId?: string }) {
    return client.post<MomentWithCounts>('/api/moments', data);
  },

  delete(id: string) {
    return client.delete<{ message: string }>(`/api/moments/${id}`);
  },

  like(id: string) {
    return client.post<{ message: string; likeCount: number }>(`/api/moments/${id}/like`);
  },

  unlike(id: string) {
    return client.delete<{ message: string; likeCount: number }>(`/api/moments/${id}/like`);
  },

  checkLiked(id: string) {
    return client.get<{ liked: boolean }>(`/api/moments/${id}/likes/check`);
  },

  comment(id: string, content: string) {
    return client.post<MomentComment & {
      user: { id: string; username: string; displayName: string; profilePhoto: string };
    }>(`/api/moments/${id}/comments`, { content });
  },

  getComments(id: string, params?: { page?: number; limit?: number }) {
    return client.get<CommentsResponse>(`/api/moments/${id}/comments`, { params });
  },
};
