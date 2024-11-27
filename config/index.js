const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'wss://bali-balik.fly.dev'
    : 'ws://localhost:3001',
  wsPath: '/socket.io/'
};

export default config; 