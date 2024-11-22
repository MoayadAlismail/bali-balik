const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'wss://bali-balik-production.up.railway.app'
    : 'ws://localhost:3001',
  wsPath: '/socket.io/'
};

export default config; 