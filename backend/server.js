const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const path = require('path'); 


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN, // Allow all origins for testing; restrict in production
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});


// Waiting List for User Matching
let waitingUsers = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', ({ username, interest }) => {
    console.log(`User ${username} with interest ${interest} attempting to join`);

    const matchedUser = waitingUsers[interest]?.find((u) => u.socket.id !== socket.id);
    if (matchedUser) {
      const room = `${socket.id}#${matchedUser.socket.id}`;
      socket.join(room);
      matchedUser.socket.join(room);

      const preLoadedMessage = `You both have the same interest: ${interest}`;
      io.to(room).emit('chat message', { user: 'System', message: preLoadedMessage });

      io.to(socket.id).emit('matched', { room, partner: matchedUser.username });
      io.to(matchedUser.socket.id).emit('matched', { room, partner: username });

      // Remove matched user from the waiting list
      waitingUsers[interest] = waitingUsers[interest].filter((u) => u.socket.id !== matchedUser.socket.id);
    } else {
      if (!waitingUsers[interest]) {
        waitingUsers[interest] = [];
      }
      waitingUsers[interest].push({ username, socket });
      console.log(`Added ${username} to waitingUsers for interest ${interest}`);
    }
  });

  socket.on('chat message', ({ user, message, room }) => {
    io.to(room).emit('chat message', { user, message });
  });

  socket.on('leave room', (room) => {
    socket.leave(room);
    io.to(room).emit('partner disconnected');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Remove user from waiting list
    for (const interest in waitingUsers) {
      waitingUsers[interest] = waitingUsers[interest].filter((u) => u.socket.id !== socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});