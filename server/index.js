const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

// Global game state
const rooms = new Map();
const topics = ['حيوانات', 'طعام', 'رياضة', 'مدن', 'مهن', 'ألوان', 'أفلام', 'مشاهير'];

// Set NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Initialize Express
const server = express();

// Create HTTP server with explicit timeouts
const httpServer = http.createServer({
  keepAliveTimeout: 120000,
  headersTimeout: 120000,
  timeout: 120000,
}, server);

// CORS configuration with explicit WebSocket support
const corsOptions = {
  origin: [
    'https://www.balibalik.com',
    'https://balibalik.com',
    'https://bali-balik.onrender.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  handlePreflightRequest: (req, res) => {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': true
    });
    res.end();
  }
};

server.use(cors(corsOptions));

// Prepare Next.js
app.prepare().then(() => {
  // Socket.IO configuration with enhanced WebSocket settings
  const io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: false,
    maxHttpBufferSize: 1e8,
    path: '/socket.io/',
    addTrailingSlash: false,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2000,
      skipMiddlewares: true,
    },
    allowEIO3: true,
    wsEngine: 'ws'
  });

  // Add connection logging
  io.engine.on('connection_error', (err) => {
    console.error('Connection error:', {
      code: err.code,
      message: err.message,
      context: err.context,
      req: err.req && {
        url: err.req.url,
        headers: err.req.headers,
        method: err.req.method
      }
    });
  });

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('create-game', () => createGame(socket));
    socket.on('join-room', (data) => joinRoom(socket, data, io));
    socket.on('start-game', (pin) => startGame(socket, pin, io));
    socket.on('submit-guess', (data) => handleGuess(socket, data, io));
    socket.on('disconnect', () => handleDisconnect(socket, io));
  });

  // Handle all other routes with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Listen on 0.0.0.0 as required by Render
  const PORT = process.env.PORT || 10000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
====================================
🚀 Server running in ${dev ? 'development' : 'production'} mode
🌐 Server listening on port ${PORT}
🔌 WebSocket enabled
====================================
    `);
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
    guesses: new Map()
  });
  socket.emit('game-created', pin);
}

function joinRoom(socket, { pin, playerName, role }, io) {
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

function startGame(socket, pin, io) {
  const room = rooms.get(pin);
  if (!room || room.host !== socket.id) return;

  const topic = topics[Math.floor(Math.random() * topics.length)];
  room.topic = topic;
  room.state = 'playing';
  room.guesses = new Map();

  io.to(pin).emit('game-started', { topic, timeLeft: 60 });

  let timeLeft = 60;
  const timer = setInterval(() => {
    timeLeft--;
    io.to(pin).emit('timer-update', timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timer);
      endGame(pin, io);
    }
  }, 1000);
}

function handleGuess(socket, { pin, playerName, guess }, io) {
  const room = rooms.get(pin);
  if (room && room.state === 'playing') {
    room.guesses.set(playerName, guess);
    io.to(pin).emit('guess-submitted', { playerName });
  }
}

function handleDisconnect(socket, io) {
  for (const [pin, room] of rooms.entries()) {
    if (room.players.includes(socket.data?.playerName)) {
      room.players = room.players.filter(name => name !== socket.data.playerName);
      io.to(pin).emit('player-left', room.players);
    }
    if (room.host === socket.id) {
      io.to(pin).emit('game-ended', { reason: 'host-disconnected' });
      rooms.delete(pin);
    }
  }
}

function endGame(pin, io) {
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

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

