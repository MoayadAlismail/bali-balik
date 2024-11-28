const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3000;

// Initialize Express and Middleware
const server = express();

const allowedOrigins = dev
  ? ['http://localhost:3000']
  : process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : [
        'https://www.balibalik.com',
        'https://balibalik.com',
        'https://balibalik.koyeb.app'
      ];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

// Apply CORS middleware to Express
server.use(cors(corsOptions));

// Global Variables
const rooms = new Map();
const topics = ['حيوانات', 'طعام', 'رياضة', 'مدن', 'مهن', 'ألوان', 'أفلام', 'مشاهير'];

// Health check endpoint
server.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Prepare Next.js
app.prepare().then(() => {
  // Create HTTP server
  const httpServer = http.createServer(server);

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
  });

  // Socket.IO event listeners
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-game', () => createGame(socket));
    socket.on('join-room', (data) => joinRoom(socket, data));
    socket.on('start-game', (pin) => startGame(socket, pin));
    socket.on('guess', (data) => handleGuess(socket, data));
    socket.on('disconnect', () => handleDisconnect(socket));
  });

  // Handle Next.js requests
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
    console.log('> Mode:', dev ? 'development' : 'production');
  });
});

// Game logic functions
function createGame(socket) {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  socket.join(pin);
  rooms.set(pin, {
    pin,
    players: [],
    host: socket.id,
    state: 'waiting',
    topic: null,
    guesses: new Map(),
  });
  socket.emit('game-created', pin);
}

function joinRoom(socket, { pin, playerName, role }) {
  const room = rooms.get(pin);
  if (!room) {
    return socket.emit('error', { message: 'Room not found' });
  }

  socket.join(pin);
  if (role === 'host') {
    room.host = socket.id;
  }
  if (!room.players.includes(playerName)) {
    room.players.push(playerName);
  }

  socket.data.playerName = playerName;
  socket.data.currentRoom = pin;

  io.to(pin).emit('player-joined', room.players);
}

function startGame(socket, pin) {
  const room = rooms.get(pin);
  if (!room || room.host !== socket.id) return;

  const topic = topics[Math.floor(Math.random() * topics.length)];
  room.topic = topic;
  room.state = 'playing';
  room.guesses = new Map();

  io.to(pin).emit('game-started', { topic, timeLeft: 60 });

  // Start countdown
  let timeLeft = 60;
  const timer = setInterval(() => {
    timeLeft--;
    io.to(pin).emit('timer-update', timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timer);
      endGame(pin);
    }
  }, 1000);
}

function handleDisconnect(socket) {
  for (const [pin, room] of rooms.entries()) {
    if (room.players.includes(socket.data?.playerName)) {
      room.players = room.players.filter((name) => name !== socket.data.playerName);
      io.to(pin).emit('player-left', room.players);
    }
    if (room.host === socket.id) {
      io.to(pin).emit('game-ended', { reason: 'host-disconnected' });
      rooms.delete(pin);
    }
  }
}

function handleGuess(socket, { pin, playerName, guess }) {
  const room = rooms.get(pin);
  if (room && room.state === 'playing') {
    room.guesses.set(playerName, guess);
    io.to(pin).emit('guess-submitted', { playerName });
  }
}

function endGame(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  room.state = 'results';
  const results = calculateResults(room.guesses);
  io.to(pin).emit('game-results', results);
}

function calculateResults(guesses) {
  const results = {};
  for (const [player, guess] of guesses) {
    if (!results[guess]) {
      results[guess] = [];
    }
    results[guess].push(player);
  }
  return results;
}
