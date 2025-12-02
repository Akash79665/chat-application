# Real-Time Chat Application

A full-stack real-time chat application built with React, Node.js, WebSocket, and MongoDB. This application allows multiple users to create chat rooms, join conversations, and communicate in real-time.

![Chat Application](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

- **Real-time Messaging**: Instant message delivery using WebSocket technology
- **Multiple Chat Rooms**: Create and join unlimited chat rooms
- **User Authentication**: Simple username-based authentication
- **Online User Tracking**: See who's currently online in each room
- **Message History**: Persistent message storage with MongoDB
- **Rich Text Support**: Format messages with bold, italic, and links
- **Responsive Design**: Modern, clean UI that works on all devices
- **Connection Status**: Visual indicator of connection state

## 🛠️ Technology Stack

### Frontend
- **React** 18.2.0 - UI framework
- **Lucide React** - Icon library
- **WebSocket API** - Real-time communication
- **CSS3** - Custom styling with gradients and animations

### Backend
- **Node.js** - Runtime environment
- **Express** 4.18.2 - Web framework
- **WebSocket (ws)** 8.16.0 - WebSocket server
- **MongoDB** - Database
- **Mongoose** 8.0.3 - ODM for MongoDB
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager
- Git

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Akash79665/chat-application.git
cd chat-application
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd chat-backend

# Install dependencies
npm install

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/chatapp" > .env
echo "PORT=5000" >> .env

# Start MongoDB (if not running)
mongod

# Run the backend server
npm start
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal
# Navigate to frontend directory
cd chat-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will start on `http://localhost:3000`

## 📁 Project Structure

```
chat-application/
├── chat-backend/
│   ├── models/
│   │   ├── User.js          # User schema
│   │   ├── Room.js          # Room schema
│   │   └── Message.js       # Message schema
│   ├── server.js            # Main server file
│   ├── package.json
│   └── .env                 # Environment variables
│
└── chat-frontend/
    ├── public/
    │   ├── index.html
    │   └── favicon.ico
    ├── src/
    │   ├── App.js           # Main React component
    │   ├── App.css          # Application styles
    │   ├── index.js         # Entry point
    │   └── index.css        # Global styles
    └── package.json
```

## 🔌 API Documentation

### WebSocket Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `authenticate` | `{ username }` | Authenticate user |
| `create_room` | `{ roomName }` | Create new chat room |
| `join_room` | `{ roomId }` | Join a chat room |
| `leave_room` | `{ roomId }` | Leave current room |
| `send_message` | `{ roomId, text }` | Send message to room |
| `get_rooms` | - | Get list of all rooms |
| `get_messages` | `{ roomId, limit }` | Get message history |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `authenticated` | `{ userId, username }` | Authentication success |
| `auth_error` | `{ message }` | Authentication failed |
| `rooms_list` | `[{ _id, name, userCount }]` | List of rooms |
| `room_created` | `{ id, name, userCount }` | Room created successfully |
| `joined_room` | `{ roomId, roomName }` | Joined room successfully |
| `messages_history` | `[{ _id, username, text, timestamp }]` | Message history |
| `new_message` | `{ id, username, text, timestamp }` | New message received |
| `user_joined` | `{ username, onlineUsers[] }` | User joined room |
| `user_left` | `{ username, onlineUsers[] }` | User left room |
| `error` | `{ message }` | Error occurred |

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/rooms` | Get all chat rooms |
| GET | `/api/rooms/:roomId/messages` | Get messages for a room |

## 💾 Database Schema

### User Schema
```javascript
{
  username: String (required, unique, 2-20 chars),
  isOnline: Boolean,
  lastSeen: Date,
  createdAt: Date
}
```

### Room Schema
```javascript
{
  name: String (required, unique, 2-30 chars),
  createdBy: ObjectId (ref: User),
  userCount: Number,
  createdAt: Date
}
```

### Message Schema
```javascript
{
  roomId: ObjectId (ref: Room),
  userId: ObjectId (ref: User),
  username: String,
  text: String (max 2000 chars),
  timestamp: Date
}
```

## 🎨 Features in Detail

### Text Formatting
Users can format their messages:
- **Bold**: `**text**` renders as **text**
- *Italic*: `*text*` renders as *text*
- Links: URLs are automatically converted to clickable links

### Real-time Updates
- Messages appear instantly for all users in the room
- Online user list updates when users join/leave
- Room user counts update in real-time
- Connection status indicator

### User Experience
- Auto-scroll to latest messages
- Enter key to send messages
- Visual feedback for own messages
- Avatar with user initials
- Timestamp for each message

## 🔧 Configuration

### Environment Variables (Backend)

Create a `.env` file in `chat-backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/chatapp
PORT=5000
```

### Frontend Configuration

Update WebSocket URL in `App.js` if deploying:
```javascript
const websocket = new WebSocket('ws://your-server-url:5000');
```

## 🚢 Deployment

### Backend Deployment (Heroku Example)

```bash
# Install Heroku CLI and login
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab

# Deploy
git push heroku main
```

### Frontend Deployment (Netlify/Vercel)

1. Build the production version:
```bash
cd chat-frontend
npm run build
```

2. Deploy the `build` folder to your hosting service

3. Update WebSocket URL to production server

## 🧪 Testing

### Manual Testing Checklist
- [ ] User can login with username
- [ ] User can create a new room
- [ ] User can join existing room
- [ ] Messages send and receive in real-time
- [ ] Online users list updates correctly
- [ ] Text formatting works (bold, italic, links)
- [ ] Connection status shows correctly
- [ ] User can logout successfully

## 🐛 Known Issues

- Username uniqueness only checked among online users
- No message edit/delete functionality
- No private messaging support
- No file sharing capability

## 🔮 Future Enhancements

- [ ] User registration and authentication with passwords
- [ ] Private messaging between users
- [ ] File and image sharing
- [ ] Message reactions and emojis
- [ ] User profiles and avatars
- [ ] Room moderation features
- [ ] Message search functionality
- [ ] Voice and video chat integration
- [ ] Mobile app version
- [ ] End-to-end encryption

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Your Name
- GitHub: https://github.com/Akash79665/chat-application.git
- Email: apturkhade@gmail.com

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB for the database solution
- Lucide React for beautiful icons
- All contributors and testers

## 📞 Support

For support, email your. apturkhade@gmail.com or open an issue in the GitHub repository.

---

**Made with ❤️ using React and Node.js**