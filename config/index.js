const config = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  socketOptions: {
    transports: ['websocket', 'polling'],
    withCredentials: true
  }
};

export default config; 