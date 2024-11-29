const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

// Global game state
const rooms = new Map();
const topics = ['حيوانات', 'طعام', 'رياضة', 'مدن', 'مهن', 'ألوان', 'أفلام', 'مشاهير'];

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3000;

// Initialize Express and Middleware
const server = express();

// Health check endpoint - Move this before other middleware
server.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// CORS configuration
const corsOptions = {
  origin: '*',  // Temporarily allow all origins for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

server.use(cors(corsOptions));

// Prepare Next.js
app.prepare().then(() => {
  const httpServer = http.createServer(server);
  
  // Socket.IO configuration with adjusted timeouts
  const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 60000,
    allowUpgrades: true,
    perMessageDeflate: true,
    maxHttpBufferSize: 1e8
  });

  // Add more detailed connection logging
  io.engine.on('connection_error', (err) => {
    console.error('Connection error:', err.code, err.message, err.context);
  });

  io.on('connection', (socket) => {
    console.log('=== New Connection ===');
    console.log('Socket ID:', socket.id);
    console.log('Transport:', socket.conn.transport.name);
    console.log('Headers:', JSON.stringify(socket.handshake.headers, null, 2));
    console.log('Query:', JSON.stringify(socket.handshake.query, null, 2));
    console.log('===================');

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

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

  // Start server with explicit host
  httpServer.listen(PORT, '0.0.0.0', () => {
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
