import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Conversation.css';

const Conversation = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    if (!currentUser || !token) {
      navigate('/login');
      return;
    }
    
    const fetchConversation = async () => {
      try {
        const response = await axios.get(`/api/conversations/${conversationId}`, {
          headers: { Authorization: token }
        });
        
        setMessages(response.data.messages);
        setParticipant(response.data.participant);
        setLoading(false);
        
        // Mark messages as read
        axios.post(`/api/conversations/${conversationId}/read`, {}, {
          headers: { Authorization: token }
        });
        
      } catch (err) {
        setError('Failed to load conversation');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchConversation();
    
    // Set up WebSocket connection
    const ws = new WebSocket('ws://' + window.location.hostname + ':5000');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      
      // Send authentication
      ws.send(JSON.stringify({
        type: 'auth',
        token
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'auth_success') {
        // Join specific conversation
        ws.send(JSON.stringify({
          type: 'join_conversation',
          conversationId
        }));
      }
      else if (data.type === 'new_message' && data.conversationId === conversationId) {
        // Add new message to state
        setMessages(prevMessages => [...prevMessages, data.message]);
        
        // Mark as read since we're in the conversation
        axios.post(`/api/conversations/${conversationId}/read`, {}, {
          headers: { Authorization: token }
        });
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [conversationId, navigate, currentUser, token]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const response = await axios.post(`/api/conversations/${conversationId}/messages`, 
        { content: newMessage },
        { headers: { Authorization: token } }
      );
      
      // Add the new message to the state
      setMessages(prevMessages => [...prevMessages, response.data.message]);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };
  
  if (loading) return <div className="loading">Loading conversation...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="conversation-container">
      <div className="conversation-header">
        <button className="back-button" onClick={() => navigate('/messages')}>
          &larr; Back
        </button>
        <h2>{participant?.name || participant?.email}</h2>
        {!wsConnected && <span className="connection-status">Reconnecting...</span>}
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message) => (
            <div 
              key={message._id} 
              className={`message ${message.sender === currentUser.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">{message.content}</div>
              <div className="message-timestamp">
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={!wsConnected}>Send</button>
      </form>
    </div>
  );
};

export default Conversation;