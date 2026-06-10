const { Server } = require('socket.io');
const { mysqlPool } = require('./database');

// ============================================
// IN-MEMORY STORES (faster than DB polling)
// ============================================
const onlineUsers = new Map();    // userId -> { socketId, userId, name, user_name }
const typingUsers = new Map();    // `${conversationId}_${userId}` -> timeout handle
const userSockets = new Map();    // socketId -> userId

// ============================================
// HELPER: Get all online user IDs
// ============================================
function getOnlineUserIds() {
    return Array.from(onlineUsers.keys());
}

// ============================================
// HELPER: Update user_status in DB
// ============================================
async function updateDbStatus(userId, isOnline) {
    try {
        await mysqlPool.query(
            `INSERT INTO user_status (userId, isOnline, lastSeen)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE isOnline = VALUES(isOnline), lastSeen = NOW()`,
            [userId, isOnline]
        );
    } catch (err) {
        console.error(`❌ [Socket] Failed to update DB status for user ${userId}:`, err.message);
    }
}

// ============================================
// HELPER: Get conversation members
// ============================================
async function getConversationMembers(conversationId) {
    try {
        const [rows] = await mysqlPool.query(
            `SELECT userId FROM conversation_members WHERE conversationId = ?`,
            [conversationId]
        );
        return rows.map(r => r.userId);
    } catch (err) {
        console.error(`❌ [Socket] Failed to get members for conversation ${conversationId}:`, err.message);
        return [];
    }
}

// ============================================
// HELPER: Find socket IDs for a user
// ============================================
function getSocketIdsForUser(userId) {
    const target = Number(userId);
    const socketIds = [];
    for (const [socketId, uid] of userSockets.entries()) {
        if (Number(uid) === target) socketIds.push(socketId);
    }
    return socketIds;
}

// ============================================
// HELPER: Broadcast from REST API handlers
// ============================================
async function broadcastNewMessage(io, conversationId, message) {
    const cid = Number(conversationId);
    const room = `conversation_${cid}`;

    io.to(room).emit('message:new', { conversationId: cid, message });

    try {
        const members = await getConversationMembers(cid);
        const senderId = Number(message.senderId);

        for (const memberId of members) {
            if (Number(memberId) === senderId) continue;

            const memberSocketIds = getSocketIdsForUser(memberId);
            for (const sid of memberSocketIds) {
                const memberSocket = io.sockets.sockets.get(sid);
                if (memberSocket && !memberSocket.rooms.has(room)) {
                    memberSocket.emit('message:unread', { conversationId: cid, message });
                }
            }
        }
    } catch (err) {
        console.error(`❌ [Socket] broadcastNewMessage notify error:`, err.message);
    }
}

function broadcastReaction(io, conversationId, messageId, reactions) {
    const cid = Number(conversationId);
    io.to(`conversation_${cid}`).emit('message:reacted', {
        conversationId: cid,
        messageId: Number(messageId),
        reactions,
    });
}

function broadcastMessageDeleted(io, conversationId, messageId, modifiedContent) {
    const cid = Number(conversationId);
    io.to(`conversation_${cid}`).emit('message:deleted', {
        conversationId: cid,
        messageId: Number(messageId),
        modifiedContent,
    });
}

function broadcastMessagesRead(io, conversationId, userId) {
    const cid = Number(conversationId);
    io.to(`conversation_${cid}`).emit('messages:read', {
        conversationId: cid,
        userId: Number(userId),
    });
}

