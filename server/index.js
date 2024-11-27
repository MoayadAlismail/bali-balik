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
const HEALTH_CHECK_PORT = process.env.HEALTH_CHECK_PORT || 8000;

// Create health check server
const healthApp = express();
healthApp.get('/', (req, res) => {
  res.status(200).send('OK');
});
healthApp.listen(HEALTH_CHECK_PORT, () => {
  console.log(`Health check server listening on port ${HEALTH_CHECK_PORT}`);
});

// Rest of your server code...
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : [
      'https://www.balibalik.com', 
      'https://balibalik.com', 
      'http://localhost:3000',
      'https://balibalik.koyeb.app'
    ];

// Initialize Express and Middleware
const server = express();
server.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

// Logging Utility
const log = (message, data = '') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  console.log(logMessage);
  process.stdout.write(logMessage + '\n'); // Ensures logs show in platforms like Koyeb
};

// Global Variables
const rooms = new Map();
const topics = ['حيوانات', 'طعام', 'رياضة', 'مدن', 'مهن', 'ألوان', 'أفلام', 'مشاهير'];

// Health and Debug Endpoints
server.get('/health', (req, res) => {
  log('Health check endpoint called');
  res.status(200).json({ status: 'ok', rooms: Array.from(rooms.keys()) });
});

server.get('/debug', (req, res) => {
  log('Debug endpoint called');
  const debugInfo = {
    connections: io?.sockets?.sockets?.size || 0,
    rooms: Array.from(rooms.entries()).map(([pin, room]) => ({
      pin,
      players: room.players,
      state: room.state,
      host: room.host,
    })),
    allowedOrigins,
  };
  res.status(200).json(debugInfo);
});

// Integrate Next.js
app.prepare().then(() => {
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket.IO Handlers
  io.on('connection', (socket) => {
    log(`Socket connected: ${socket.id}`);

    socket.onAny((eventName, ...args) => {
      log(`Received event "${eventName}"`, JSON.stringify(args));
    });

    socket.on('create-game', () => createGame(socket));
    socket.on('join-room', (data) => joinRoom(socket, data));
    socket.on('start-game', (pin) => startGame(socket, pin));

    socket.on('disconnect', () => handleDisconnect(socket));
  });

  // Start the server
  httpServer.listen(PORT, () => {
    log('==================================');
    log(`Server running on port ${PORT}`);
    log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
    log('==================================');
  });

  // Error Handlers
  process.on('uncaughtException', (err) => log(`Uncaught Exception: ${err.message}`, err.stack));
  process.on('unhandledRejection', (reason, promise) => log('Unhandled Rejection', { promise, reason }));
});

// Helper Functions
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
    hostName: null,
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
    room.hostName = playerName;
  }
  if (!room.players.includes(playerName)) {
    room.players.push(playerName);
  }

  socket.data.playerName = playerName;
  socket.data.currentRoom = pin;

  io.to(pin).emit('player-joined', {
    players: room.players,
    hostName: room.hostName,
  });
}

function startGame(socket, pin) {
  const room = rooms.get(pin);
  if (!room || room.state !== 'waiting' || room.host !== socket.id || room.players.length < 2) {
    return socket.emit('error', { message: 'Invalid game start request' });
  }

  const topic = topics[Math.floor(Math.random() * topics.length)];
  room.topic = topic;
  room.state = 'playing';
  room.guesses.clear();

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
  io.to(pin).emit('game-started', { topic, timeLeft, players: room.players });
}

function endGame(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.state = 'results';
  const results = calculateResults(room.guesses);

  io.to(pin).emit('game-results', {
    results,
    topic: room.topic,
    players: room.players,
  });
}

function handleDisconnect(socket) {
  for (const [pin, room] of rooms.entries()) {
    if (room.host === socket.id) {
      if (room.timer) clearInterval(room.timer);
      io.to(pin).emit('game-ended', { reason: 'host-disconnected' });
      rooms.delete(pin);
    } else if (room.players.includes(socket.data?.playerName)) {
      room.players = room.players.filter((name) => name !== socket.data.playerName);
      io.to(pin).emit('player-left', {
        players: room.players,
        playerName: socket.data.playerName,
      });
    }
  }
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