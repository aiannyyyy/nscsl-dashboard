import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface MessageInputProps {
  conversationId: number;
  isConnected?: boolean;
  isSending?: boolean;
  onSend: (content: string) => void;
  onAttach: (file: File) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  isConnected = true,
  isSending = false,
  onSend,
  onAttach,
  onTypingStart,
  onTypingStop,
}) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    setText('');
    setSelectedFile(null);
  }, [conversationId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    if (!isTypingRef.current && value.length > 0) {
      isTypingRef.current = true;
      onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (value.length === 0) {
      isTypingRef.current = false;
      onTypingStop();
    } else {
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTypingStop();
      }, 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    if (selectedFile) {
      onAttach(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (text.trim()) {
      onSend(text.trim());
      setText('');
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert('File exceeds 50 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const canSend = !isSending && (!!text.trim() || !!selectedFile);

  return (
    <div className="px-3 py-2.5 border-t border-slate-100 bg-white flex-shrink-0">
      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-2">
          <Paperclip size={11} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-700 truncate flex-1">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Attach file"
        >
          <Paperclip size={15} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={!isConnected ? 'Connecting…' : 'Message…'}
          className="flex-1 bg-slate-100 rounded-full px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;