const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'http://balibalik.up.railway.app'
    : 'http://localhost:3000',
  wsPath: '/socket.io/'
};

export default config; 