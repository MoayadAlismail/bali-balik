'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import config from '@/config';

export default function JoinGame() {
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const newSocket = io(config.socketUrl);
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');

    if (!pin || !playerName) {
      setError('Please enter both name and PIN');
      return;
    }

    if (socket) {
      socket.emit('validate-game', pin, (isValid) => {
        if (isValid) {
          router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}`);
        } else {
          setError('Invalid game PIN. Please check and try again.');
        }
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Join a Game</h1>
      
      <form onSubmit={handleJoin} className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
            {error}
          </div>
        )}
        
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full mb-4 p-3 rounded border text-black"
        />
        
        <input
          type="text"
          placeholder="ادخل كود اللعبة"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full mb-4 p-3 rounded border text-black"
        />
        
        <button
          type="submit"
          className="w-full rounded-full bg-foreground text-background px-6 py-3"
        >
          انضم اللعبة
        </button>
      </form>
    </div>
  );
} 