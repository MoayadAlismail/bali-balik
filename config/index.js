const config = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  socketOptions: {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    forceNew: true,
    reconnection: true,
    timeout: 10000,
    secure: true,
    rejectUnauthorized: false
  }
};

export default config; 