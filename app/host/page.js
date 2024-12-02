'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socket';
import AvatarCustomizer from '@/app/components/AvatarCustomizer';
import Link from 'next/link';
import buttonSFX from "./assets/buttonClick.wav"
import errorSFX from "./assets/errorSFX.mp3"
import joinSFX from "./assets/joinSound.mp3"

export default function HostGame() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [socket] = useState(() => getSocket());
  const [gamePin, setGamePin] = useState('');
  const [roundCount, setRoundCount] = useState(5);
  const [roundTime, setRoundTime] = useState(10);
  const [avatar, setAvatar] = useState({ character: '👨', accessory: null, display: '👨' });

  const playClickSound = () => {
    new Audio(buttonSFX).play();
    return;
  }
  const playErrorSound = () => {
    new Audio(errorSFX).play();
    return;
  }
  const playJoinSound = () => {
    new Audio(joinSFX).play();
    return;
  }

  useEffect(() => {
    if (!socket) {
      console.log("!socket called")
      return;
    }

    console.log('Socket connected, creating game...');
    socket.emit('create-game', { roundCount, roundTime });

    
    socket.on('game-created', (pin) => {
      console.log('Game created with pin:', pin);
      setGamePin(pin);
    });

    return () => {
      console.log("socket.off(game-created) called")
      socket.off('game-created');
    };
  }, [socket, roundCount, roundTime]);

  const handleStartHosting = () => {
    if (playerName.trim() && gamePin) {
      playJoinSound();
      router.push(`/game/${gamePin}?role=host&name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(JSON.stringify(avatar))}`);
    }
  };

  const adjustRoundCount = (increment) => {
    setRoundCount(prev => {
      playClickSound();
      const newValue = prev + increment;
      return Math.min(Math.max(1, newValue), 10); // Min 1, Max 10 rounds
    });
  };

  const adjustRoundTime = (increment) => {
    setRoundTime(prev => {
      playClickSound();
      const newValue = prev + increment;
      return Math.min(Math.max(4, newValue), 120); // Min 10, Max 120 seconds
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FF9A8B] to-[#FF6B6B] p-4">
      <Link 
        href="/"
        className="fixed top-4 left-4 z-50 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors md:absolute"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-2xl"
          onClick={playClickSound}
        >
          ↩️
        </motion.div>
      </Link>

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
          {/* Add Avatar Customizer */}
          <AvatarCustomizer onSelect={setAvatar} />

          {/* Game Settings */}
          <div className="space-y-4 mb-6">
            {/* Round Count Setting */}
            <div className="flex flex-col items-center">
              <label className="text-lg mb-2">عدد الجولات</label>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundCount(-1)}
                  className="w-10 h-10 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-xl"
                >
                  -
                </motion.button>
                <span className="text-2xl font-bold w-16 text-center">{roundCount}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundCount(1)}
                  className="w-10 h-10 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-xl"
                >
                  +
                </motion.button>
              </div>
            </div>

            {/* Round Time Setting */}
            <div className="flex flex-col items-center">
              <label className="text-lg mb-2">الوقت لكل جولة (ثواني)</label>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundTime(-3)}
                  className="w-10 h-10 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-xl"
                >
                  -
                </motion.button>
                <span className="text-2xl font-bold w-16 text-center">{roundTime}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundTime(3)}
                  className="w-10 h-10 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-xl"
                >
                  +
                </motion.button>
              </div>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="ادخل اسمك"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-none bg-white/50 backdrop-blur-sm transition-all mb-4"
            />
            {/* Show selected avatar next to name */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl">
              {avatar.display}
            </div>
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
            disabled={!playerName.trim()}
            className={`w-full p-4 bg-[#FF9A8B] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${
              (!playerName.trim()) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            ابدأ اللعبة 🎮
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
} 