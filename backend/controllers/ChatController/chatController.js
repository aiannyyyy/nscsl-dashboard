const { mysqlPool } = require('../../config/database');
const {
    broadcastNewMessage,
    broadcastReaction,
    broadcastMessageDeleted,
    broadcastMessagesRead,
} = require('../../config/socket.config');

// ============================================
// HELPER: Log query execution time
// ============================================
const logQuery = (functionName, duration) => {
    console.log(`⏱️  [${functionName}] Query took ${duration}ms`);
};

// MySQL 5.5 compatible reaction helpers (no JSON_ARRAYAGG / JSON_OBJECT)
const REACTION_USER_DELIM = ';;;';
const REACTION_FIELD_DELIM = '|||';

// Store ASCII codes in DB (MySQL 5.x / latin1 safe). Display unicode in API only.
const EMOJI_CODES = ['thumbs_up', 'heart', 'laugh', 'wow', 'sad', 'fire'];

const CODE_TO_EMOJI = {
    thumbs_up: '👍',
    heart: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    fire: '🔥',
};

const ALIAS_TO_CODE = {
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

const UNICODE_TO_CODE = {
    '👍': 'thumbs_up',
    '❤': 'heart',
    '❤️': 'heart',
    '😂': 'laugh',
    '😮': 'wow',
    '😢': 'sad',
    '🔥': 'fire',
};

function isGarbledEmoji(value) {
    return /[âÃ¤ï¸]/.test(value) || String(value).includes('\uFFFD');
}

function emojiToStorageCode(emoji) {
    if (!emoji) return 'heart';

    const trimmed = String(emoji).trim();
    const lower = trimmed.toLowerCase();
    const underscored = lower.replace(/\s+/g, '_');

    if (EMOJI_CODES.includes(underscored)) return underscored;
    if (ALIAS_TO_CODE[lower]) return ALIAS_TO_CODE[lower];
    if (ALIAS_TO_CODE[underscored]) return ALIAS_TO_CODE[underscored];
    if (UNICODE_TO_CODE[trimmed]) return UNICODE_TO_CODE[trimmed];
    if (isGarbledEmoji(trimmed)) return 'heart';

    if (/[^\x00-\x7F]/.test(trimmed)) {
        for (const [unicode, code] of Object.entries(UNICODE_TO_CODE)) {
            if (trimmed.includes(unicode)) return code;
        }
        return 'heart';
    }

    return 'heart';
}

function displayEmojiFromCode(code) {
    const storageCode = emojiToStorageCode(code);
    return CODE_TO_EMOJI[storageCode] || CODE_TO_EMOJI.heart;
}

const REACTION_USERS_SQL = `
    GROUP_CONCAT(
        CONCAT(
            u.user_id, '${REACTION_FIELD_DELIM}',
            IFNULL(u.username, ''), '${REACTION_FIELD_DELIM}',
            IFNULL(u.name, '')
        )
        SEPARATOR '${REACTION_USER_DELIM}'
    ) as usersRaw`;

function parseReactionUsers(usersRaw) {
    if (!usersRaw) return [];
    return String(usersRaw).split(REACTION_USER_DELIM).map((entry) => {
        const parts = entry.split(REACTION_FIELD_DELIM);
        return {
            userId: Number(parts[0]),
            userName: parts[1] || '',
            name: parts[2] || '',
        };
    });
}

function formatReactionRow(r) {
    const storageCode = emojiToStorageCode(r.emoji);
    const row = {
        emoji: displayEmojiFromCode(storageCode),
        emojiCode: storageCode,
        count: Number(r.count),
        users: parseReactionUsers(r.usersRaw),
    };
    if (r.currentUserReacted !== undefined) {
        row.currentUserReacted = Number(r.currentUserReacted) === 1;
    }
    return row;
}

// ============================================
// HELPER: Attach reactions to message list
// ============================================
async function attachReactionsToMessages(messages) {
    if (!messages || messages.length === 0) return messages;

    try {
        const messageIds = messages.map(m => m.id);
        const [reactions] = await mysqlPool.query(
            `SELECT
                mr.messageId,
                mr.emoji,
                COUNT(*) as count,
                ${REACTION_USERS_SQL}
             FROM message_reactions mr
             JOIN user u ON mr.userId = u.user_id
             WHERE mr.messageId IN (?)
             GROUP BY mr.messageId, mr.emoji`,
            [messageIds]
        );

        const reactionsByMessage = {};
        for (const r of reactions) {
            if (!reactionsByMessage[r.messageId]) reactionsByMessage[r.messageId] = [];
            reactionsByMessage[r.messageId].push(formatReactionRow(r));
        }

        return messages.map(m => ({
            ...m,
            reactions: reactionsByMessage[m.id] || []
        }));
    } catch (err) {
        // Don't break message loading if reactions table/query is unavailable
        console.warn('[attachReactionsToMessages] Skipping reactions:', err.message);
        return messages.map(m => ({ ...m, reactions: [] }));
    }
}

// ============================================
// 1. GET ALL CONVERSATIONS FOR A USER
// ============================================
exports.getConversations = async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.user_id;

    console.log(`\n🔍 [getConversations] Started for userId: ${userId}`);

    try {
        const query = `
            SELECT
                c.id,
                c.conversationName,
                c.conversationType,
                c.createdAt,
                u.user_id as otherUserId,
                u.name,
                u.username as user_name,
                u.position,
                u.dept as department,
                last_msg.content as lastMessage,
                last_msg.createdAt as lastMessageTime,
                COALESCE(us.isOnline, FALSE) as isOnline,
                COUNT(CASE WHEN msg.isRead = FALSE AND msg.senderId != ? THEN 1 END) as unreadCount
            FROM conversations c
            INNER JOIN conversation_members cm ON c.id = cm.conversationId AND cm.userId = ?
            LEFT JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId != ?
            LEFT JOIN user u ON cm2.userId = u.user_id
            LEFT JOIN (
                SELECT m1.conversationId, m1.content, m1.createdAt
                FROM messages m1
                INNER JOIN (
                    SELECT conversationId, MAX(createdAt) as maxCreatedAt
                    FROM messages
                    GROUP BY conversationId
                ) m2 ON m1.conversationId = m2.conversationId AND m1.createdAt = m2.maxCreatedAt
            ) last_msg ON last_msg.conversationId = c.id
            LEFT JOIN messages msg ON msg.conversationId = c.id
            LEFT JOIN user_status us ON us.userId = u.user_id
            GROUP BY
                c.id, c.conversationName, c.conversationType, c.createdAt,
                u.user_id, u.name, u.username, u.position, u.dept,
                last_msg.content, last_msg.createdAt, us.isOnline
            ORDER BY COALESCE(last_msg.createdAt, c.createdAt) DESC
            LIMIT 50
        `;

        const [results] = await mysqlPool.query(query, [userId, userId, userId]);

        logQuery('getConversations', Date.now() - startTime);
        console.log(`✅ [getConversations] Returned ${results.length} conversations\n`);

        res.json(results || []);
    } catch (err) {
        console.error('❌ [getConversations] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
    }
};

// ============================================
// 2. GET MESSAGES FOR A CONVERSATION
// ============================================
exports.getMessages = async (req, res) => {
    const startTime = Date.now();
    const { conversationId } = req.params;
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`\n🔍 [getMessages] Started for conversationId: ${conversationId}`);

    try {
        const [verification] = await mysqlPool.query(
            `SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ? LIMIT 1`,
            [conversationId, userId]
        );

        if (verification.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this conversation' });
        }

        const [results] = await mysqlPool.query(
            `SELECT
                m.id,
                m.conversationId,
                m.senderId,
                m.content,
                m.messageType,
                m.fileUrl,
                m.fileName,
                m.fileSize,
                m.fileType,
                m.isRead,
                m.isDeleted,
                m.createdAt,
                u.user_id as userId,
                u.username as user_name,
                u.name,
                u.position
            FROM messages m
            JOIN user u ON m.senderId = u.user_id
            WHERE m.conversationId = ?
            ORDER BY m.createdAt DESC
            LIMIT ? OFFSET ?`,
            [conversationId, limit, offset]
        );

        const messages = results.reverse();
        const messagesWithReactions = await attachReactionsToMessages(messages);

        logQuery('getMessages', Date.now() - startTime);
        console.log(`✅ [getMessages] Returned ${messagesWithReactions.length} messages\n`);

        res.json(messagesWithReactions);
    } catch (err) {
        console.error('❌ [getMessages] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
    }
};

// ============================================
// 3. SEND A MESSAGE
// ============================================
exports.sendMessage = async (req, res) => {
    const startTime = Date.now();
    const { conversationId, content, messageType, fileUrl } = req.body;
    const senderId = req.user.user_id;

    console.log(`\n🔍 [sendMessage] Started — Sender: ${senderId}, Conversation: ${conversationId}`);

    if (!conversationId || !content) {
        return res.status(400).json({ error: 'conversationId and content are required' });
    }

    try {
        const [verification] = await mysqlPool.query(
            `SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ? LIMIT 1`,
            [conversationId, senderId]
        );

        if (verification.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this conversation' });
        }

        const type = messageType || 'text';
        const [result] = await mysqlPool.query(
            `INSERT INTO messages (conversationId, senderId, content, messageType, fileUrl, createdAt)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [conversationId, senderId, content, type, fileUrl || null]
        );

        const [messageData] = await mysqlPool.query(
            `SELECT
                m.id, m.conversationId, m.senderId, m.content, m.messageType,
                m.fileUrl, m.fileName, m.fileSize, m.fileType, m.isRead, m.createdAt,
                u.user_id as userId, u.username as user_name, u.name, u.position
            FROM messages m
            JOIN user u ON m.senderId = u.user_id
            WHERE m.id = ? LIMIT 1`,
            [result.insertId]
        );

        const message = messageData[0];
        const io = req.app?.locals?.io;
        if (io) {
            await broadcastNewMessage(io, conversationId, message);
        }

        logQuery('sendMessage', Date.now() - startTime);
        console.log(`✅ [sendMessage] Message sent (ID: ${result.insertId})\n`);

        res.status(201).json(message);
    } catch (err) {
        console.error('❌ [sendMessage] Error:', err.message);
        res.status(500).json({ error: 'Failed to send message', details: err.message });
    }
};

// ============================================
// 4. MARK MESSAGES AS READ
// ============================================
exports.markAsRead = async (req, res) => {
    const startTime = Date.now();
    const { conversationId } = req.body;
    const userId = req.user.user_id;

    if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
    }

    try {
        const [result] = await mysqlPool.query(
            `UPDATE messages
             SET isRead = TRUE
             WHERE conversationId = ? AND senderId != ? AND isDeleted = FALSE`,
            [conversationId, userId]
        );

        const io = req.app?.locals?.io;
        if (io) {
            broadcastMessagesRead(io, conversationId, userId);
        }

        logQuery('markAsRead', Date.now() - startTime);
        console.log(`✅ [markAsRead] Marked ${result.affectedRows} messages as read\n`);

        res.json({ message: 'Messages marked as read', affectedRows: result.affectedRows });
    } catch (err) {
        console.error('❌ [markAsRead] Error:', err.message);
        res.status(500).json({ error: 'Failed to mark messages as read', details: err.message });
    }
};

// ============================================
// 5. CREATE OR GET DIRECT CONVERSATION
// ============================================
exports.createConversation = async (req, res) => {
    const startTime = Date.now();
    const { otherUserId } = req.body;
    const userId = req.user.user_id;

    if (!otherUserId) {
        return res.status(400).json({ error: 'otherUserId is required' });
    }

    if (userId === parseInt(otherUserId)) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    try {
        const [userData] = await mysqlPool.query(
            `SELECT user_id, username, name, position FROM user WHERE user_id = ? LIMIT 1`,
            [otherUserId]
        );

        if (userData.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [existing] = await mysqlPool.query(
            `SELECT c.id
             FROM conversations c
             INNER JOIN conversation_members cm1 ON c.id = cm1.conversationId AND cm1.userId = ?
             INNER JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId = ?
             WHERE c.conversationType = 'direct'
             LIMIT 1`,
            [userId, otherUserId]
        );

        if (existing.length > 0) {
            logQuery('createConversation (existing)', Date.now() - startTime);
            return res.json({ id: existing[0].id, isNew: false });
        }

        const conversationName = userData[0].position || userData[0].name || userData[0].username;

        const [createResult] = await mysqlPool.query(
            `INSERT INTO conversations (conversationName, conversationType, createdBy, createdAt)
             VALUES (?, 'direct', ?, NOW())`,
            [conversationName, userId]
        );

        const conversationId = createResult.insertId;

        await mysqlPool.query(
            `INSERT INTO conversation_members (conversationId, userId, joinedAt)
             VALUES (?, ?, NOW()), (?, ?, NOW())`,
            [conversationId, userId, conversationId, otherUserId]
        );

        logQuery('createConversation (new)', Date.now() - startTime);
        console.log(`✅ [createConversation] Created conversation ID: ${conversationId}\n`);

        res.status(201).json({ id: conversationId, isNew: true });
    } catch (err) {
        console.error('❌ [createConversation] Error:', err.message);
        res.status(500).json({ error: 'Failed to create conversation', details: err.message });
    }
};

// ============================================
// 6. DELETE A MESSAGE (SOFT DELETE)
// ============================================
exports.deleteMessage = async (req, res) => {
    const startTime = Date.now();
    const { messageId } = req.params;
    const userId = req.user.user_id;

    if (!messageId) {
        return res.status(400).json({ error: 'messageId is required' });
    }

    try {
        const [messageData] = await mysqlPool.query(
            `SELECT id, conversationId, content, messageType, senderId FROM messages WHERE id = ? AND senderId = ? LIMIT 1`,
            [messageId, userId]
        );

        if (messageData.length === 0) {
            return res.status(403).json({ error: 'Unauthorized - You can only delete your own messages' });
        }

        const [result] = await mysqlPool.query(
            `UPDATE messages
             SET content = 'This message was removed', isDeleted = TRUE, deletedAt = NOW()
             WHERE id = ? AND senderId = ?`,
            [messageId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to delete message' });
        }

        const modifiedContent = 'This message was removed';
        const io = req.app?.locals?.io;
        if (io) {
            broadcastMessageDeleted(io, messageData[0].conversationId, messageId, modifiedContent);
        }

        logQuery('deleteMessage', Date.now() - startTime);
        console.log(`✅ [deleteMessage] Message ${messageId} soft-deleted\n`);

        res.json({
            message: 'Message deleted successfully',
            messageId,
            modifiedContent,
        });
    } catch (err) {
        console.error('❌ [deleteMessage] Error:', err.message);
        res.status(500).json({ error: 'Failed to delete message', details: err.message });
    }
};

// ============================================
// 7. UPDATE USER ONLINE STATUS
// ============================================
exports.updateUserStatus = async (req, res) => {
    const startTime = Date.now();
    const { isOnline } = req.body;
    const userId = req.user.user_id;

    if (isOnline === undefined) {
        return res.status(400).json({ error: 'isOnline is required' });
    }

    try {
        await mysqlPool.query(
            `INSERT INTO user_status (userId, isOnline, lastSeen)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE isOnline = VALUES(isOnline), lastSeen = NOW()`,
            [userId, isOnline]
        );

        logQuery('updateUserStatus', Date.now() - startTime);
        res.json({ message: 'Status updated successfully', isOnline });
    } catch (err) {
        console.error('❌ [updateUserStatus] Error:', err.message);
        res.status(500).json({ error: 'Failed to update status', details: err.message });
    }
};

// ============================================
// 8. GET ALL USERS WITH ONLINE STATUS
// ============================================
exports.getUserStatus = async (req, res) => {
    const startTime = Date.now();

    try {
        const [results] = await mysqlPool.query(
            `SELECT
                u.user_id as userId,
                u.username as user_name,
                u.name,
                u.position,
                u.dept as department,
                COALESCE(us.isOnline, FALSE) as isOnline,
                us.lastSeen
            FROM user u
            LEFT JOIN user_status us ON u.user_id = us.userId
            ORDER BY us.isOnline DESC, us.lastSeen DESC
            LIMIT 100`
        );

        logQuery('getUserStatus', Date.now() - startTime);
        res.json(results);
    } catch (err) {
        console.error('❌ [getUserStatus] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user status', details: err.message });
    }
};

// ============================================
// 9. SEARCH MESSAGES IN A CONVERSATION
// ============================================
exports.searchMessages = async (req, res) => {
    const startTime = Date.now();
    const { conversationId, searchTerm } = req.query;
    const userId = req.user.user_id;

    if (!conversationId || !searchTerm) {
        return res.status(400).json({ error: 'conversationId and searchTerm are required' });
    }

    try {
        const [verification] = await mysqlPool.query(
            `SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ? LIMIT 1`,
            [conversationId, userId]
        );

        if (verification.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this conversation' });
        }

        const [results] = await mysqlPool.query(
            `SELECT
                m.id, m.conversationId, m.senderId, m.content,
                m.messageType, m.createdAt,
                u.username as user_name, u.name
            FROM messages m
            JOIN user u ON m.senderId = u.user_id
            WHERE m.conversationId = ? AND m.content LIKE ? AND m.isDeleted = FALSE
            ORDER BY m.createdAt DESC
            LIMIT 50`,
            [conversationId, `%${searchTerm}%`]
        );

        logQuery('searchMessages', Date.now() - startTime);
        res.json(results);
    } catch (err) {
        console.error('❌ [searchMessages] Error:', err.message);
        res.status(500).json({ error: 'Failed to search messages', details: err.message });
    }
};

// ============================================
// 10. ATTACH FILE TO MESSAGE
// ============================================
exports.attachFile = async (req, res) => {
    const startTime = Date.now();
    const { conversationId } = req.body;
    const userId = req.user.user_id;
    const file = req.file;

    if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
    }

    if (!file) {
        return res.status(400).json({ error: 'File is required' });
    }

    try {
        const convId = parseInt(conversationId);

        if (isNaN(convId)) {
            return res.status(400).json({ error: 'Invalid conversationId' });
        }

        const [verification] = await mysqlPool.query(
            `SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ? LIMIT 1`,
            [convId, userId]
        );

        if (verification.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this conversation' });
        }

        const fileUrl = `/uploads/${file.filename}`;
        const fileName = file.originalname;
        const fileSize = file.size;

        let fileType = file.mimetype || 'application/octet-stream';
        if (!fileType || fileType === 'application/octet-stream') {
            const ext = fileName.split('.').pop()?.toLowerCase();
            const mimeTypes = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
                mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
                mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav',
                ogg: 'audio/ogg', pdf: 'application/pdf', txt: 'text/plain',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                zip: 'application/zip', rar: 'application/x-rar-compressed'
            };
            if (ext && mimeTypes[ext]) fileType = mimeTypes[ext];
        }

        const messageType = 'file';
        const messageContent = `Shared a file: ${fileName}`;

        const [result] = await mysqlPool.query(
            `INSERT INTO messages (conversationId, senderId, content, messageType, fileUrl, fileName, fileSize, fileType, isRead, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
            [convId, userId, messageContent, messageType, fileUrl, fileName, fileSize, fileType]
        );

        const [messageData] = await mysqlPool.query(
            `SELECT
                m.id, m.conversationId, m.senderId, m.content, m.messageType,
                m.fileUrl, m.fileName, m.fileSize, m.fileType, m.isRead, m.createdAt,
                u.user_id as userId, u.username as user_name, u.name, u.position
            FROM messages m
            JOIN user u ON m.senderId = u.user_id
            WHERE m.id = ? LIMIT 1`,
            [result.insertId]
        );

        if (!messageData || messageData.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve uploaded file message' });
        }

        const message = messageData[0];
        const io = req.app?.locals?.io;
        if (io) {
            await broadcastNewMessage(io, convId, message);
        }

        logQuery('attachFile', Date.now() - startTime);
        console.log(`✅ [attachFile] File attached successfully (ID: ${result.insertId})\n`);

        res.status(201).json(message);
    } catch (err) {
        console.error('❌ [attachFile] Error:', err.message);

        if (req.file) {
            const fs = require('fs');
            try {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            } catch (cleanupErr) {
                console.error('Error cleaning up file:', cleanupErr);
            }
        }

        res.status(500).json({ error: 'Failed to attach file', details: err.message });
    }
};

// ============================================
// 11. GET UNREAD COUNT FOR A CONVERSATION
// ============================================
exports.getUnreadCount = async (req, res) => {
    const startTime = Date.now();
    const { conversationId } = req.params;
    const userId = req.user.user_id;

    if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
    }

    try {
        const [verification] = await mysqlPool.query(
            `SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ? LIMIT 1`,
            [conversationId, userId]
        );

        if (verification.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this conversation' });
        }

        const [result] = await mysqlPool.query(
            `SELECT COUNT(*) as unreadCount
             FROM messages
             WHERE conversationId = ? AND isRead = FALSE AND senderId != ? AND isDeleted = FALSE`,
            [conversationId, userId]
        );

        logQuery('getUnreadCount', Date.now() - startTime);
        res.json({ conversationId, unreadCount: result[0].unreadCount });
    } catch (err) {
        console.error('❌ [getUnreadCount] Error:', err.message);
        res.status(500).json({ error: 'Failed to get unread count', details: err.message });
    }
};

// ============================================
// 12. GET ALL UNREAD MESSAGES FOR USER
// ============================================
exports.getAllUnreadMessages = async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.user_id;

    try {
        const [results] = await mysqlPool.query(
            `SELECT
                m.id, m.conversationId, m.senderId, m.content,
                m.messageType, m.fileUrl, m.createdAt,
                u.user_id as userId, u.username as user_name, u.name,
                c.conversationName, c.conversationType,
                COUNT(m.id) OVER (PARTITION BY m.conversationId) as conversationUnreadCount
            FROM messages m
            JOIN user u ON m.senderId = u.user_id
            JOIN conversations c ON m.conversationId = c.id
            JOIN conversation_members cm ON c.id = cm.conversationId AND cm.userId = ?
            WHERE m.isRead = FALSE AND m.senderId != ? AND m.isDeleted = FALSE
            ORDER BY m.conversationId, m.createdAt DESC`,
            [userId, userId]
        );

        logQuery('getAllUnreadMessages', Date.now() - startTime);
        res.json(results);
    } catch (err) {
        console.error('❌ [getAllUnreadMessages] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch unread messages', details: err.message });
    }
};

