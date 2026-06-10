import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Smile } from 'lucide-react';
import type { Message } from '../../../services/ChatServices/chatService';
import { FilePreview } from './FilePreview';
import EmojiPicker from './EmojiPicker';
import { displayEmoji, emojiToCode } from '../utils/chatEmoji';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  currentUserId: number;
  conversationId: number;
  searchTerm?: string;
  onDelete: (messageId: number, conversationId: number) => void;
  onAddReaction: (messageId: number, emoji: string, conversationId: number) => void;
  onRemoveReaction: (messageId: number, emoji: string, conversationId: number) => void;
}

const toNum = (id: number | string) => Number(id);

const highlight = (text: string, term: string) => {
  if (!term.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  currentUserId,
  conversationId,
  searchTerm = '',
  onDelete,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const updatePickerPosition = useCallback(() => {
    const btn = emojiButtonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const pickerHeight = 48;
    const spaceAbove = rect.top;
    const showBelow = spaceAbove < pickerHeight + 72;

    if (showBelow) {
      setPickerStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: isSent ? rect.right : rect.left,
        transform: isSent ? 'translateX(-100%)' : 'none',
        zIndex: 10000,
      });
    } else {
      setPickerStyle({
        position: 'fixed',
        top: rect.top - 6,
        left: isSent ? rect.right : rect.left,
        transform: isSent ? 'translate(-100%, -100%)' : 'translateY(-100%)',
        zIndex: 10000,
      });
    }
  }, [isSent]);

  useEffect(() => {
    if (!showEmoji) return;

    updatePickerPosition();
    window.addEventListener('scroll', updatePickerPosition, true);
    window.addEventListener('resize', updatePickerPosition);

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        emojiButtonRef.current?.contains(target) ||
        pickerRef.current?.contains(target)
      ) {
        return;
      }
      setShowEmoji(false);
    };

    document.addEventListener('mousedown', handler);
    return () => {
      window.removeEventListener('scroll', updatePickerPosition, true);
      window.removeEventListener('resize', updatePickerPosition);
      document.removeEventListener('mousedown', handler);
    };
  }, [showEmoji, updatePickerPosition]);

  const isDeleted = message.isDeleted;
  const isReadByRecipient = !!Number(message.isRead);
  const isFile =
    message.messageType === 'file' ||
    message.messageType === 'image' ||
    !!message.fileUrl;
  const reactions = message.reactions ?? [];
  const hasReactions = reactions.length > 0;

  return (
    <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'}`}>
      <div
        className={`group flex items-end gap-1 max-w-[92%] ${
          isSent ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Message bubble */}
        <div
          className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isDeleted
              ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400 italic'
              : isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {isDeleted ? (
            <span>This message was removed</span>
          ) : isFile ? (
            <FilePreview
              fileUrl={message.fileUrl!}
              fileName={message.fileName || message.content}
              fileType={message.fileType || ''}
              fileSize={message.fileSize}
              isSent={isSent}
              messageType={message.messageType}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {searchTerm ? highlight(message.content, searchTerm) : message.content}
            </p>
          )}
        </div>

        {/* Actions beside message */}
        {!isDeleted && (
          <div
            className={`flex items-center gap-0.5 flex-shrink-0 pb-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              showEmoji ? 'opacity-100' : ''
            } ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => {
                setShowEmoji((v) => {
                  if (!v) setTimeout(updatePickerPosition, 0);
                  return !v;
                });
              }}
              className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors flex items-center justify-center"
              aria-label="Add reaction"
            >
              <Smile size={12} />
            </button>

            {isSent && (
              <button
                type="button"
                onClick={() => onDelete(message.id, conversationId)}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors flex items-center justify-center"
                aria-label="Delete message"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Portal — avoids clipping by scroll container / chat header */}
      {showEmoji &&
        createPortal(
          <div ref={pickerRef} style={pickerStyle}>
            <EmojiPicker
              messageId={message.id}
              conversationId={conversationId}
              currentUserId={currentUserId}
              existingReactions={reactions}
              onAdd={onAddReaction}
              onRemove={onRemoveReaction}
              onClose={() => setShowEmoji(false)}
            />
          </div>,
          document.body
        )}

      {/* Reactions */}
      {hasReactions && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          {reactions.map((r) => {
            const count = Number(r.count) || 0;
            const reacted = r.users.some((u) => toNum(u.userId) === toNum(currentUserId));
            const shownEmoji = displayEmoji(r.emoji);
            return (
              <button
                key={`${r.emoji}-${shownEmoji}`}
                type="button"
                onClick={() =>
                  reacted
                    ? onRemoveReaction(message.id, r.emoji, conversationId)
                    : onAddReaction(message.id, emojiToCode(shownEmoji), conversationId)
                }
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  reacted
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={reacted ? 'Remove reaction' : 'Add reaction'}
              >
                <span className="text-sm leading-none">{shownEmoji}</span>
                {count > 1 && <span className="font-medium">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Timestamp + read receipt */}
      <div className={`flex items-center gap-1 mt-0.5 ${isSent ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
        {isSent && !isDeleted && (
          <span
            className={`text-xs ${isReadByRecipient ? 'text-blue-500' : 'text-slate-400'}`}
            aria-label={isReadByRecipient ? 'Read' : 'Sent'}
          >
            {isReadByRecipient ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
