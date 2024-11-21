const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'https://www.balibalik.com',
  'https://balibalik.com',
  'http://localhost:3000'
];

// Express CORS
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

const httpServer = createServer(app);

// Socket.IO setup with updated configuration
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  maxHttpBufferSize: 1e8,
  path: '/socket.io/'
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Rest of your server code...

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 