import React from 'react';
import { CHAT_EMOJI_OPTIONS, emojiToCode } from '../utils/chatEmoji';

interface EmojiPickerProps {
  messageId: number;
  conversationId: number;
  currentUserId: number;
  existingReactions?: { emoji: string; count: number; users: { userId: number }[] }[];
  onAdd: (messageId: number, emoji: string, conversationId: number) => void;
  onRemove: (messageId: number, emoji: string, conversationId: number) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  messageId,
  conversationId,
  currentUserId,
  existingReactions = [],
  onAdd,
  onRemove,
  onClose,
}) => {
  const toNum = (id: number | string) => Number(id);

  const myReaction = existingReactions.find((r) =>
    r.users.some((u) => toNum(u.userId) === toNum(currentUserId))
  );

  const handleClick = (code: string) => {
    const apiCode = emojiToCode(code);

    if (myReaction && emojiToCode(myReaction.emoji) === apiCode) {
      onRemove(messageId, myReaction.emoji, conversationId);
    } else {
      onAdd(messageId, apiCode, conversationId);
    }
    onClose();
  };

  return (
    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow-lg px-2 py-1.5">
      {CHAT_EMOJI_OPTIONS.map(({ code, emoji, label }) => {
        const isActive = !!myReaction && emojiToCode(myReaction.emoji) === code;

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleClick(code)}
            title={label}
            className={`w-7 h-7 flex items-center justify-center rounded-full text-base transition-transform hover:scale-125 ${
              isActive ? 'bg-blue-50' : 'hover:bg-slate-100'
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
};

export default EmojiPicker;
