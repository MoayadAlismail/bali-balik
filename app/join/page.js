'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function JoinGame() {
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize socket connection with new Render URL
    const newSocket = io('https://bali-balik.fly.dev', {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      secure: true,
      rejectUnauthorized: false,
      extraHeaders: {
        'Origin': 'https://www.balibalik.com',
        'Origin': 'https://bali-balik.fly.dev'
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount

  const handleJoin = () => {
    if (pin.trim() && playerName.trim() && socket) {
      // Emit join event before navigating
      socket.emit('join-room', { pin, playerName, role: 'player' });
      router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}`);
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
          ادخل رمز اللعبة
        </motion.h1>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative mb-6"
        >

          <input
          type="text"
          placeholder="ادخل اسمك"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-black bg-white/50 backdrop-blur-sm transition-all"
        />
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="ادخل الرمز هنا..."
            className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-black bg-white/50 backdrop-blur-sm transition-all"
            maxLength={6}
          />
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: '#FF6B6B' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleJoin}
          className="w-full p-4 bg-[#FF9A8B] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          يلا نلعب! 🎮
        </motion.button>
      </motion.div>
    </div>
  );
} 