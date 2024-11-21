const config = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  socketOptions: {
    transports: ['polling', 'websocket'],
    withCredentials: true,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    secure: true,
    rejectUnauthorized: false,
    autoConnect: true,
    upgrade: true
  }
};

export default config; 