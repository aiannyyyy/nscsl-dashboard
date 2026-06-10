-- Chat reaction tables (MySQL 5.5+ / latin1 safe)
-- IMPORTANT: emoji columns store ASCII codes (heart, thumbs_up), NOT unicode emoji.

CREATE TABLE IF NOT EXISTS message_reactions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    messageId INT(11) NOT NULL,
    userId INT(11) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_user_per_message (messageId, userId),
    KEY idx_message_reactions_message (messageId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS reaction_emojis (
    id INT(11) NOT NULL AUTO_INCREMENT,
    emoji VARCHAR(32) NOT NULL,
    label VARCHAR(64) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_emoji (emoji)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ASCII codes only (safe for old MySQL)
INSERT IGNORE INTO reaction_emojis (emoji, label) VALUES
('thumbs_up', 'thumbs up'),
('heart', 'heart'),
('laugh', 'laugh'),
('wow', 'wow'),
('sad', 'sad'),
('fire', 'fire');

-- ============================================================
-- FIX CORRUPTED DATA (run once if you see â¤ï¸ instead of ❤️)
-- Do NOT use UPDATE on reaction_emojis — unique key on emoji
-- will fail when multiple bad rows map to the same code.
-- ============================================================

-- 1) reaction_emojis: delete corrupt / unicode rows, keep ASCII codes only
DELETE FROM reaction_emojis
WHERE emoji NOT IN ('thumbs_up', 'heart', 'laugh', 'wow', 'sad', 'fire');

-- 2) reaction_emojis: re-insert any missing canonical rows
INSERT IGNORE INTO reaction_emojis (emoji, label) VALUES
('thumbs_up', 'thumbs up'),
('heart', 'heart'),
('laugh', 'laugh'),
('wow', 'wow'),
('sad', 'sad'),
('fire', 'fire');

-- 3) message_reactions: safe to UPDATE (no unique key on emoji alone)
UPDATE message_reactions SET emoji = 'heart'      WHERE emoji LIKE '%â%' OR emoji IN ('❤', '❤️');
UPDATE message_reactions SET emoji = 'thumbs_up' WHERE emoji = '👍';
UPDATE message_reactions SET emoji = 'laugh'     WHERE emoji = '😂';
UPDATE message_reactions SET emoji = 'wow'       WHERE emoji = '😮';
UPDATE message_reactions SET emoji = 'sad'       WHERE emoji = '😢';
UPDATE message_reactions SET emoji = 'fire'      WHERE emoji = '🔥';
