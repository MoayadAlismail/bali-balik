const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'https://bali-balik.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 204
}));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  path: '/socket.io/'
});

// Game state management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ pin, playerName, role }) => {
    socket.join(pin);
    
    if (!rooms.has(pin)) {
      rooms.set(pin, {
        players: [],
        host: role === 'host' ? socket.id : null
      });
    }
    
    const room = rooms.get(pin);
    if (!room.players.includes(playerName)) {
      room.players.push(playerName);
    }
    
    io.to(pin).emit('player-joined', room.players);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 