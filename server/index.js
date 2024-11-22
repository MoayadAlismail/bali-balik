const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'https://bali-balik.vercel.app',
  'https://www.balibalik.com',
  'http://localhost:3000',
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 204
}));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
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

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-game', () => {
    const pin = generatePin();
    rooms.set(pin, {
      players: [],
      host: socket.id
    });
    socket.emit('game-created', pin);
  });

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

  socket.on('start-game', (pin) => {
    const room = rooms.get(pin);
    if (room && room.host === socket.id) {
      const topic = 'test topic'; // You can modify this to generate random topics
      io.to(pin).emit('game-started', { topic, timeLeft: 60 });
      
      // Start the timer
      let timeLeft = 60;
      const timer = setInterval(() => {
        timeLeft--;
        io.to(pin).emit('timer-update', timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(timer);
          io.to(pin).emit('game-results', {}); // Add your results logic here
        }
      }, 1000);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms if needed
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 