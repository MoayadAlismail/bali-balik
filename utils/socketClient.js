import io from 'socket.io-client';
import { create } from 'zustand';

const useSocketStore = create((set) => ({
  socket: null,
  connected: false,
  connecting: false,
  error: null,
  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setError: (error) => set({ error }),
}));

export const initializeSocket = () => {
  const store = useSocketStore.getState();
  if (store.socket) return store.socket;

  const socketUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  console.log('Initializing socket connection to:', socketUrl);

  store.setConnecting(true);
  
  const socket = io(socketUrl, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    store.setConnected(true);
    store.setConnecting(false);
    store.setError(null);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    store.setConnected(false);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    store.setError(error.message);
    store.setConnecting(false);
  });

  store.setSocket(socket);
  return socket;
};

export const getSocket = () => {
  const store = useSocketStore.getState();
  return store.socket || initializeSocket();
};

export const useSocketStatus = () => {
  return useSocketStore((state) => ({
    connected: state.connected,
    connecting: state.connecting,
    error: state.error
  }));
}; 