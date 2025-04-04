// websocket/handler.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Load SECRET_KEY from environment variables
const SECRET_KEY = process.env.SECRET_KEY || "defaultSecretKey";

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });
  
  // Store active connections with their user info
  const clients = new Map();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication
        if (data.type === 'auth') {
          try {
            // Verify JWT token
            const user = jwt.verify(data.token, SECRET_KEY);
            
            // Store user info with this connection
            ws.userId = user.id;
            ws.email = user.email;
            
            // Add to clients map
            if (!clients.has(user.id)) {
              clients.set(user.id, []);
            }
            clients.get(user.id).push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: user.id
            }));
            
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed'
            }));
          }
        }
        
        // Handle joining a specific conversation
        else if (data.type === 'join_conversation') {
          if (!ws.userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }
          
          ws.conversationId = data.conversationId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (ws.userId) {
        // Remove from clients map
        const userConnections = clients.get(ws.userId);
        if (userConnections) {
          const index = userConnections.indexOf(ws);
          if (index !== -1) {
            userConnections.splice(index, 1);
          }
          
          // Clean up if no more connections for this user
          if (userConnections.length === 0) {
            clients.delete(ws.userId);
          }
        }
      }
    });
  });
  
  // Function to broadcast message to a specific user
  const sendToUser = (userId, message) => {
    const userConnections = clients.get(userId);
    if (userConnections) {
      userConnections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  };
  
  return {
    wss,
    sendToUser
  };
};

module.exports = setupWebSocket;