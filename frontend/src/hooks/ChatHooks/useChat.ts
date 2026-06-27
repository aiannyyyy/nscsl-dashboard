import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { isMockMode } from '../../mocks/config';
import chatService, {
  type Conversation,
  type Message,
  type MessageReaction,
} from '../../services/ChatServices/chatService';

// ============================================
// QUERY KEYS
// ============================================

export const chatKeys = {
  all:           () => ['chat'] as const,
  conversations: () => ['chat', 'conversations'] as const,
  messages:      (conversationId: number | string) => ['chat', 'messages', toNum(conversationId)] as const,
  users:         (search?: string) => ['chat', 'users', search ?? ''] as const,
  status:        () => ['chat', 'status'] as const,
  unread:        () => ['chat', 'unread'] as const,
  unreadCount:   (conversationId: number) => ['chat', 'unread', conversationId] as const,
  reactions:     (messageId: number) => ['chat', 'reactions', messageId] as const,
  emojis:        () => ['chat', 'emojis'] as const,
};

// ============================================
// SOCKET SINGLETON
// ============================================

let socketInstance: Socket | null = null;

const getSocket = (): Socket | null => {
  if (isMockMode()) return null;

  if (!socketInstance) {
    const BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socketInstance = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socketInstance;
};

const toNum = (id: number | string | undefined | null) => Number(id);

const msgKey = (conversationId: number | string) =>
  chatKeys.messages(toNum(conversationId));

// ============================================
// 1. useConversations
// ============================================

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: chatService.getConversations,
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

// ============================================
// 2. useMessages
// ============================================

export const useMessages = (
  conversationId: number | null,
  options?: Partial<UseQueryOptions<Message[]>>
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: chatKeys.messages(conversationId!),
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: !!user && !!conversationId,
    staleTime: 10_000,
    ...options,
  });
};

// ============================================
// 3. useChatUsers
// ============================================

export const useChatUsers = (search = '') => {
  return useQuery({
    queryKey: chatKeys.users(search),
    queryFn: () => chatService.getUsers(search),
    staleTime: 60_000,
  });
};

// ============================================
// 4. useUserStatus
// ============================================

export const useUserStatus = () => {
  return useQuery({
    queryKey: chatKeys.status(),
    queryFn: chatService.getUserStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

// ============================================
// 5. useUnreadMessages
// ============================================

export const useUnreadMessages = () => {
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: chatService.getAllUnreadMessages,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
};

// ============================================
// 6. useDefaultEmojis
// ============================================

export const useDefaultEmojis = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: chatKeys.emojis(),
    queryFn: chatService.getDefaultEmojis,
    enabled: !!user,
    staleTime: Infinity,
    retry: 1,
  });
};

// ============================================
// 7. useSendMessage
// ============================================

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: (newMessage) => {
      const { conversationId } = newMessage;

      // Add to messages cache immediately (sender sees it right away)
      queryClient.setQueryData<Message[]>(
        msgKey(conversationId),
        (old = []) => {
          if (old.some((m) => toNum(m.id) === toNum(newMessage.id))) return old;
          return [...old, newMessage];
        }
      );

      // Update conversation last message
      const preview =
        newMessage.messageType === 'text'
          ? newMessage.content
          : newMessage.fileName || newMessage.content;

      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (old = []) =>
          old.map((c) =>
            toNum(c.id) === toNum(conversationId)
              ? {
                  ...c,
                  lastMessage: preview,
                  lastMessageTime: newMessage.createdAt,
                }
              : c
          )
      );
    },
  });
};

// ============================================
// 8. useCreateConversation
// ============================================

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
};

// ============================================
// 9. useDeleteMessage
// ============================================

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: { messageId: number; conversationId: number }) =>
      chatService.deleteMessage(messageId),
    onSuccess: (_, { messageId, conversationId }) => {
      queryClient.setQueryData<Message[]>(
        msgKey(conversationId),
        (old = []) =>
          old.map((m) =>
            toNum(m.id) === toNum(messageId)
              ? { ...m, content: 'This message was removed', isDeleted: true }
              : m
          )
      );
    },
  });
};

// ============================================
// 10. useMarkAsRead
// ============================================

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.markAsRead,
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (old = []) =>
          old.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          )
      );

      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
};

// ============================================
// 11. useAttachFile
// ============================================

export const useAttachFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      file,
    }: {
      conversationId: number;
      file: File;
    }) => chatService.attachFile(conversationId, file),
    onSuccess: (newMessage) => {
      const { conversationId } = newMessage;

      queryClient.setQueryData<Message[]>(
        msgKey(conversationId),
        (old = []) => {
          if (old.some((m) => toNum(m.id) === toNum(newMessage.id))) return old;
          return [...old, newMessage];
        }
      );

      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
};

