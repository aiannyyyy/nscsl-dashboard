import type { Conversation } from '../../../services/ChatServices/chatService';

const isValidLabel = (value: unknown): value is string => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text.length > 0 && text !== '0';
};

export const getConversationDisplayName = (conversation: {
  position?: string;
  name?: string;
  user_name?: string;
  conversationName?: string;
} | null): string => {
  if (!conversation) return 'User';

  const candidates = [
    conversation.position,
    conversation.name,
    conversation.user_name,
    conversation.conversationName,
  ];

  for (const candidate of candidates) {
    if (isValidLabel(candidate)) return String(candidate).trim();
  }

  return 'User';
};

export const getConversationInitial = (conversation: Parameters<typeof getConversationDisplayName>[0]) =>
  getConversationDisplayName(conversation).charAt(0).toUpperCase();

export const isUserOnline = (value: unknown) => value === true || value === 1 || value === '1';
