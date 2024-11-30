// Set environment variables if not already set
process.env.PORT = process.env.PORT || 10000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Start the server
require('./server/index.js'); 