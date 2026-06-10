import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useMarkAsRead,
  useAttachFile,
  useAddReaction,
  useRemoveReaction,
  useCreateConversation,
  useSocket,
} from '../../hooks/ChatHooks/useChat';

import ConversationList from './components/ConversationList';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import MessageInput from './components/MessageInput';
import TypingIndicator from './components/TypingIndicator';
import UserSearch from './components/UserSearch';

type View = 'list' | 'chat' | 'new';

const FloatingChat: React.FC = () => {
  const { user, isLoading } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [convSearch, setConvSearch] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user ? Number(user.id) : 0;

  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useConversations();
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isFetching: messagesFetching,
    refetch: refetchMessages,
  } = useMessages(activeConversationId);

  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const markAsRead = useMarkAsRead();
  const attachFile = useAttachFile();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const createConversation = useCreateConversation();

  const conversationIds = useMemo(
    () => conversations.map((c) => c.id),
    [conversations]
  );

  const { emitTypingStart, emitTypingStop, joinConversation, useTypingUsers, isConnected } =
    useSocket(activeConversationId, conversationIds);

  // useTypingUsers returns reactive state now (useState inside), so the
  // typing indicator will actually re-render when someone starts/stops typing
  const typingMap = useTypingUsers(activeConversationId);
  const typingNames = Array.from(typingMap.values());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (activeConversationId && isOpen) {
      markAsRead.mutate(activeConversationId);
    }
  }, [activeConversationId, isOpen]);

  // Fresh data when opening the chat widget after login
  useEffect(() => {
    if (isOpen && user) {
      refetchConversations();
    }
  }, [isOpen, user, refetchConversations]);

  // Always fetch messages when entering a conversation
  useEffect(() => {
    if (view === 'chat' && activeConversationId && isOpen) {
      refetchMessages();
    }
  }, [view, activeConversationId, isOpen, refetchMessages]);

  // Only count conversations with actual unread messages
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (Number(c.unreadCount) > 0 ? Number(c.unreadCount) : 0),
    0
  );

  const handleSelectConversation = useCallback(
    (id: number) => {
      joinConversation(id);
      setActiveConversationId(id);
      setView('chat');
      setMsgSearch('');
      setMsgSearchOpen(false);
    },
    [joinConversation]
  );

  const handleBack = useCallback(() => {
    setView('list');
    setActiveConversationId(null);
    setMsgSearch('');
    setMsgSearchOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setView('new');
    setConvSearch('');
  }, []);

  const handleSelectUser = useCallback(
    async (userId: number) => {
      try {
        const res = await createConversation.mutateAsync({ otherUserId: userId });
        handleSelectConversation(res.id);
      } catch (e) {
        console.error('Failed to create conversation', e);
      }
    },
    [createConversation, handleSelectConversation]
  );

  const handleSend = useCallback(
    (content: string) => {
      if (!activeConversationId) return;
      // The hook's onSuccess handles cache updates + socket emit
      sendMessage.mutate({ conversationId: activeConversationId, content, messageType: 'text' });
    },
    [activeConversationId, sendMessage]
  );

  const handleAttach = useCallback(
    (file: File) => {
      if (!activeConversationId) return;
      attachFile.mutate({ conversationId: activeConversationId, file });
    },
    [activeConversationId, attachFile]
  );

  const handleDelete = useCallback(
    (messageId: number, conversationId: number) => {
      deleteMessage.mutate({ messageId, conversationId });
    },
    [deleteMessage]
  );

  const handleAddReaction = useCallback(
    (messageId: number, emoji: string, conversationId: number) => {
      addReaction.mutate({ messageId, emoji, conversationId });
    },
    [addReaction]
  );

  const handleRemoveReaction = useCallback(
    (messageId: number, emoji: string, conversationId: number) => {
      removeReaction.mutate({ messageId, emoji, conversationId });
    },
    [removeReaction]
  );

  const handleTypingStart = useCallback(() => {
    if (activeConversationId) emitTypingStart(activeConversationId);
  }, [activeConversationId, emitTypingStart]);

  const handleTypingStop = useCallback(() => {
    if (activeConversationId) emitTypingStop(activeConversationId);
  }, [activeConversationId, emitTypingStop]);

  const handleToggleSearch = useCallback(() => {
    setMsgSearchOpen((v) => !v);
    if (msgSearchOpen) setMsgSearch('');
  }, [msgSearchOpen]);

  const displayedMessages = msgSearch.trim()
    ? messages.filter(
        (m) =>
          m.content?.toLowerCase().includes(msgSearch.toLowerCase()) ||
          m.fileName?.toLowerCase().includes(msgSearch.toLowerCase())
      )
    : messages;

  const activeConv = conversations.find((c) => c.id === activeConversationId) ?? null;

  if (!user || isLoading) return null;

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-[52px] h-[52px] rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Open messages"
        >
          <MessageCircle size={21} />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1 leading-none">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Chat widget */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl shadow-slate-400/20 flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-200">

          {/* Top bar — list & new views */}
          {view !== 'chat' && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-600 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Messages</span>
                {totalUnread > 0 && (
                  <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full leading-none">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Chat view top strip + header */}
          {view === 'chat' && (
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-600">
                <span className="text-[11px] text-white/70 font-medium">Messages</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={13} />
                </button>
              </div>
              <ChatHeader
                conversation={activeConv}
                onBack={handleBack}
                onToggleSearch={handleToggleSearch}
                searchActive={msgSearchOpen}
              />
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {view === 'list' && (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                searchQuery={convSearch}
                onSearchChange={setConvSearch}
                onSelect={handleSelectConversation}
                onNewChat={handleNewChat}
                isConnected={isConnected}
                isLoading={conversationsLoading}
              />
            )}

            {view === 'new' && (
              <UserSearch
                currentUserId={currentUserId}
                onSelectUser={handleSelectUser}
                onBack={() => setView('list')}
              />
            )}

            {view === 'chat' && (
              <>
                {/* In-conversation search bar */}
                {msgSearchOpen && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                    <input
                      type="text"
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      placeholder="Search messages…"
                      autoFocus
                      className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {msgSearch && (
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {displayedMessages.length} result{displayedMessages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 bg-slate-50/60">
                  {(messagesLoading || messagesFetching) && displayedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                  ) : displayedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-slate-400 text-center">
                        {msgSearch
                          ? `No results for "${msgSearch}"`
                          : 'No messages yet. Say hello!'}
                      </p>
                    </div>
                  ) : (
                    displayedMessages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isSent={Number(msg.senderId) === currentUserId}
                        currentUserId={currentUserId}
                        conversationId={activeConversationId!}
                        searchTerm={msgSearch}
                        onDelete={handleDelete}
                        onAddReaction={handleAddReaction}
                        onRemoveReaction={handleRemoveReaction}
                      />
                    ))
                  )}

                  <TypingIndicator typingNames={typingNames} />
                  <div ref={messagesEndRef} />
                </div>

                <MessageInput
                  conversationId={activeConversationId!}
                  isSending={sendMessage.isPending || attachFile.isPending}
                  isConnected={isConnected}
                  onSend={handleSend}
                  onAttach={handleAttach}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;