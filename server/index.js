const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Set keep-alive timeout to 120 seconds (120000 ms)
httpServer.keepAliveTimeout = 120000;
// Set headers timeout to 120 seconds (120000 ms)
httpServer.headersTimeout = 120000;

// Near the top of the file, after imports
// Simple logging that's guaranteed to show in Render
const log = (message, data = '') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  console.log(logMessage);
  // Force flush logs
  process.stdout.write(logMessage + '\n');
};

// Add these routes before Socket.IO setup to test server connectivity
app.get('/health', (req, res) => {
  log('Health check endpoint called');
  res.status(200).json({ status: 'ok', rooms: Array.from(rooms.keys()) });
});

app.get('/debug', (req, res) => {
  log('Debug endpoint called');
  const debugInfo = {
    connections: io?.sockets?.sockets?.size || 0,
    rooms: Array.from(rooms.entries()).map(([pin, room]) => ({
      pin,
      players: room.players,
      state: room.state,
      host: room.host
    })),
    allowedOrigins
  };
  res.status(200).json(debugInfo);
});

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : [
      'https://www.balibalik.com',
      'https://balibalik.com',
      'http://localhost:3000',
      'https://bali-balik.onrender.com'
    ];

console.log('Server starting...');
console.log('Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Game state management
const rooms = new Map();
const topics = [
  'حيوانات',
  'طعام',
  'رياضة',
  'مدن',
  'مهن',
  'ألوان',
  'أفلام',
  'مشاهير'
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  log(`Socket connected: ${socket.id}`);
  
  // Debug socket rooms every 10 seconds
  const debugInterval = setInterval(() => {
    const socketRooms = Array.from(socket.rooms);
    log(`Socket ${socket.id} rooms: ${JSON.stringify(socketRooms)}`);
  }, 10000);

  // Add debug logging for all incoming events
  socket.onAny((eventName, ...args) => {
    log(`Received event "${eventName}"`, JSON.stringify(args));
  });

  socket.on('create-game', () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create room and immediately join it
    socket.join(pin);
    
    rooms.set(pin, {
      pin, // Add pin to room data for easier reference
      players: [],
      host: socket.id,
      state: 'waiting',
      topic: null,
      guesses: new Map(),
      hostName: null // Add this to track host's name
    });
    
    socket.emit('game-created', pin);
  });

  socket.on('join-room', ({ pin, playerName, role }) => {
    const room = rooms.get(pin);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Join the socket to the room
    socket.join(pin);
    
    // Store player data
    if (role === 'host') {
      room.host = socket.id;
      room.hostName = playerName;
    }
    
    // Only add player if not already in the list
    if (!room.players.includes(playerName)) {
      room.players.push(playerName);
    }

    // Store the player's name with their socket for later reference
    socket.data.playerName = playerName;
    socket.data.currentRoom = pin;
    
    // Emit updated player list to everyone in the room
    io.to(pin).emit('player-joined', {
      players: room.players,
      hostName: room.hostName
    });
  });

  socket.on('start-game', (pin) => {
    log('start-game event received for pin:', pin);
    const room = rooms.get(pin);
    
    // Add validation logging
    if (!room) {
        log('Error: Room not found for pin:', pin);
        socket.emit('error', { message: 'Room not found' });
        return;
    }

    if (room.state !== 'waiting') {
        log('Error: Invalid room state:', room.state);
        socket.emit('error', { message: 'Game already in progress' });
        return;
    }

    if (room.host !== socket.id) {
        log('Error: Unauthorized start attempt', {
            requestingSocket: socket.id,
            actualHost: room.host
        });
        socket.emit('error', { message: 'Only host can start the game' });
        return;
    }

    if (room.players.length < 2) {
        log('Error: Not enough players:', room.players.length);
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
    }

    // Log successful game start
    log('Starting game for room:', { 
        pin,
        players: room.players,
        host: room.host
    });

    const topic = topics[Math.floor(Math.random() * topics.length)];
    room.topic = topic;
    room.state = 'playing';
    room.guesses.clear();
    
    // Add emit logging
    try {
        io.to(pin).emit('game-started', { 
            topic,
            timeLeft: 60,
            players: room.players
        });
        log('game-started event emitted successfully for pin:', pin);
    } catch (error) {
        log('Error emitting game-started event:', error);
    }

    // Start the game timer
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

    // Store timer reference in room data
    room.timer = timer;
  });

  socket.on('disconnect', () => {
    // Clean up any rooms where this socket was the host
    for (const [pin, room] of rooms.entries()) {
      if (room.host === socket.id) {
        // Clear any active timers
        if (room.timer) {
          clearInterval(room.timer);
        }
        
        // Notify remaining players
        io.to(pin).emit('game-ended', { reason: 'host-disconnected' });
        
        // Remove the room
        rooms.delete(pin);
      } else if (room.players.includes(socket.data?.playerName)) {
        // Remove player from room if they were a participant
        room.players = room.players.filter(name => name !== socket.data.playerName);
        io.to(pin).emit('player-left', {
          players: room.players,
          playerName: socket.data.playerName
        });
      }
    }
  });
});

function endGame(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  // Clear any active timer
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.state = 'results';
  const results = calculateResults(room.guesses);
  
  io.to(pin).emit('game-results', {
    results,
    topic: room.topic,
    players: room.players
  });
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  log('==================================');
  log(`Server starting on port ${PORT}`);
  log(`Server configured with:`);
  log(`- keepAliveTimeout: ${httpServer.keepAliveTimeout}ms`);
  log(`- headersTimeout: ${httpServer.headersTimeout}ms`);
  log(`- Host: 0.0.0.0`);
  log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
  log('==================================');
});

// Add error handlers
process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err.message}`);
  log(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise);
  log('Reason:', reason);
}); 