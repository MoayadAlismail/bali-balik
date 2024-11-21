const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}



app.configure(function() {
  app.use(allowCrossDomain);
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://balibalik.com",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const topics = [
  "Things you find in a kitchen",
  "Popular movies",
  "Sports",
  "Animals",
  "Foods",
  // Add more topics
];

const ROUND_TIME = 10; // 10 seconds per round

const activeGames = new Set();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-game', (pin) => {
    console.log('Creating game:', pin);
    activeGames.add(pin);
    socket.emit('game-created', pin);
  });

  socket.on('validate-game', (pin, callback) => {
    const isValid = activeGames.has(pin);
    console.log('Validating game:', pin, isValid);
    callback(isValid);
  });

  socket.on('join-room', ({ pin, playerName, role }) => {
    console.log('Join room:', { pin, playerName, role });
    socket.join(pin);
    
    if (!rooms.has(pin)) {
      rooms.set(pin, {
        players: [],
        guesses: new Map(),
        host: role === 'host' ? socket.id : null,
        timer: null
      });
    }
    
    const room = rooms.get(pin);
    if (playerName && !room.players.includes(playerName)) {
      room.players.push(playerName);
    }
    if (role === 'host') {
      room.host = socket.id;
    }
    
    io.to(pin).emit('player-joined', room.players);
  });

  socket.on('start-game', (pin) => {
    console.log('Start game request received for pin:', pin);
    const room = rooms.get(pin);
    
    if (room && socket.id === room.host) {
      console.log('Starting game for pin:', pin);
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      room.guesses.clear();
      room.currentTopic = randomTopic;
      
      // Clear any existing timer
      if (room.timer) {
        clearInterval(room.timer);
      }
      
      // Start the timer
      let timeLeft = ROUND_TIME;
      io.to(pin).emit('game-started', { topic: randomTopic, timeLeft });
      
      room.timer = setInterval(() => {
        timeLeft--;
        io.to(pin).emit('timer-update', timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(room.timer);
          const matches = calculateMatches(room.guesses);
          io.to(pin).emit('game-results', matches);
        }
      }, 1000);
    } else {
      console.log('Invalid start game request:', { pin, socketId: socket.id, host: room?.host });
    }
  });

  socket.on('submit-guess', ({ pin, playerName, guess }) => {
    console.log('Guess submitted:', { pin, playerName, guess });
    const room = rooms.get(pin);
    if (room) {
      room.guesses.set(playerName, guess.toLowerCase().trim());
      
      // If all players have submitted their guesses, end the round early
      if (room.guesses.size === room.players.length) {
        clearInterval(room.timer);
        const matches = calculateMatches(room.guesses);
        io.to(pin).emit('game-results', matches);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up rooms where this socket was the host
    for (const [pin, room] of rooms.entries()) {
      if (room.host === socket.id) {
        if (room.timer) {
          clearInterval(room.timer);
        }
        rooms.delete(pin);
        activeGames.delete(pin);
      }
    }
  });
});

function calculateMatches(guesses) {
  const guessesList = Array.from(guesses.values());
  const matches = {};
  
  guessesList.forEach((guess) => {
    const count = guessesList.filter(g => g === guess).length;
    if (count > 1) {
      matches[guess] = count;
    }
  });
  
  return matches;
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 