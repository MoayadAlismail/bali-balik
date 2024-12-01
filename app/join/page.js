'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function JoinGame() {
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      withCredentials: true,
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      secure: true,
      rejectUnauthorized: false,
      extraHeaders: {
        'Origin': 'https://www.balibalik.com',
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('خطأ في الاتصال بالخادم');
    });

    newSocket.on('join-error', (error) => {
      console.error('Join error:', error);
      setError(error.message);
    });

    newSocket.on('join-success', () => {
      router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}`);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const handleJoin = async () => {
    if (!pin.trim() || !playerName.trim() || !socket) return;
    
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/validate-pin/${pin}`);
      const data = await response.json();
      
      if (!data.valid) {
        setError('رمز غير صالح');
        return;
      }

      socket.emit('join-room', { pin, playerName, role: 'player' });
      
    } catch (err) {
      console.error('Error validating PIN:', err);
      setError('حدث خطأ أثناء محاولة الانضمام');
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
            className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-black bg-white/50 backdrop-blur-sm transition-all mb-4"
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

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: '#FF6B6B' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleJoin}
          disabled={!pin.trim() || !playerName.trim()}
          className={`w-full p-4 bg-[#FF9A8B] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${
            (!pin.trim() || !playerName.trim()) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          يلا نلعب! 🎮
        </motion.button>
      </motion.div>
    </div>
  );
} 