// ============================================
// 12. useAddReaction
// ============================================

export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string; conversationId: number }) =>
      chatService.addReaction(messageId, emoji),
    onSuccess: (data, { conversationId }) => {
      queryClient.setQueryData<Message[]>(
        msgKey(conversationId),
        (old = []) =>
          old.map((m) =>
            toNum(m.id) === toNum(data.messageId) ? { ...m, reactions: data.reactions } : m
          )
      );
    },
  });
};

// ============================================
// 13. useRemoveReaction
// ============================================

export const useRemoveReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string; conversationId: number }) =>
      chatService.removeReaction(messageId, emoji),
    onSuccess: (data, { conversationId }) => {
      queryClient.setQueryData<Message[]>(
        msgKey(conversationId),
        (old = []) =>
          old.map((m) =>
            toNum(m.id) === toNum(data.messageId) ? { ...m, reactions: data.reactions } : m
          )
      );
    },
  });
};

// ============================================
// 14. useUpdateUserStatus
// ============================================

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.updateUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.status() });
    },
  });
};

// ============================================
// 15. useSocket — Main real-time hook
// ============================================

export const useSocket = (
  activeConversationId: number | null,
  allConversationIds: number[] = []
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socket = getSocket();
  const joinedRooms = useRef<Set<number>>(new Set());
  const allConvIdsRef = useRef(allConversationIds);
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);

  useEffect(() => {
    allConvIdsRef.current = allConversationIds;
  }, [allConversationIds]);

  // Keep a ref to activeConversationId so socket callbacks always see the latest
  // value without needing to re-register listeners on every change
  const activeConvIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const joinRooms = useCallback(
    (ids: number[]) => {
      if (!socket) return;
      for (const rawId of ids) {
        const id = toNum(rawId);
        if (!joinedRooms.current.has(id)) {
          socket.emit('conversation:join', { conversationId: id });
          joinedRooms.current.add(id);
        }
      }
    },
    [socket]
  );

  const joinConversation = useCallback(
    (conversationId: number) => {
      if (!socket) return;
      const id = toNum(conversationId);
      socket.emit('conversation:join', { conversationId: id });
      joinedRooms.current.add(id);
    },
    [socket]
  );

  const emitUserJoin = useCallback(() => {
    if (!user || !socket) return;
    socket.emit('user:join', {
      userId: toNum(user.id),
      name: user.name,
      user_name: user.name,
    });
  }, [socket, user]);

  // ── Reset on logout, refresh on login ───────────────────────────────
  useEffect(() => {
    if (!user) {
      joinedRooms.current.clear();
      if (socket?.connected) socket.disconnect();
      setIsConnected(false);
      queryClient.removeQueries({ queryKey: chatKeys.all() });
      return;
    }

    queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
  }, [user, queryClient, socket]);

  // ── Connect & register all incoming event handlers ──────────────────
  useEffect(() => {
    if (!user || !socket || isMockMode()) return;

    // ── Incoming: new message ──────────────────────────────────────────
    const onNewMessage = ({
      conversationId,
      message,
    }: {
      conversationId: number;
      message: Message;
    }) => {
      const cid = toNum(conversationId);

      queryClient.setQueryData<Message[]>(msgKey(cid), (old = []) => {
        if (old.some((m) => toNum(m.id) === toNum(message.id))) return old;
        return [...old, message];
      });

      const preview =
        message.messageType === 'text'
          ? message.content
          : message.fileName || message.content;

      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (old = []) =>
          old.map((c) =>
            toNum(c.id) === cid
              ? {
                  ...c,
                  lastMessage: preview,
                  lastMessageTime: message.createdAt,
                  unreadCount:
                    cid === toNum(activeConvIdRef.current)
                      ? 0
                      : (Number(c.unreadCount) || 0) + 1,
                }
              : c
          )
      );
    };

    // ── Incoming: unread badge bump (user not in room) ─────────────────
    const onUnreadMessage = ({
      conversationId,
      message,
    }: {
      conversationId: number;
      message: Message;
    }) => {
      const cid = toNum(conversationId);

      queryClient.setQueryData<Message[]>(msgKey(cid), (old = []) => {
        if (old.some((m) => toNum(m.id) === toNum(message.id))) return old;
        return [...old, message];
      });

      const preview =
        message.messageType === 'text'
          ? message.content
          : message.fileName || message.content;

      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (old = []) =>
          old.map((c) =>
            toNum(c.id) === cid
              ? {
                  ...c,
                  lastMessage: preview,
                  lastMessageTime: message.createdAt,
                  unreadCount:
                    cid === toNum(activeConvIdRef.current)
                      ? 0
                      : (Number(c.unreadCount) || 0) + 1,
                }
              : c
          )
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    };

    // ── Incoming: message deleted ──────────────────────────────────────
    const onMessageDeleted = ({
      conversationId,
      messageId,
      modifiedContent,
    }: {
      conversationId: number;
      messageId: number;
      modifiedContent: string;
    }) => {
      queryClient.setQueryData<Message[]>(msgKey(conversationId), (old = []) =>
        old.map((m) =>
          toNum(m.id) === toNum(messageId)
            ? { ...m, content: modifiedContent, isDeleted: true }
            : m
        )
      );
    };

    // ── Incoming: reaction updated ─────────────────────────────────────
    const onMessageReacted = ({
      conversationId,
      messageId,
      reactions,
    }: {
      conversationId: number;
      messageId: number;
      reactions: MessageReaction[];
    }) => {
      queryClient.setQueryData<Message[]>(msgKey(conversationId), (old = []) =>
        old.map((m) =>
          toNum(m.id) === toNum(messageId) ? { ...m, reactions } : m
        )
      );
    };

    // ── Incoming: messages read by other user ──────────────────────────
    const onMessagesRead = ({ conversationId }: { conversationId: number }) => {
      queryClient.setQueryData<Message[]>(msgKey(conversationId), (old = []) =>
        old.map((m) => ({ ...m, isRead: true }))
      );
    };

    // ── Incoming: online users list ────────────────────────────────────
    const onUsersOnline = (onlineUserIds: number[]) => {
      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(),
        (old = []) =>
          old.map((c) => ({
            ...c,
            isOnline: onlineUserIds.some((id) => toNum(id) === toNum(c.otherUserId)),
          }))
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.status() });
    };

    const onConnect = () => {
      setIsConnected(true);
      joinedRooms.current.clear();
      emitUserJoin();
      joinRooms(allConvIdsRef.current);
    };

    socket.on('connect', onConnect);
    socket.on('message:new', onNewMessage);
    socket.on('message:unread', onUnreadMessage);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:reacted', onMessageReacted);
    socket.on('messages:read', onMessagesRead);
    socket.on('users:online', onUsersOnline);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }
    emitUserJoin();

    return () => {
      socket.off('connect', onConnect);
      socket.off('message:new', onNewMessage);
      socket.off('message:unread', onUnreadMessage);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:reacted', onMessageReacted);
      socket.off('messages:read', onMessagesRead);
      socket.off('users:online', onUsersOnline);
    };
    // Only re-run when user changes — activeConversationId is handled via ref above
  }, [user, queryClient, emitUserJoin, joinRooms]);

  // ── Join all conversation rooms for real-time updates ──────────────
  useEffect(() => {
    if (!user || allConversationIds.length === 0) return;
    joinRooms(allConversationIds);
  }, [user, allConversationIds, joinRooms]);

  // ── Always join the active conversation room immediately ───────────
  useEffect(() => {
    if (!user || !activeConversationId) return;
    joinConversation(activeConversationId);
  }, [user, activeConversationId, joinConversation]);

  // ── Typing helpers ──────────────────────────────────────────────────
  const emitTypingStart = useCallback(
    (conversationId: number) => {
      if (!user || !socket) return;
      socket.emit('typing:start', {
        conversationId,
        userId: toNum(user.id),
        user_name: user.name,
      });
    },
    [user, socket]
  );

  const emitTypingStop = useCallback(
    (conversationId: number) => {
      if (!user || !socket) return;
      socket.emit('typing:stop', {
        conversationId,
        userId: toNum(user.id),
        user_name: user.name,
      });
    },
    [user, socket]
  );

  // ── Typing state — uses useState so changes cause re-renders ────────
  //
  // Previously this used useRef which never triggered a re-render,
  // so "PDO1 is typing…" would never appear in the UI.
  //
  const useTypingUsers = (conversationId: number | null) => {
    const [typingMap, setTypingMap] = useState<Map<number, string>>(new Map());

    useEffect(() => {
      if (!conversationId || !socket) return;

      const onTypingUpdate = ({
        conversationId: cid,
        userId,
        user_name,
        isTyping,
      }: {
        conversationId: number;
        userId: number;
        user_name: string;
        isTyping: boolean;
      }) => {
        if (cid !== conversationId) return;

        setTypingMap((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, user_name);
          } else {
            next.delete(userId);
          }
          return next;
        });
      };

      socket.on('typing:update', onTypingUpdate);
      return () => {
        socket.off('typing:update', onTypingUpdate);
        // Clear typing state when leaving the conversation
        setTypingMap(new Map());
      };
    }, [conversationId, socket]);

    return typingMap;
  };

  useEffect(() => {
    if (!socket) return;
    const onDisconnect = () => setIsConnected(false);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return {
    socket,
    emitTypingStart,
    emitTypingStop,
    joinConversation,
    useTypingUsers,
    isConnected,
  };
};