// ============================================
// 13. GET USERS LIST (for new conversations)
// ============================================
exports.getUsers = async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.user_id;
    const search = req.query.search || '';

    try {
        const [results] = await mysqlPool.query(
            `SELECT
                u.user_id as id,
                u.username as user_name,
                u.name,
                u.position,
                u.dept as department,
                COALESCE(us.isOnline, FALSE) as isOnline,
                us.lastSeen
            FROM user u
            LEFT JOIN user_status us ON u.user_id = us.userId
            WHERE u.user_id != ?
              AND (u.name LIKE ? OR u.username LIKE ? OR u.position LIKE ? OR u.dept LIKE ?)
            ORDER BY us.isOnline DESC, u.name ASC
            LIMIT 50`,
            [userId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        );

        logQuery('getUsers', Date.now() - startTime);
        res.json(results);
    } catch (err) {
        console.error('❌ [getUsers] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
};

// ============================================
// 14. UPLOAD FILE (standalone endpoint)
// ============================================
exports.uploadFile = async (req, res) => {
    const startTime = Date.now();

    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        const fileUrl = `/uploads/${req.file.filename}`;

        logQuery('uploadFile', Date.now() - startTime);
        res.status(201).json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            message: 'File uploaded successfully'
        });
    } catch (err) {
        console.error('❌ [uploadFile] Error:', err.message);
        res.status(500).json({ error: 'Failed to upload file', details: err.message });
    }
};

