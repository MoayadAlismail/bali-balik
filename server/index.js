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
  const topics = {
    ar: [
      'حيوانات', 'طعام', 'رياضة', 'مدن',
      'مهن', 'ألوان', 'أفلام', 'مشاهير'
    ],
    en: [
      'Animals', 'Food', 'Sports', 'Cities',
      'Professions', 'Colors', 'Movies', 'Celebrities'
    ]
  };

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

    socket.on('create-game', ({ roundCount = 5, roundTime = 60, language = 'ar' }) => {
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
        timer: null,
        language: language,
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
      
      // Reset player scores when they rejoin
      const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
      if (existingPlayerIndex === -1) {
        room.players.push({
          name: playerName,
          avatar: avatar || { character: '', display: '👤' },
          score: 0  // Initialize score to 0
        });
      } else {
        // Update existing player's avatar and reset score
        room.players[existingPlayerIndex].avatar = avatar || room.players[existingPlayerIndex].avatar;
        room.players[existingPlayerIndex].score = 0;  // Reset score to 0
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

        // Reset room state for new game
        room.currentRound = 0;  // Start at 0, will be incremented in startNextRound
        room.state = 'playing';
        room.guesses.clear();
        room.submittedGuesses = [];
        
        // Clear any existing timer
        if (room.timer) {
          clearInterval(room.timer);
          room.timer = null;
        }

        // Start the first round using startNextRound
        startNextRound(room);
        
        // Send success callback immediately
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

      console.log(`Received guess from ${playerName} in room ${pin}:`, guess); // Debug log

      // Store the guess
      const newGuess = { 
        playerName, 
        guess: guess.trim().toLowerCase(),
        timestamp: Date.now() 
      };
      room.submittedGuesses.push(newGuess);
      
      console.log(`Current submitted guesses in room ${pin}:`, room.submittedGuesses); // Debug log

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

    console.log('Calculating scores for submitted guesses:', room.submittedGuesses);

    // Group guesses by the actual guess text (case insensitive)
    const guessGroups = new Map();
    room.submittedGuesses.forEach(({ playerName, guess }) => {
      const normalizedGuess = guess.trim().toLowerCase();
      if (!guessGroups.has(normalizedGuess)) {
        guessGroups.set(normalizedGuess, []);
      }
      guessGroups.get(normalizedGuess).push(playerName);
    });

    console.log('Grouped guesses:', Array.from(guessGroups.entries()));

    // Calculate scores for this round
    guessGroups.forEach((players, guess) => {
      // Award points if more than one player made the same guess
      if (players.length > 1) {
        const points = players.length * 100;
        players.forEach(playerName => {
          const player = room.players.find(p => p.name === playerName);
          if (player) {
            // Initialize score if undefined
            if (typeof player.score !== 'number') {
              player.score = 0;
            }
            player.score += points;
            console.log(`Awarded ${points} points to ${playerName}. New score: ${player.score}`);
          }
        });
      }
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
        points: players.length > 1 ? players.length * 100 : 0
      })),
      scores: room.players.map(player => ({
        player: player.name,
        avatar: player.avatar,
        score: player.score || 0
      })).sort((a, b) => b.score - a.score)
    };

    console.log('Emitting round results:', roundResults);
    io.to(room.pin).emit('round-completed', roundResults);

    // Clear submitted guesses for next round
    room.submittedGuesses = [];
    
    if (room.currentRound >= room.maxRounds) {
      endGame(room);
    } else {
      setTimeout(() => {
        if (room.state !== 'ended') {
          startNextRound(room);
        }
      }, 5000);
    }
  };

  // Modify the startNextRound function to be more strict about round transitions
  const startNextRound = (room) => {
    console.log(`Starting next round. Current round: ${room.currentRound}, Max rounds: ${room.maxRounds}`);
    
    // First check if we should end the game
    if (room.currentRound >= room.maxRounds) {
      console.log('Max rounds reached, ending game');
      endGame(room);
      return;
    }

    // Make sure any existing timer is cleared
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    // Increment round counter
    room.currentRound++;
    console.log(`Round ${room.currentRound} of ${room.maxRounds} starting`);

    // Select topic based on room's language preference
    const languageTopics = topics[room.language] || topics.ar; // fallback to Arabic if language not found
    room.topic = languageTopics[Math.floor(Math.random() * languageTopics.length)];

    // Reset round state
    room.submittedGuesses = [];
    room.state = 'playing';

    // Start new timer
    let timeLeft = room.roundTime;
    room.timer = setInterval(() => {
      if (room.state !== 'playing') {
        clearInterval(room.timer);
        room.timer = null;
        return;
      }

      timeLeft--;
      io.to(room.pin).emit('timer-update', timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(room.timer);
        room.timer = null;
        calculateAndEmitScores(room);
      }
    }, 1000);

    // Emit new round event
    io.to(room.pin).emit('new-round', {
      topic: room.topic,
      roundNumber: room.currentRound,
      maxRounds: room.maxRounds,
      timeLeft: room.roundTime
    });
  };

  // Add a helper function to handle game ending
  const endGame = (room) => {
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

    room.state = 'ended';
    room.submittedGuesses = [];
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
    // console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log('==================================');
  });
}); 