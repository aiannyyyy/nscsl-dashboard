import React from 'react';

interface TypingIndicatorProps {
  typingNames: string[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingNames }) => {
  if (typingNames.length === 0) return null;

  const label =
    typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing`
      : `${typingNames[0]} and ${typingNames.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-1">
      {/* Animated dots */}
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '1s' }}
        />
      </div>
      <span className="text-[10px] text-slate-400 italic">{label}</span>
    </div>
  );
};

export default TypingIndicator;