// ============================================
// 15. ADD REACTION TO MESSAGE
// ============================================
exports.addReaction = async (req, res) => {
    const startTime = Date.now();
    const { messageId, emoji } = req.body;
    const userId = req.user.user_id;

    if (!messageId || !emoji) {
        return res.status(400).json({ error: 'messageId and emoji are required' });
    }

    try {
        const [messageData] = await mysqlPool.query(
            `SELECT m.id, m.conversationId
             FROM messages m
             JOIN conversation_members cm ON m.conversationId = cm.conversationId
             WHERE m.id = ? AND cm.userId = ? AND m.isDeleted = FALSE
             LIMIT 1`,
            [messageId, userId]
        );

        if (messageData.length === 0) {
            return res.status(404).json({ error: 'Message not found or access denied' });
        }

        const storageCode = emojiToStorageCode(emoji);

        // One reaction per user per message — replace any existing reaction
        await mysqlPool.query(
            `DELETE FROM message_reactions WHERE messageId = ? AND userId = ?`,
            [messageId, userId]
        );

        await mysqlPool.query(
            `INSERT INTO message_reactions (messageId, userId, emoji, createdAt)
             VALUES (?, ?, ?, NOW())`,
            [messageId, userId, storageCode]
        );

        const [reactions] = await mysqlPool.query(
            `SELECT
                emoji,
                COUNT(*) as count,
                ${REACTION_USERS_SQL}
             FROM message_reactions mr
             JOIN user u ON mr.userId = u.user_id
             WHERE mr.messageId = ?
             GROUP BY emoji`,
            [messageId]
        );

        const formattedReactions = reactions.map(formatReactionRow);

        const conversationId = messageData[0].conversationId;
        const io = req.app?.locals?.io;
        if (io) {
            broadcastReaction(io, conversationId, messageId, formattedReactions);
        }

        logQuery('addReaction', Date.now() - startTime);
        res.status(201).json({ messageId: Number(messageId), reactions: formattedReactions, message: 'Reaction added' });
    } catch (err) {
        console.error('❌ [addReaction] Error:', err.message);
        res.status(500).json({ error: 'Failed to add reaction', details: err.message });
    }
};

