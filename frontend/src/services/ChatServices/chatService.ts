import api from '../api';

// ============================================
// TYPES
// ============================================

export interface ChatUser {
  id: number;
  user_name: string;
  name: string;
  email: string;
  position?: string;
  department?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Conversation {
  id: number;
  conversationName: string;
  conversationType: 'direct' | 'group';
  createdAt: string;
  otherUserId: number;
  name: string;
  user_name: string;
  email: string;
  position?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline: boolean;
  unreadCount: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  userId: number;
  user_name: string;
  name: string;
  email: string;
  position?: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: { userId: number; userName: string; name: string }[];
  currentUserReacted?: boolean;
}

export interface DefaultEmoji {
  emoji: string;
  label: string;
}

export interface SendMessagePayload {
  conversationId: number;
  content: string;
  messageType?: 'text' | 'file' | 'image';
  fileUrl?: string;
}

export interface CreateConversationPayload {
  otherUserId: number;
}

export interface CreateConversationResponse {
  id: number;
  isNew: boolean;
}

export interface UnreadCountResponse {
  conversationId: number;
  unreadCount: number;
}

export interface UserStatusResponse {
  userId: number;
  user_name: string;
  name: string;
  position?: string;
  department?: string;
  isOnline: boolean;
  lastSeen?: string;
}

// ============================================
// CONVERSATION SERVICES
// ============================================

const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await api.get('/chat/conversations');
  return data;
};

const createConversation = async (
  payload: CreateConversationPayload
): Promise<CreateConversationResponse> => {
  const { data } = await api.post('/chat/conversations', payload);
  return data;
};

// ============================================
// MESSAGE SERVICES
// ============================================

const getMessages = async (
  conversationId: number,
  limit = 50,
  offset = 0
): Promise<Message[]> => {
  const { data } = await api.get(`/chat/messages/${conversationId}`, {
    params: { limit, offset },
  });
  return data;
};

const sendMessage = async (payload: SendMessagePayload): Promise<Message> => {
  const { data } = await api.post('/chat/messages', payload);
  return data;
};

const deleteMessage = async (messageId: number): Promise<void> => {
  await api.delete(`/chat/messages/${messageId}`);
};

const markAsRead = async (conversationId: number): Promise<void> => {
  await api.post('/chat/messages/read', { conversationId });
};

const getUnreadCount = async (conversationId: number): Promise<UnreadCountResponse> => {
  const { data } = await api.get(`/chat/messages/${conversationId}/unread-count`);
  return data;
};

const getAllUnreadMessages = async (): Promise<Message[]> => {
  const { data } = await api.get('/chat/messages/unread');
  return data;
};

const searchMessages = async (
  conversationId: number,
  searchTerm: string
): Promise<Message[]> => {
  const { data } = await api.get('/chat/search', {
    params: { conversationId, searchTerm },
  });
  return data;
};

// ============================================
// FILE SERVICES
// ============================================

const uploadFile = async (file: File): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

const attachFile = async (
  conversationId: number,
  file: File
): Promise<Message> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', String(conversationId));
  const { data } = await api.post('/chat/messages/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// ============================================
// USER / STATUS SERVICES
// ============================================

const getUsers = async (search = ''): Promise<ChatUser[]> => {
  const { data } = await api.get('/chat/users', {
    params: search ? { search } : {},
  });
  return data;
};

const getUserStatus = async (): Promise<UserStatusResponse[]> => {
  const { data } = await api.get('/chat/status');
  return data;
};

const updateUserStatus = async (isOnline: boolean): Promise<void> => {
  await api.put('/chat/status', { isOnline });
};

// ============================================
// REACTION SERVICES
// ============================================

const getDefaultEmojis = async (): Promise<DefaultEmoji[]> => {
  const { data } = await api.get('/chat/reactions/emojis');
  return data;
};

const getMessageReactions = async (messageId: number): Promise<{
  messageId: number;
  reactions: MessageReaction[];
}> => {
  const { data } = await api.get(`/chat/reactions/${messageId}`);
  return data;
};

const addReaction = async (
  messageId: number,
  emoji: string
): Promise<{ messageId: number; reactions: MessageReaction[] }> => {
  const { data } = await api.post('/chat/reactions', { messageId, emoji });
  return data;
};

const removeReaction = async (
  messageId: number,
  emoji: string
): Promise<{ messageId: number; reactions: MessageReaction[] }> => {
  const { data } = await api.delete('/chat/reactions', {
    data: { messageId, emoji },
  });
  return data;
};

// ============================================
// EXPORT
// ============================================

export const chatService = {
  // Conversations
  getConversations,
  createConversation,

  // Messages
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
  getAllUnreadMessages,
  searchMessages,

  // Files
  uploadFile,
  attachFile,

  // Users / Status
  getUsers,
  getUserStatus,
  updateUserStatus,

  // Reactions
  getDefaultEmojis,
  getMessageReactions,
  addReaction,
  removeReaction,
};

export default chatService;