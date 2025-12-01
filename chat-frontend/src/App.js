import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Users, MessageCircle, LogOut, User } from 'lucide-react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    if (isAuthenticated && username) {
      const websocket = new WebSocket('ws://localhost:5000');
      
      websocket.onopen = () => {
        console.log('✅ Connected to server');
        setConnectionStatus('connected');
        
        // Authenticate
        websocket.send(JSON.stringify({
          type: 'authenticate',
          data: { username }
        }));
        
        // Get rooms list
        websocket.send(JSON.stringify({
          type: 'get_rooms'
        }));
      };
      
      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('📨 Received:', message);
        
        switch (message.type) {
          case 'authenticated':
            console.log('✅ Authenticated successfully');
            break;
            
          case 'auth_error':
            alert(message.message);
            setIsAuthenticated(false);
            break;
            
          case 'rooms_list':
            setRooms(message.data.map(room => ({
              id: room._id,
              name: room.name,
              userCount: room.userCount || 0
            })));
            break;
            
          case 'room_created':
            setRooms(prev => [...prev, {
              id: message.data.id,
              name: message.data.name,
              userCount: message.data.userCount
            }]);
            break;
            
          case 'joined_room':
            console.log('✅ Joined room:', message.data.roomName);
            // Request message history
            websocket.send(JSON.stringify({
              type: 'get_messages',
              data: { roomId: currentRoom?.id }
            }));
            break;
            
          case 'messages_history':
            setMessages(message.data.map(msg => ({
              id: msg._id,
              user: msg.username,
              text: msg.text,
              timestamp: msg.timestamp
            })));
            break;
            
          case 'new_message':
            setMessages(prev => [...prev, {
              id: message.data.id,
              user: message.data.username,
              text: message.data.text,
              timestamp: message.data.timestamp
            }]);
            break;
            
          case 'user_joined':
          case 'user_left':
            setOnlineUsers(message.data.onlineUsers);
            break;
            
          case 'room_list_updated':
            websocket.send(JSON.stringify({ type: 'get_rooms' }));
            break;
            
          case 'error':
            console.error('❌ Error:', message.message);
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      websocket.onclose = () => {
        console.log('🔌 Disconnected from server');
        setConnectionStatus('disconnected');
      };
      
      setWs(websocket);
      
      return () => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.close();
        }
      };
    }
  }, [isAuthenticated, username]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = () => {
    if (username.trim()) {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (currentRoom) {
        ws.send(JSON.stringify({
          type: 'leave_room',
          data: { roomId: currentRoom.id }
        }));
      }
      ws.close();
    }
    setIsAuthenticated(false);
    setUsername('');
    setCurrentRoom(null);
    setMessages([]);
    setRooms([]);
  };

  const handleJoinRoom = (room) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    // Leave current room if any
    if (currentRoom) {
      ws.send(JSON.stringify({
        type: 'leave_room',
        data: { roomId: currentRoom.id }
      }));
    }

    setCurrentRoom(room);
    setMessages([]);
    
    // Join new room
    ws.send(JSON.stringify({
      type: 'join_room',
      data: { roomId: room.id }
    }));
  };

  const handleCreateRoom = () => {
    if (newRoomName.trim() && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'create_room',
        data: { roomName: newRoomName }
      }));
      setNewRoomName('');
      setShowCreateRoom(false);
    }
  };

  const formatMessage = (text) => {
    let formatted = text;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');
    return formatted;
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && currentRoom && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_message',
        data: {
          roomId: currentRoom.id,
          text: newMessage
        }
      }));
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateRoomKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateRoom();
    }
  };

  const handleLoginKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon">
            <MessageCircle size={64} />
          </div>
          <h1 className="login-title">Welcome to ChatApp</h1>
          <p className="login-subtitle">Choose a username to get started</p>
          
          <div className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleLoginKeyPress}
                placeholder="Enter your username"
                className="input-field"
              />
            </div>
            
            <button onClick={handleLogin} className="btn-primary">
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="chat-container">
      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div className="connection-status">
          {connectionStatus === 'disconnected' ? '🔴 Disconnected' : '🔌 Connecting...'}
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="user-info">
            <User size={32} />
            <span className="username">{username}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Logout">
            <LogOut size={20} />
          </button>
        </div>

        <button onClick={() => setShowCreateRoom(!showCreateRoom)} className="btn-create-room">
          <Plus size={20} />
          Create Room
        </button>

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="create-room-form">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={handleCreateRoomKeyPress}
              placeholder="Room name"
              className="input-field-small"
            />
            <div className="button-group">
              <button onClick={handleCreateRoom} className="btn-success">Create</button>
              <button onClick={() => setShowCreateRoom(false)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        )}

        {/* Room List */}
        <div className="room-list">
          <h2 className="room-list-title">Chat Rooms</h2>
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleJoinRoom(room)}
              className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
            >
              <div className="room-info">
                <MessageCircle size={20} />
                <span>{room.name}</span>
              </div>
              <span className="user-count">{room.userCount} users</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div>
                <h2 className="room-name">{currentRoom.name}</h2>
                <p className="online-count">{onlineUsers.length} users online</p>
              </div>
              <div className="online-users">
                <Users size={20} />
                <span>{onlineUsers.join(', ')}</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messages.map((msg) => (
                <div key={msg.id} className="message">
                  <div className="message-avatar">
                    {msg.user[0].toUpperCase()}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className={`message-user ${msg.user === username ? 'own-message' : ''}`}>
                        {msg.user}
                      </span>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div 
                      className="message-text"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... (use **bold** or *italic*)"
                  className="message-input"
                />
                <button
                  onClick={handleSendMessage}
                  className="btn-send"
                  disabled={!newMessage.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="input-tip">
                Tip: Use **text** for bold, *text* for italic, or paste links for clickable URLs
              </p>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <MessageCircle size={96} />
            <h3>Select a chat room</h3>
            <p>Choose a room from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;