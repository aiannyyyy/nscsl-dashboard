const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/ChatController/chatController');
const authenticateToken = require('../../middleware/authMiddleware');
const upload = require('../../config/multer');

// All chat routes require authentication
router.use(authenticateToken);

// ============================================
// CONVERSATION ROUTES
// ============================================
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);

// ============================================
// MESSAGE ROUTES
// ✅ Specific routes FIRST — before any :param routes
// ============================================
router.get('/messages/unread', chatController.getAllUnreadMessages);
router.post('/messages/read', chatController.markAsRead);
router.post('/messages/file', upload.single('file'), chatController.attachFile);
router.post('/messages', chatController.sendMessage);

// ✅ Param routes AFTER specific ones
router.get('/messages/:conversationId/unread-count', chatController.getUnreadCount);
router.get('/messages/:conversationId', chatController.getMessages);
router.delete('/messages/:messageId', chatController.deleteMessage);

// ============================================
// SEARCH ROUTE
// ============================================
router.get('/search', chatController.searchMessages);

// ============================================
// FILE ROUTES
// ============================================
router.post('/upload', upload.single('file'), chatController.uploadFile);

// ============================================
// USER / STATUS ROUTES
// ============================================
router.get('/users', chatController.getUsers);
router.get('/status', chatController.getUserStatus);
router.put('/status', chatController.updateUserStatus);

// ============================================
// REACTION ROUTES
// ✅ /reactions/emojis BEFORE /reactions/:messageId
// ============================================
router.get('/reactions/emojis', chatController.getDefaultEmojis);
router.get('/reactions/:messageId', chatController.getMessageReactions);
router.post('/reactions', chatController.addReaction);
router.delete('/reactions', chatController.removeReaction);

module.exports = router;