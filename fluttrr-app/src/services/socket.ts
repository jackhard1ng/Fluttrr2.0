import { io, Socket } from 'socket.io-client';
import { Config } from '@/constants/config';
import { secureStorage } from './storage';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await secureStorage.getAccessToken();
  if (!token) throw new Error('No auth token for socket connection');

  socket = io(Config.SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
    // Timeout after 10s
    setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChatRoom(chatId: string) {
  socket?.emit('join_chat', chatId);
}

export function leaveChatRoom(chatId: string) {
  socket?.emit('leave_chat', chatId);
}

export function emitTyping(chatId: string) {
  socket?.emit('typing', chatId);
}

export function emitStopTyping(chatId: string) {
  socket?.emit('stop_typing', chatId);
}
