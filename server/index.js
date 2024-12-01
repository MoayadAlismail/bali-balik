const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : [
      'https://www.balibalik.com',
      'https://balibalik.com',
      'http://localhost:3000',
      'https://balibalik.up.railway.app'
    ];

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Game state management
const rooms = new Map();
const topics = [
  'حيوانات', 'طعام', 'رياضة', 'مدن',
  'مهن', 'ألوان', 'أفلام', 'مشاهير'
];

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  secure: true,
  rejectUnauthorized: false,
  maxHttpBufferSize: 1e8,
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create-game', () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    socket.join(pin);
    
    rooms.set(pin, {
      pin,
      players: [],
      host: socket.id,
      state: 'waiting',
      topic: null,
      guesses: new Map(),
      hostName: null
    });
    
    socket.emit('game-created', pin);
    console.log(`Game created with pin: ${pin}`);
  });

  socket.on('join-room', ({ pin, playerName, role }) => {
    const room = rooms.get(pin);
    if (!room) {
      console.log(`Rejected join attempt for invalid PIN: ${pin}`);
      socket.emit('join-error', { message: 'غرفة غير موجودة' });
      return;
    }

    // Check if game is already in progress
    if (room.state !== 'waiting') {
      console.log(`Rejected join attempt for room ${pin}: game already in progress`);
      socket.emit('join-error', { message: 'اللعبة قد بدأت بالفعل' });
      return;
    }

    socket.join(pin);
    
    if (role === 'host') {
      room.host = socket.id;
      room.hostName = playerName;
    }
    
    if (!room.players.includes(playerName)) {
      room.players.push(playerName);
    }

    socket.data.playerName = playerName;
    socket.data.currentRoom = pin;
    
    // Debug logs
    console.log('Current room state:', {
      pin,
      players: room.players,
      hostName: room.hostName
    });
    
    // Send the data as an object with a players property
    io.to(pin).emit('player-joined', { 
      players: room.players,
      hostName: room.hostName 
    });
    
    // Confirm successful join to the client
    socket.emit('join-success', {
      pin,
      players: room.players,
      hostName: room.hostName
    });
    
    console.log(`Player ${playerName} joined room ${pin} with players:`, room.players);
  });

  socket.on('start-game', (pin) => {
    const room = rooms.get(pin);
    if (!room || room.host !== socket.id) return;

    const topic = topics[Math.floor(Math.random() * topics.length)];
    room.topic = topic;
    room.state = 'playing';
    room.guesses.clear();
    
    io.to(pin).emit('game-started', { 
      topic,
      timeLeft: 60,
      players: room.players
    });

    let timeLeft = 60;
    const timer = setInterval(() => {
      timeLeft--;
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        endGame(pin);
      } else {
        io.to(pin).emit('timer-update', timeLeft);
      }
    }, 1000);

    room.timer = timer;
    console.log(`Game started in room ${pin} with topic: ${topic}`);
  });

  socket.on('disconnect', () => {
    for (const [pin, room] of rooms.entries()) {
      if (room.host === socket.id) {
        if (room.timer) clearInterval(room.timer);
        io.to(pin).emit('game-ended', { reason: 'host-disconnected' });
        rooms.delete(pin);
        console.log(`Host disconnected, room ${pin} closed`);
      } else if (room.players.includes(socket.data?.playerName)) {
        room.players = room.players.filter(name => name !== socket.data.playerName);
        io.to(pin).emit('player-left', {
          players: room.players,
          playerName: socket.data.playerName
        });
        console.log(`Player ${socket.data.playerName} left room ${pin}`);
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    rooms: Array.from(rooms.keys())
  });
});

// Add this near your other endpoints
app.get('/validate-pin/:pin', (req, res) => {
  const pin = req.params.pin;
  const roomExists = rooms.has(pin);
  console.log(`PIN validation request for ${pin}: ${roomExists ? 'valid' : 'invalid'}`);
  res.json({ valid: roomExists });
});

// Start server
const PORT = process.env.PORT || 3001 || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('==================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log('==================================');
}); 