// ============================================
// INITIALIZE SOCKET.IO
// ============================================
function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', (socket) => {
        console.log(`🔌 [Socket] New connection: ${socket.id}`);

        // ============================================
        // EVENT: USER JOINS (authenticate)
        // ============================================
        socket.on('user:join', async ({ userId, name, user_name }) => {
            if (!userId) {
                console.warn(`⚠️  [Socket] user:join missing userId`);
                return;
            }

            const uid = Number(userId);

            // Register user
            onlineUsers.set(uid, { socketId: socket.id, userId: uid, name, user_name });
            userSockets.set(socket.id, uid);

            console.log(`✅ [Socket] User ${user_name || uid} joined (socket: ${socket.id})`);

            // Update DB
            await updateDbStatus(uid, true);

            // Notify ALL clients of updated online list
            io.emit('users:online', getOnlineUserIds());

            // Confirm to joining user
            socket.emit('user:joined', { userId: uid, onlineUsers: getOnlineUserIds() });
        });

        // ============================================
        // EVENT: JOIN CONVERSATION ROOM
        // ============================================
        socket.on('conversation:join', ({ conversationId }) => {
            if (!conversationId) return;
            const room = `conversation_${Number(conversationId)}`;
            socket.join(room);
            console.log(`📥 [Socket] Socket ${socket.id} joined room: ${room}`);
        });

        // ============================================
        // EVENT: LEAVE CONVERSATION ROOM
        // ============================================
        socket.on('conversation:leave', ({ conversationId }) => {
            if (!conversationId) return;
            const room = `conversation_${Number(conversationId)}`;
            socket.leave(room);
            console.log(`📤 [Socket] Socket ${socket.id} left room: ${room}`);
        });

        // ============================================
        // EVENT: NEW MESSAGE (broadcast to room)
        // ============================================
        socket.on('message:send', async ({ conversationId, message }) => {
            if (!conversationId || !message) return;

            const room = `conversation_${conversationId}`;
            console.log(`💬 [Socket] New message in conversation ${conversationId}`);

            // Broadcast to all room members EXCEPT sender
            socket.to(room).emit('message:new', { conversationId, message });

            // Also notify members NOT in the room (for unread badge updates)
            try {
                const members = await getConversationMembers(conversationId);
                for (const memberId of members) {
                    if (Number(memberId) === Number(message.senderId)) continue;
                    const memberSocketIds = getSocketIdsForUser(memberId);
                    for (const sid of memberSocketIds) {
                        const memberSocket = io.sockets.sockets.get(sid);
                        if (memberSocket && !memberSocket.rooms.has(room)) {
                            memberSocket.emit('message:unread', {
                                conversationId,
                                message
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`❌ [Socket] Error notifying members:`, err.message);
            }
        });

        // ============================================
        // EVENT: MESSAGE DELETED
        // ============================================
        socket.on('message:delete', ({ conversationId, messageId, modifiedContent }) => {
            if (!conversationId || !messageId) return;
            const room = `conversation_${conversationId}`;
            socket.to(room).emit('message:deleted', { conversationId, messageId, modifiedContent });
            console.log(`🗑️  [Socket] Message ${messageId} deleted in conversation ${conversationId}`);
        });

        // ============================================
        // EVENT: MESSAGE REACTION
        // ============================================
        socket.on('message:react', ({ conversationId, messageId, reactions }) => {
            if (!conversationId || !messageId) return;
            const room = `conversation_${conversationId}`;
            socket.to(room).emit('message:reacted', { conversationId, messageId, reactions });
        });

        // ============================================
        // EVENT: TYPING START
        // ============================================
        socket.on('typing:start', ({ conversationId, userId, user_name }) => {
            if (!conversationId || !userId) return;

            const key = `${conversationId}_${userId}`;
            const room = `conversation_${conversationId}`;

            // Clear existing timeout
            if (typingUsers.has(key)) {
                clearTimeout(typingUsers.get(key));
            }

            // Broadcast typing to others in room
            socket.to(room).emit('typing:update', { conversationId, userId, user_name, isTyping: true });

            // Auto-clear after 5 seconds of inactivity
            const timeout = setTimeout(() => {
                typingUsers.delete(key);
                socket.to(room).emit('typing:update', { conversationId, userId, user_name, isTyping: false });
            }, 5000);

            typingUsers.set(key, timeout);
        });

        // ============================================
        // EVENT: TYPING STOP
        // ============================================
        socket.on('typing:stop', ({ conversationId, userId, user_name }) => {
            if (!conversationId || !userId) return;

            const key = `${conversationId}_${userId}`;
            const room = `conversation_${conversationId}`;

            // Clear timeout and remove from map
            if (typingUsers.has(key)) {
                clearTimeout(typingUsers.get(key));
                typingUsers.delete(key);
            }

            socket.to(room).emit('typing:update', { conversationId, userId, user_name, isTyping: false });
        });

        // ============================================
        // EVENT: MARK MESSAGES READ
        // ============================================
        socket.on('messages:read', ({ conversationId, userId }) => {
            if (!conversationId || !userId) return;
            const room = `conversation_${conversationId}`;
            socket.to(room).emit('messages:read', { conversationId, userId });
        });

        // ============================================
        // EVENT: DISCONNECT
        // ============================================
        socket.on('disconnect', async () => {
            const userId = userSockets.get(socket.id);
            console.log(`🔌 [Socket] Disconnected: ${socket.id}${userId ? ` (userId: ${userId})` : ''}`);

            if (userId) {
                userSockets.delete(socket.id);

                // Only mark offline if user has NO other active sockets
                const remainingSockets = getSocketIdsForUser(userId);
                if (remainingSockets.length === 0) {
                    onlineUsers.delete(userId);
                    await updateDbStatus(userId, false);
                    io.emit('users:online', getOnlineUserIds());
                    console.log(`📴 [Socket] User ${userId} is now offline`);
                }

                // Clear any typing states for this user
                for (const [key, timeout] of typingUsers.entries()) {
                    if (key.endsWith(`_${userId}`)) {
                        clearTimeout(timeout);
                        typingUsers.delete(key);
                    }
                }
            }
        });
    });

    console.log('✅ Socket.IO initialized');
    return io;
}

module.exports = {
    initSocket,
    getOnlineUserIds,
    broadcastNewMessage,
    broadcastReaction,
    broadcastMessageDeleted,
    broadcastMessagesRead,
};