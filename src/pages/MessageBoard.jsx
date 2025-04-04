import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MessageBoard.css';

const MessageBoard = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessageEmail, setNewMessageEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user from local storage
    /*
    const userJson = localStorage.getItem('user');
    if (!userJson) {
     navigate('/login');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }*/
    
    // Fetch conversations
    const fetchConversations = async () => {
      try {
        const response = await axios.get('/api/conversations', {
          headers: { Authorization: token }
        });
        setConversations(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load conversations');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchConversations();
    
    // Set up websocket connection
    const setupWebSocket = () => {
      const ws = new WebSocket('ws://' + window.location.hostname + ':5000');
      
      ws.onopen = () => {
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          token
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Refresh conversations to update last message
          fetchConversations();
        }
      };
      
      return ws;
    };
    
    const ws = setupWebSocket();
    
    return () => {
      ws.close();
    };
  }, [navigate]);

  const handleConversationClick = (conversationId) => {
    navigate(`/conversation/${conversationId}`);
  };

  const startNewConversation = async (e) => {
    e.preventDefault();
    
    if (!newMessageEmail.trim()) {
      return;
    }
    
    try {
      const response = await axios.post('/api/conversations', 
        { recipientEmail: newMessageEmail },
        { headers: { Authorization: localStorage.getItem('token') } }
      );
      
      // Navigate to the new conversation
      navigate(`/conversation/${response.data.conversationId}`);
    } catch (err) {
      setError('Failed to start conversation. User may not exist.');
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading conversations...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="message-board-container">
      <h1>Chirp Messages</h1>
      
      <form className="new-conversation-form" onSubmit={startNewConversation}>
        <input
          type="email"
          placeholder="Enter email to start a new conversation"
          value={newMessageEmail}
          onChange={(e) => setNewMessageEmail(e.target.value)}
          required
        />
        <button type="submit">Start Conversation</button>
      </form>
      
      <div className="conversation-grid">
        {conversations.length === 0 ? (
          <p>No conversations yet. Start one by entering an email above!</p>
        ) : (
          conversations.map((convo) => (
            <div 
              key={convo._id} 
              className="conversation-tile"
              onClick={() => handleConversationClick(convo._id)}
            >
              <div className="avatar">
                {convo.participant.name.charAt(0).toUpperCase()}
              </div>
              <div className="conversation-info">
                <h3>{convo.participant.name}</h3>
                <p className="last-message">
                  {convo.lastMessage?.content || 'No messages yet'}
                </p>
                <p className="timestamp">
                  {convo.lastMessage?.createdAt ? 
                    new Date(convo.lastMessage.createdAt).toLocaleString() : ''}
                </p>
              </div>
              {convo.unreadCount > 0 && 
                <span className="unread-badge">{convo.unreadCount}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageBoard;