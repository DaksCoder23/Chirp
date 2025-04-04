// routes/conversationRoutes.js
const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const conversationController = require('../controllers/conversationController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all conversations for the current user
router.get('/', conversationController.getConversations);

// Create a new conversation
router.post('/', conversationController.createConversation);

// Get a specific conversation with messages
router.get('/:id', conversationController.getConversation);

// Send a message in a conversation
router.post('/:id/messages', conversationController.sendMessage);

// Mark messages as read
router.post('/:id/read', conversationController.markAsRead);

module.exports = router;