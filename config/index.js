const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'https://balibalik.koyeb.app'
    : 'http://localhost:3000',
  wsPath: '/socket.io/'
};

export default config; 