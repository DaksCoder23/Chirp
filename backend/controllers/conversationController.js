// controllers/conversationController.js
const db = require('../config/db');
const { User, Conversation, Message } = require('../models/MessageModels');

// Helper function to get MySQL user details
const getMySQLUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT id, name, email FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
};

// Helper function to get MySQL user details by ID
const getMySQLUserById = (userId) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT id, name, email FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
};

// Ensure MongoDB user exists for MySQL user
const ensureMongoUser = async (mysqlUser) => {
  try {
    let mongoUser = await User.findOne({ mysqlUserId: mysqlUser.id });
    
    if (!mongoUser) {
      mongoUser = new User({
        mysqlUserId: mysqlUser.id,
        email: mysqlUser.email
      });
      await mongoUser.save();
    }
    
    return mongoUser;
  } catch (error) {
    console.error('Error ensuring MongoDB user:', error);
    throw error;
  }
};

// Get all conversations for current user
exports.getConversations = async (req, res) => {
  try {
    const mysqlUserId = req.user.id;
    
    // Find all conversations where this user is a participant
    const conversations = await Conversation.find({
      participants: mysqlUserId
    }).populate('lastMessage').sort({ updatedAt: -1 });
    
    // Format the response
    const formattedConversations = await Promise.all(conversations.map(async (convo) => {
      // Find the other participant's MySQL ID
      const otherParticipantId = convo.participants.find(id => id !== mysqlUserId);
      
      // Get MySQL user details
      const otherParticipant = await getMySQLUserById(otherParticipantId);
      
      if (!otherParticipant) {
        return null; // Skip if participant no longer exists
      }
      
      // Count unread messages
      const unreadCount = await Message.countDocuments({
        conversation: convo._id,
        sender: otherParticipantId,
        read: false
      });
      
      return {
        _id: convo._id,
        participant: {
          id: otherParticipant.id,
          name: otherParticipant.name,
          email: otherParticipant.email
        },
        lastMessage: convo.lastMessage,
        unreadCount,
        updatedAt: convo.updatedAt
      };
    }));
    
    // Filter out any null entries (from deleted users)
    const validConversations = formattedConversations.filter(convo => convo !== null);
    
    res.json(validConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to retrieve conversations' });
  }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
  try {
    const { recipientEmail } = req.body;
    const currentUserId = req.user.id;
    
    // Find recipient in MySQL
    const recipient = await getMySQLUserByEmail(recipientEmail);
    
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow conversations with self
    if (recipient.id === currentUserId) {
      return res.status(400).json({ message: 'Cannot start conversation with yourself' });
    }
    
    // Ensure MongoDB records exist for both users
    await ensureMongoUser(req.user);
    await ensureMongoUser(recipient);
    
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipient.id], $size: 2 }
    });
    
    if (existingConversation) {
      return res.json({ conversationId: existingConversation._id });
    }
    
    // Create new conversation
    const newConversation = new Conversation({
      participants: [currentUserId, recipient.id]
    });
    
    await newConversation.save();
    
    res.status(201).json({ conversationId: newConversation._id });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
};

// Get a single conversation with messages
exports.getConversation = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    
    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Verify that the current user is a participant
    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find the other participant
    const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
    const otherParticipant = await getMySQLUserById(otherParticipantId);
    
    if (!otherParticipant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Get messages in this conversation
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 });
    
    res.json({
      participant: {
        id: otherParticipant.id,
        name: otherParticipant.name,
        email: otherParticipant.email
      },
      messages: messages.map(msg => ({
        _id: msg._id,
        sender: msg.sender,
        content: msg.content,
        read: msg.read,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Failed to retrieve conversation' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const senderId = req.user.id;
    const { content } = req.body;
    
    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Verify that the current user is a participant
    if (!conversation.participants.includes(senderId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Create new message
    const newMessage = new Message({
      conversation: conversationId,
      sender: senderId,
      content
    });
    
    await newMessage.save();
    
    // Update conversation's lastMessage and updatedAt
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = Date.now();
    await conversation.save();
    
    res.status(201).json({
      message: newMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    
    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Verify that the current user is a participant
    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find the other participant
    const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
    
    // Mark all messages from the other participant as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: otherParticipantId,
        read: false
      },
      { read: true }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};