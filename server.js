const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 10000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global game state
const rooms = new Map();
const topics = ['حيوانات', 'طعام', 'رياضة', 'مدن', 'مهن', 'ألوان', 'أفلام', 'مشاهير'];

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Add health check endpoint
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Important: Set timeouts
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120000;

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: [
        'https://www.balibalik.com',
        'https://balibalik.com',
        'https://bali-balik.onrender.com',
        'http://localhost:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/'
  });

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('create-game', () => createGame(socket));
    socket.on('join-room', (data) => joinRoom(socket, data, io));
    socket.on('start-game', (pin) => startGame(socket, pin, io));
    socket.on('submit-guess', (data) => handleGuess(socket, data, io));
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
      handleDisconnect(socket, io);
    });
  });

  // Start server
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
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
        room.players = room.players.filter((name) => name !== socket.data.playerName);
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
    if (dev) process.exit(1);
  });
  
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    if (dev) process.exit(1);
  });
  