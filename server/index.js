const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Single CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const httpServer = createServer(app);

// Socket.IO setup with matching CORS config
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for now
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Remove the separate app.listen() as it creates a second server
// app.listen(port, () => console.log(`Listening on port ${port})`));

// Rest of your Socket.IO code remains the same
const rooms = new Map();
const activeGames = new Set();
const topics = [/* your topics */];

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // ... rest of your socket code
});

// Single server listen
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 