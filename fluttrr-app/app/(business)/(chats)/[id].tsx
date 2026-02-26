import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { chatsApi, type MessageWithSender } from '@/api/chats';
import { useAuthStore } from '@/stores/auth.store';
import {
  connectSocket,
  joinChatRoom,
  leaveChatRoom,
  emitTyping,
  emitStopTyping,
  getSocket,
} from '@/services/socket';
import { formatMessageTime } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';
import { SenderType } from '@/types/enums';

export default function BizChatRoomScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const { business, accountType } = useAuthStore();
  const chatId = id || '';

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = business?.id;

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!chatId) return;
      try {
        const { data } = await chatsApi.getMessages(chatId, { page: pageNum, limit: 50 });
        // Messages come oldest-first from API; reverse for inverted FlatList (newest at index 0)
        const reversed = [...data.messages].reverse();
        if (append) {
          // Append older messages at the end (bottom of inverted list = top of screen)
          setMessages((prev) => [...prev, ...reversed]);
        } else {
          setMessages(reversed);
        }
        setPage(pageNum);
        setTotalPages(data.totalPages);
        setLoadError(null);
      } catch (err) {
        if (!append) setLoadError(extractErrorMessage(err));
      }
    },
    [chatId],
  );

  useEffect(() => {
    if (!chatId) return;
    let mounted = true;
    let handleNewMessage: ((msg: MessageWithSender) => void) | null = null;
    let handleTypingEvt: ((data: { chatId: string; userId: string }) => void) | null = null;
    let handleStopTyping: ((data: { chatId: string; userId: string }) => void) | null = null;

    const setup = async () => {
      await fetchMessages(1);
      if (!mounted) return;
      setLoading(false);

      chatsApi.markRead(chatId).catch(() => {});

      try {
        const socket = await connectSocket();
        joinChatRoom(chatId);

        handleNewMessage = (message: MessageWithSender) => {
          if (message.chatId === chatId && mounted) {
            setMessages((prev) => [message, ...prev]);
            chatsApi.markRead(chatId).catch(() => {});
          }
        };
        handleTypingEvt = (data: { chatId: string; userId: string }) => {
          if (data.chatId === chatId && data.userId !== myId && mounted) {
            setTypingUsers((prev) =>
              prev.includes(data.userId) ? prev : [...prev, data.userId],
            );
          }
        };
        handleStopTyping = (data: { chatId: string; userId: string }) => {
          if (data.chatId === chatId && mounted) {
            setTypingUsers((prev) => prev.filter((uid) => uid !== data.userId));
          }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('typing', handleTypingEvt);
        socket.on('stop_typing', handleStopTyping);
      } catch {
        // Socket connection failed — messages still work via REST
      }
    };

    setup();

    return () => {
      mounted = false;
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      leaveChatRoom(chatId);
      const socket = getSocket();
      if (socket) {
        if (handleNewMessage) socket.off('new_message', handleNewMessage);
        if (handleTypingEvt) socket.off('typing', handleTypingEvt);
        if (handleStopTyping) socket.off('stop_typing', handleStopTyping);
      }
    };
  }, [chatId, fetchMessages, myId]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending || !chatId) return;

    setSending(true);
    setInputText('');
    emitStopTyping(chatId);

    try {
      const { data } = await chatsApi.sendMessage(chatId, content);
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [data, ...prev];
      });
    } catch (err) {
      Alert.alert('Send failed', extractErrorMessage(err));
      setInputText(content);
    }
    setSending(false);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (text.trim()) {
      emitTyping(chatId);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => emitStopTyping(chatId), 2000);
    } else {
      emitStopTyping(chatId);
    }
  };

  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchMessages(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchMessages]);

  const isMyMessage = (msg: MessageWithSender) => {
    return msg.senderType === SenderType.BUSINESS && msg.senderId === myId;
  };

  const getSenderName = (msg: MessageWithSender): string => {
    if (msg.sender?.displayName) return msg.sender.displayName;
    if (msg.sender?.businessName) return msg.sender.businessName;
    if (msg.sender?.username) return `@${msg.sender.username}`;
    return 'User';
  };

  const renderMessage = ({ item, index }: { item: MessageWithSender; index: number }) => {
    const mine = isMyMessage(item);
    // In inverted list, next visual message (above) is index+1
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const showSender = !mine && (!nextMsg || nextMsg.senderId !== item.senderId);

    return (
      <View style={[styles.msgWrapper, mine ? styles.msgRight : styles.msgLeft]}>
        {showSender && (
          <Text style={styles.msgSender}>{getSenderName(item)}</Text>
        )}
        <View style={[styles.msgBubble, mine ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.msgText, mine && styles.myMsgText]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.msgTime}>{formatMessageTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Chat'}
          </Text>
          {typingUsers.length > 0 && (
            <Text style={styles.typingText}>typing...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.blue} />
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>😞</Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{loadError}</Text>
            <TouchableOpacity onPress={() => { setLoadError(null); setLoading(true); fetchMessages(1).finally(() => setLoading(false)); }} style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.blue }}>
              <Text style={{ color: Colors.blue, fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={Colors.blue} style={{ marginVertical: 10 }} />
              ) : null
            }
            inverted
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={Colors.textSecondary + '88'}
            value={inputText}
            onChangeText={handleTyping}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={[
              styles.sendBtn,
              inputText.trim() ? styles.sendBtnActive : null,
            ]}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  backText: { fontSize: 28, color: Colors.blue, lineHeight: 28 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  typingText: { fontSize: 12, color: Colors.blue, fontStyle: 'italic' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },
  msgWrapper: { marginBottom: 6, maxWidth: '80%' },
  msgRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgSender: { fontSize: 11, color: Colors.blue, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  myBubble: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  myMsgText: { color: Colors.textWhite },
  msgTime: { fontSize: 10, color: Colors.textMuted, marginTop: 2, marginHorizontal: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: Colors.blue },
  sendText: { fontSize: 18, color: Colors.textWhite },
});
