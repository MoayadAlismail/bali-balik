const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  // Get allowed origins from environment variable
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['https://www.balibalik.com,https://balibalik.com,http://localhost:3000,https://balibalik.up.railway.app'];

  // CORS configuration for Express
  server.use(cors({
    origin: process.env.NODE_ENV === 'development' 
      ? 'https://www.balibalik.com,https://balibalik.com,http://localhost:3000,https://balibalik.up.railway.app'
      : allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
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
      origin: process.env.NODE_ENV === 'development' 
        ? 'https://www.balibalik.com,https://balibalik.com,http://localhost:3000,https://balibalik.up.railway.app'
        : allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    connectTimeout: 45000,  // Increase connection timeout
    pingTimeout: 30000,     // How long to wait for ping response
    pingInterval: 3000,     // How often to ping
    transports: ['websocket', 'polling'],  // Enable both transports
    allowUpgrades: true,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io/'
  });

  // Add this near the top of your file after creating the rooms Map
  const logRooms = () => {
    console.log('Current rooms:', {
      count: rooms.size,
      pins: Array.from(rooms.keys()),
      details: Array.from(rooms.entries()).map(([pin, room]) => ({
        pin,
        players: room.players,
        host: room.host,
        state: room.state
      }))
    });
  };

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log(`New socket connection: ${socket.id}`);
    console.log(`Transport: ${socket.conn.transport.name}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`Socket ${socket.id} disconnected:`, reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('create-game', ({ roundCount = 5, roundTime = 60 }) => {
      console.log('Create game request received');
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      socket.join(pin);
      
      rooms.set(pin, {
        pin,
        players: [],
        host: socket.id,
        state: 'waiting',
        topic: null,
        guesses: new Map(),
        hostName: null,
        submittedGuesses: [],
        scores: new Map(),
        currentRound: 0,
        maxRounds: roundCount,
        roundTime: roundTime,
        timer: null
      });
      
      console.log(`Creating game with pin: ${pin}, rounds: ${roundCount}, time per round: ${roundTime}s`);
      logRooms();
      socket.emit('game-created', pin);
      console.log(`Game created with pin: ${pin}`);
    });

    socket.on('join-room', ({ pin, playerName, role, avatar }) => {
      const room = rooms.get(pin);
      if (!room) {
        console.log(`Rejected join attempt for invalid PIN: ${pin}`);
        socket.emit('join-error', { message: 'غرفة غير موجودة' });
        return;
      }

      socket.join(pin);
      
      if (role === 'host') {
        room.host = socket.id;
        room.hostName = playerName;
        console.log(`Host ${playerName} joined/rejoined room ${pin}`);
      }
      
      // Update or add player with avatar
      const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
      if (existingPlayerIndex === -1) {
        room.players.push({
          name: playerName,
          avatar: avatar || { character: '', display: '👤' },
          score: 0
        });
      } else {
        // Update existing player's avatar if they rejoin
        room.players[existingPlayerIndex].avatar = avatar || room.players[existingPlayerIndex].avatar;
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

    socket.on('start-game', (pin, callback) => {
      console.log(`Start game request received for pin: ${pin}`);
      
      try {
        const room = rooms.get(pin);
        if (!room) {
          console.log(`Room ${pin} not found`);
          callback?.({ success: false, error: 'Room not found' });
          return;
        }

        if (room.host !== socket.id) {
          console.log(`Unauthorized start attempt from ${socket.id}`);
          callback?.({ success: false, error: 'Not authorized to start game' });
          return;
        }

        const topic = topics[Math.floor(Math.random() * topics.length)];
        room.topic = topic;
        room.state = 'playing';
        room.guesses.clear();
        room.currentRound = 0;
        
        // Clear any existing timer
        if (room.timer) {
          clearInterval(room.timer);
          room.timer = null;
        }

        // Start new timer for first round
        let timeLeft = room.roundTime;
        room.timer = setInterval(() => {
          timeLeft--;
          
          if (timeLeft <= 0) {
            clearInterval(room.timer);
            room.timer = null;
            calculateAndEmitScores(room);
          } else {
            io.to(room.pin).emit('timer-update', timeLeft);
          }
        }, 1000);

        io.to(room.pin).emit('game-started', { 
          topic,
          timeLeft: room.roundTime,
          players: room.players
        });
        
        callback?.({ success: true });
        
      } catch (error) {
        console.error('Error starting game:', error);
        callback?.({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', () => {
      for (const [pin, room] of rooms.entries()) {
        if (room.host === socket.id) {
          if (room.timer) {
            clearInterval(room.timer);
            room.timer = null;
          }
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

    socket.on('submit-guess', ({ pin, playerName, guess }) => {
      const room = rooms.get(pin);
      if (!room) return;

      // Store the guess
      const newGuess = { playerName, guess: guess.trim().toLowerCase(), timestamp: Date.now() };
      room.submittedGuesses.push(newGuess);
      
      // Check if all players have submitted
      const allPlayersSubmitted = room.submittedGuesses.length === room.players.length;
      
      // Emit the updated guesses to all players
      io.to(pin).emit('guesses-updated', {
        guesses: room.submittedGuesses,
        totalPlayers: room.players.length,
        allSubmitted: allPlayersSubmitted
      });

      // If all players have submitted, calculate scores and start next round
      if (allPlayersSubmitted) {
        calculateAndEmitScores(room);
      }
    });
  });

  // Health check endpoint
  server.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      rooms: Array.from(rooms.keys())
    });
  });

  // Add this before your routes
  server.options('*', cors()); // Enable preflight for all routes

  // Add specific CORS headers to the validate-pin endpoint
  server.get('/validate-pin/:pin', (req, res) => {
    // Add CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'development' 
      ? 'https://www.balibalik.com,https://balibalik.com,http://localhost:3000,https://balibalik.up.railway.app' 
      : allowedOrigins[0]
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const pin = req.params.pin;
    const roomExists = rooms.has(pin);
    console.log(`PIN validation request for ${pin}: ${roomExists ? 'valid' : 'invalid'}`);
    res.json({ valid: roomExists });
  });

  // Add function to calculate scores
  const calculateAndEmitScores = (room) => {
    if (room.state === 'ended') return;

    // Group guesses by the actual guess text
    const guessGroups = new Map();
    room.submittedGuesses.forEach(({ playerName, guess }) => {
      if (!guessGroups.has(guess)) {
        guessGroups.set(guess, []);
      }
      guessGroups.get(guess).push(playerName);
    });

    // Calculate scores for this round
    guessGroups.forEach((players, guess) => {
      const points = players.length * 100;
      players.forEach(playerName => {
        const player = room.players.find(p => p.name === playerName);
        if (player) {
          player.score = (player.score || 0) + points;
        }
      });
    });

    // Prepare round results
    const roundResults = {
      guessGroups: Array.from(guessGroups).map(([guess, players]) => ({
        guess,
        players: players.map(name => {
          const player = room.players.find(p => p.name === name);
          return {
            name,
            avatar: player?.avatar,
            score: player?.score || 0
          };
        }),
        points: players.length * 100
      })),
      scores: room.players.map(player => ({
        player: player.name,
        avatar: player.avatar,
        score: player.score || 0
      }))
    };

    // Emit round results
    io.to(room.pin).emit('round-completed', roundResults);

    // Clear submitted guesses for next round
    room.submittedGuesses = [];
    
    // Start next round after a delay only if game hasn't ended
    if (room.state !== 'ended') {
      setTimeout(() => {
        startNextRound(room);
      }, 5000);
    }
  };

  // Add function to start next round
  const startNextRound = (room) => {
    room.currentRound++;
    
    if (room.currentRound >= room.maxRounds) {
      // Game is over
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
      }
      
      const finalScores = room.players.map(player => ({
        player: player.name,
        avatar: player.avatar,
        score: player.score || 0
      })).sort((a, b) => b.score - a.score);

      io.to(room.pin).emit('game-ended', { 
        reason: 'completed',
        finalScores 
      });

      // Clean up the room state
      room.state = 'ended';
      room.submittedGuesses = [];
      room.currentRound = 0;
      
      // Stop any further round processing
      return;
    }

    // Only continue if the game hasn't ended
    if (room.state !== 'ended') {
      // Clear any existing timer
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
      }

      // Start new round
      const topic = topics[Math.floor(Math.random() * topics.length)];
      room.topic = topic;
      room.submittedGuesses = [];

      // Start new timer for this round
      let timeLeft = room.roundTime;
      room.timer = setInterval(() => {
        if (room.state === 'ended') {
          clearInterval(room.timer);
          room.timer = null;
          return;
        }

        timeLeft--;
        
        if (timeLeft <= 0) {
          clearInterval(room.timer);
          room.timer = null;
          calculateAndEmitScores(room);
        } else {
          io.to(room.pin).emit('timer-update', timeLeft);
        }
      }, 1000);

      io.to(room.pin).emit('new-round', {
        topic,
        roundNumber: room.currentRound + 1,
        maxRounds: room.maxRounds,
        timeLeft: room.roundTime
      });
    }
  };

  // Add security headers middleware
  server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Handle Next.js requests
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start server
  const port = process.env.PORT || 3000;

  // Listen on `port` and 0.0.0.0
  httpServer.listen(port, "0.0.0.0", function () {
    console.log('==================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log('==================================');
  });
}); 