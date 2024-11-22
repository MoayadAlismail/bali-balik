const config = {
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'https://bali-balik-production.up.railway.app'
    : 'http://localhost:3001'
};

export default config; 