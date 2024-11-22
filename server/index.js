const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Express and Socket.IO
const allowedOrigins = [
  'https://bali-balik.vercel.app',
  'http://localhost:3000',
  // Add any other domains you need to allow
];

// CORS for Express
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Create Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true, // Enable Socket.IO version 3 compatibility
  transports: ['websocket', 'polling']
});

// Your existing Socket.IO logic here
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Your existing socket event handlers...
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 