import client from './client';
import type { Message, Chat } from '@/types/models';

interface ChatListItem {
  id: string;
  type: string;
  event: {
    id: string;
    title: string;
    emoji: string;
    date: string;
  } | null;
  lastMessage: Message | null;
  memberCount: number;
  hasUnread: boolean;
  joinedAt: string;
}

interface ChatListResponse {
  chats: ChatListItem[];
}

interface MessageSender {
  id: string;
  username?: string;
  displayName?: string;
  profilePhoto?: string;
  businessName?: string;
  logo?: string;
}

interface MessageWithSender extends Omit<Message, 'sender'> {
  sender: MessageSender;
}

interface MessagesResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  totalPages: number;
}

interface DmResponse {
  chatId: string;
  existing: boolean;
}

export type { ChatListItem, ChatListResponse, MessageWithSender, MessagesResponse, DmResponse };

export const chatsApi = {
  list() {
    return client.get<ChatListResponse>('/api/chats');
  },

  getMessages(chatId: string, params?: { page?: number; limit?: number }) {
    return client.get<MessagesResponse>(`/api/chats/${chatId}/messages`, { params });
  },

  sendMessage(chatId: string, content: string) {
    return client.post<MessageWithSender>(`/api/chats/${chatId}/messages`, { content });
  },

  startDm(data: { targetUserId?: string; targetBusinessId?: string }) {
    return client.post<DmResponse>('/api/chats/dm', data);
  },

  markRead(chatId: string) {
    return client.put(`/api/chats/${chatId}/read`);
  },
};
