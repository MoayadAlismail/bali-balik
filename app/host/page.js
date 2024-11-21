'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import config from '@/config';

export default function HostGame() {
  const [gamePin, setGamePin] = useState('');
  const [socket, setSocket] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const newSocket = io(config.socketUrl);
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGamePin(pin);
    if (socket) {
      socket.emit('create-game', pin);
    }
  };

  const startGame = () => {
    if (gamePin) {
      router.push(`/game/${gamePin}?role=host`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Host a Game</h1>
      <button
        onClick={generatePin}
        className="mb-4 rounded-full bg-foreground text-background px-6 py-3"
      >
        Generate Game PIN
      </button>
      
      {gamePin && (
        <div className="text-center">
          <p className="text-2xl font-mono mb-4">Game PIN: {gamePin}</p>
          <button
            onClick={startGame}
            className="rounded-full border border-black/[.08] px-6 py-3"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
} 