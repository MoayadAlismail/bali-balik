'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function HostGame() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [gamePin, setGamePin] = useState('');

  useEffect(() => {
    const newSocket = io('https://www.balibalik.com', {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Request a new game PIN from the server
      newSocket.emit('create-game');
    });

    newSocket.on('game-created', (pin) => {
      console.log('Game created with PIN:', pin);
      setGamePin(pin);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const handleStartHosting = () => {
    if (playerName.trim() && gamePin) {
      router.push(`/game/${gamePin}?role=host&name=${encodeURIComponent(playerName)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FF9A8B] to-[#FF6B6B] p-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <motion.h1 
          className="text-4xl font-bold text-[#FF6B6B] mb-8 text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          إنشاء لعبة جديدة
        </motion.h1>

        <motion.div className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="ادخل اسمك"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-none bg-white/50 backdrop-blur-sm transition-all mb-4"
            />
          </div>

          {gamePin && (
            <div className="text-center mb-4">
              <p className="text-lg text-gray-600 mb-2">رمز اللعبة:</p>
              <p className="text-4xl font-bold text-[#FF6B6B]">{gamePin}</p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#FF6B6B' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartHosting}
            disabled={!playerName.trim() || !gamePin}
            className={`w-full p-4 bg-[#FF9A8B] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${
              (!playerName.trim() || !gamePin) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            ابدأ اللعبة 🎮
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
} 