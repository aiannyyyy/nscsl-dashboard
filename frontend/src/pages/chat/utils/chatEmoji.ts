/** ASCII codes stored in DB (safe for MySQL 5.x / latin1) */
export const EMOJI_CODES = [
  'thumbs_up',
  'heart',
  'laugh',
  'wow',
  'sad',
  'fire',
] as const;

export type EmojiCode = (typeof EMOJI_CODES)[number];

const CODE_TO_EMOJI: Record<EmojiCode, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  fire: '🔥',
};

const UNICODE_TO_CODE: Record<string, EmojiCode> = {
  '👍': 'thumbs_up',
  '❤': 'heart',
  '❤️': 'heart',
  '😂': 'laugh',
  '😮': 'wow',
  '😢': 'sad',
  '🔥': 'fire',
};

const ALIAS_TO_CODE: Record<string, EmojiCode> = {
  'thumbs up': 'thumbs_up',
  thumbs_up: 'thumbs_up',
  thumbsup: 'thumbs_up',
  like: 'thumbs_up',
  heart: 'heart',
  love: 'heart',
  laugh: 'laugh',
  wow: 'wow',
  sad: 'sad',
  fire: 'fire',
};

export const CHAT_EMOJI_OPTIONS = (Object.entries(CODE_TO_EMOJI) as [EmojiCode, string][]).map(
  ([code, emoji]) => ({
    code,
    emoji,
    label: code.replace(/_/g, ' '),
  })
);

/** Detect garbled UTF-8 emoji stored in latin1 (e.g. â¤ï¸ for heart) */
function isGarbledEmoji(value: string): boolean {
  return /[âÃ¤ï¸]/.test(value) || value.includes('\uFFFD');
}

/** Convert any value from DB/API to a safe ASCII storage code */
export function emojiToCode(value: string): EmojiCode {
  if (!value) return 'heart';

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const underscored = lower.replace(/\s+/g, '_');

  if (EMOJI_CODES.includes(underscored as EmojiCode)) {
    return underscored as EmojiCode;
  }

  if (ALIAS_TO_CODE[lower]) return ALIAS_TO_CODE[lower];
  if (ALIAS_TO_CODE[underscored]) return ALIAS_TO_CODE[underscored];

  if (UNICODE_TO_CODE[trimmed]) return UNICODE_TO_CODE[trimmed];

  if (isGarbledEmoji(trimmed)) return 'heart';

  // Any other non-ASCII — try unicode map
  if (/[^\u0020-\u007E]/.test(trimmed)) {
    for (const [unicode, code] of Object.entries(UNICODE_TO_CODE)) {
      if (trimmed.includes(unicode)) return code;
    }
    return 'heart';
  }

  return 'heart';
}

/** Convert DB code (or garbled text) to emoji shown in the UI */
export function displayEmoji(value: string): string {
  const code = emojiToCode(value);
  return CODE_TO_EMOJI[code] || CODE_TO_EMOJI.heart;
}

/** Send ASCII code to API — never send unicode bytes to old MySQL */
export function normalizeEmojiForApi(value: string): string {
  return emojiToCode(value);
}