// ============================================
// 16. REMOVE REACTION FROM MESSAGE
// ============================================
exports.removeReaction = async (req, res) => {
    const startTime = Date.now();
    const { messageId, emoji } = req.body;
    const userId = req.user.user_id;

    if (!messageId || !emoji) {
        return res.status(400).json({ error: 'messageId and emoji are required' });
    }

    try {
        const [messageData] = await mysqlPool.query(
            `SELECT m.id, m.conversationId FROM messages m
             JOIN conversation_members cm ON m.conversationId = cm.conversationId
             WHERE m.id = ? AND cm.userId = ? AND m.isDeleted = FALSE
             LIMIT 1`,
            [messageId, userId]
        );

        if (messageData.length === 0) {
            return res.status(404).json({ error: 'Message not found or access denied' });
        }

        const storageCode = emojiToStorageCode(emoji);

        const [result] = await mysqlPool.query(
            `DELETE FROM message_reactions
             WHERE messageId = ? AND userId = ?`,
            [messageId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Reaction not found' });
        }

        const [reactions] = await mysqlPool.query(
            `SELECT
                emoji,
                COUNT(*) as count,
                ${REACTION_USERS_SQL}
             FROM message_reactions mr
             JOIN user u ON mr.userId = u.user_id
             WHERE mr.messageId = ?
             GROUP BY emoji`,
            [messageId]
        );

        const formattedReactions = reactions.map(formatReactionRow);

        const conversationId = messageData[0].conversationId;
        const io = req.app?.locals?.io;
        if (io) {
            broadcastReaction(io, conversationId, messageId, formattedReactions);
        }

        logQuery('removeReaction', Date.now() - startTime);
        res.json({
            messageId: Number(messageId),
            reactions: formattedReactions,
            message: 'Reaction removed'
        });
    } catch (err) {
        console.error('❌ [removeReaction] Error:', err.message);
        res.status(500).json({ error: 'Failed to remove reaction', details: err.message });
    }
};

// ============================================
// 17. GET REACTIONS FOR A MESSAGE
// ============================================
exports.getMessageReactions = async (req, res) => {
    const startTime = Date.now();
    const { messageId } = req.params;
    const userId = req.user.user_id;

    if (!messageId) {
        return res.status(400).json({ error: 'messageId is required' });
    }

    try {
        const [messageData] = await mysqlPool.query(
            `SELECT m.id FROM messages m
             JOIN conversation_members cm ON m.conversationId = cm.conversationId
             WHERE m.id = ? AND cm.userId = ? AND m.isDeleted = FALSE
             LIMIT 1`,
            [messageId, userId]
        );

        if (messageData.length === 0) {
            return res.status(404).json({ error: 'Message not found or access denied' });
        }

        const [reactions] = await mysqlPool.query(
            `SELECT
                emoji,
                COUNT(*) as count,
                ${REACTION_USERS_SQL},
                MAX(CASE WHEN mr.userId = ? THEN 1 ELSE 0 END) as currentUserReacted
             FROM message_reactions mr
             JOIN user u ON mr.userId = u.user_id
             WHERE mr.messageId = ?
             GROUP BY emoji`,
            [userId, messageId]
        );

        logQuery('getMessageReactions', Date.now() - startTime);
        res.json({
            messageId,
            reactions: reactions.map(formatReactionRow),
        });
    } catch (err) {
        console.error('❌ [getMessageReactions] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch reactions', details: err.message });
    }
};

// ============================================
// 18. GET DEFAULT EMOJIS
// ============================================
exports.getDefaultEmojis = async (req, res) => {
    const startTime = Date.now();

    const fallback = [
        { emoji: 'thumbs_up', label: 'thumbs up' },
        { emoji: 'heart', label: 'heart' },
        { emoji: 'laugh', label: 'laugh' },
        { emoji: 'wow', label: 'wow' },
        { emoji: 'sad', label: 'sad' },
        { emoji: 'fire', label: 'fire' },
    ];

    try {
        const [emojis] = await mysqlPool.query(
            `SELECT emoji, label FROM reaction_emojis ORDER BY id ASC`
        );

        const mapped = (emojis || []).map((row) => ({
            emoji: emojiToStorageCode(row.emoji || row.label),
            label: row.label || emojiToStorageCode(row.emoji),
        }));

        logQuery('getDefaultEmojis', Date.now() - startTime);
        res.json(mapped.length > 0 ? mapped : fallback);
    } catch (err) {
        console.error('❌ [getDefaultEmojis] Error:', err.message);
        res.json(fallback);
    }
};