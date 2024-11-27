const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'https://bali-balik.onrender.com'
    : 'http://localhost:3001',
  wsPath: '/socket.io/'
};

export default config; 