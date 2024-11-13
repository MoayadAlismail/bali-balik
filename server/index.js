const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ pin, playerName, role }) => {
    console.log('Join room:', { pin, playerName, role });
    socket.join(pin);
    
    if (!rooms.has(pin)) {
      rooms.set(pin, {
        players: [],
        guesses: new Map(),
        host: role === 'host' ? socket.id : null
      });
    }
    
    const room = rooms.get(pin);
    if (playerName) {
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
      room.guesses.clear(); // Clear any previous guesses
      room.currentTopic = randomTopic;
      io.to(pin).emit('game-started', randomTopic);
    } else {
      console.log('Invalid start game request:', { pin, socketId: socket.id, host: room?.host });
    }
  });

  socket.on('submit-guess', ({ pin, playerName, guess }) => {
    console.log('Guess submitted:', { pin, playerName, guess });
    const room = rooms.get(pin);
    if (room) {
      room.guesses.set(playerName, guess);
      
      if (room.guesses.size === room.players.length) {
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
        rooms.delete(pin);
      }
    }
  });
});

function calculateMatches(guesses) {
  const guessesList = Array.from(guesses.values());
  const matches = {};
  
  guessesList.forEach((guess) => {
    const count = guessesList.filter(g => g.toLowerCase() === guess.toLowerCase()).length;
    if (count > 1) {
      matches[guess] = count;
    }
  });
  
  return matches;
}

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 