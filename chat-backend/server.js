const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection - FIXED (removed deprecated options)
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected');
  console.log(`📊 Database: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Handle MongoDB events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// Import models
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// Store active connections
const clients = new Map();
const roomUsers = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'authenticate':
          await handleAuthentication(ws, message.data);
          break;
          
        case 'join_room':
          await handleJoinRoom(ws, message.data);
          break;
          
        case 'leave_room':
          await handleLeaveRoom(ws, message.data);
          break;
          
        case 'send_message':
          await handleSendMessage(ws, message.data);
          break;
          
        case 'create_room':
          await handleCreateRoom(ws, message.data);
          break;
          
        case 'get_rooms':
          await handleGetRooms(ws);
          break;
          
        case 'get_messages':
          await handleGetMessages(ws, message.data);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'An error occurred processing your request'
      }));
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Authentication handler
async function handleAuthentication(ws, data) {
  const { username } = data;
  
  // Check if username is already taken
  const isUsernameTaken = Array.from(clients.values()).some(
    client => client.username === username
  );
  
  if (isUsernameTaken) {
    ws.send(JSON.stringify({
      type: 'auth_error',
      message: 'Username is already taken'
    }));
    return;
  }
  
  // Create or find user
  let user = await User.findOne({ username });
  if (!user) {
    user = await User.create({ username, isOnline: true });
  } else {
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
  }
  
  // Store client info
  clients.set(ws, {
    userId: user._id,
    username: username,
    currentRoom: null
  });
  
  ws.send(JSON.stringify({
    type: 'authenticated',
    data: { userId: user._id, username }
  }));
  
  console.log(`✅ User authenticated: ${username}`);
}

// Join room handler
async function handleJoinRoom(ws, data) {
  const { roomId } = data;
  const client = clients.get(ws);
  
  if (!client) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
    return;
  }
  
  // Leave previous room if any
  if (client.currentRoom) {
    await handleLeaveRoom(ws, { roomId: client.currentRoom });
  }
  
  // Join new room
  const room = await Room.findById(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }
  
  client.currentRoom = roomId;
  
  // Add user to room users map
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set());
  }
  roomUsers.get(roomId).add(client.username);
  
  // Update room user count
  room.userCount = roomUsers.get(roomId).size;
  await room.save();
  
  ws.send(JSON.stringify({
    type: 'joined_room',
    data: { roomId, roomName: room.name }
  }));
  
  // Broadcast to room that user joined
  broadcastToRoom(roomId, {
    type: 'user_joined',
    data: {
      username: client.username,
      onlineUsers: Array.from(roomUsers.get(roomId))
    }
  }, ws);
  
  console.log(`👤 ${client.username} joined room: ${room.name}`);
}

// Leave room handler
async function handleLeaveRoom(ws, data) {
  const { roomId } = data;
  const client = clients.get(ws);
  
  if (!client || client.currentRoom !== roomId) return;
  
  // Remove user from room
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(client.username);
    
    // Update room user count
    const room = await Room.findById(roomId);
    if (room) {
      room.userCount = roomUsers.get(roomId).size;
      await room.save();
    }
    
    // Broadcast to room that user left
    broadcastToRoom(roomId, {
      type: 'user_left',
      data: {
        username: client.username,
        onlineUsers: Array.from(roomUsers.get(roomId))
      }
    });
  }
  
  client.currentRoom = null;
  console.log(`👋 ${client.username} left room`);
}

// Send message handler
async function handleSendMessage(ws, data) {
  const { roomId, text } = data;
  const client = clients.get(ws);
  
  if (!client || client.currentRoom !== roomId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }
  
  // Validate message
  if (!text || text.trim().length === 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Message cannot be empty' }));
    return;
  }
  
  // Save message to database
  const message = await Message.create({
    roomId,
    userId: client.userId,
    username: client.username,
    text: text.trim(),
    timestamp: new Date()
  });
  
  // Broadcast message to all users in the room
  broadcastToRoom(roomId, {
    type: 'new_message',
    data: {
      id: message._id,
      username: client.username,
      text: message.text,
      timestamp: message.timestamp
    }
  });
  
  console.log(`💬 Message from ${client.username} in room ${roomId}`);
}

// Create room handler
async function handleCreateRoom(ws, data) {
  const { roomName } = data;
  const client = clients.get(ws);
  
  if (!client) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
    return;
  }
  
  // Validate room name
  if (!roomName || roomName.trim().length === 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room name cannot be empty' }));
    return;
  }
  
  // Check if room already exists
  const existingRoom = await Room.findOne({ name: roomName.trim() });
  if (existingRoom) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room already exists' }));
    return;
  }
  
  // Create new room
  const room = await Room.create({
    name: roomName.trim(),
    createdBy: client.userId,
    userCount: 0
  });
  
  ws.send(JSON.stringify({
    type: 'room_created',
    data: {
      id: room._id,
      name: room.name,
      userCount: room.userCount
    }
  }));
  
  // Broadcast to all clients that new room was created
  broadcast({
    type: 'room_list_updated'
  });
  
  console.log(`🏠 Room created: ${room.name} by ${client.username}`);
}

// Get rooms handler
async function handleGetRooms(ws) {
  const rooms = await Room.find().select('name userCount createdAt').lean();
  
  ws.send(JSON.stringify({
    type: 'rooms_list',
    data: rooms
  }));
}

// Get messages handler
async function handleGetMessages(ws, data) {
  const { roomId, limit = 50 } = data;
  
  const messages = await Message.find({ roomId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  
  ws.send(JSON.stringify({
    type: 'messages_history',
    data: messages.reverse()
  }));
}

// Handle disconnect
async function handleDisconnect(ws) {
  const client = clients.get(ws);
  
  if (client) {
    // Leave current room
    if (client.currentRoom) {
      await handleLeaveRoom(ws, { roomId: client.currentRoom });
    }
    
    // Update user status
    const user = await User.findById(client.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }
    
    clients.delete(ws);
    console.log(`🔌 User disconnected: ${client.username}`);
  }
}

// Broadcast to all clients in a room
function broadcastToRoom(roomId, message, excludeWs = null) {
  clients.forEach((client, ws) => {
    if (client.currentRoom === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast to all connected clients
function broadcast(message) {
  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chat server is running' });
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().select('name userCount createdAt');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 CHAT SERVER STARTED');
  console.log('='.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 HTTP: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
  console.log('='.repeat(50));
});