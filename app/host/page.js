'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socketClient';
import AvatarCustomizer from '@/app/components/AvatarCustomizer';
import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
const buttonSFX = "/assets/buttonClick.mp3";
const errorSFX = "/assets/errorSFX.mp3"
const joinSFX = "/assets/joinSound.mp3"

export default function HostGame() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [socket] = useState(() => getSocket());
  const [gamePin, setGamePin] = useState('');
  const [roundCount, setRoundCount] = useState(5);
  const [roundTime, setRoundTime] = useState(15);
  const [avatar, setAvatar] = useState({ character: '👑', accessory: null, display: '👑' });

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

    console.log('Socket connected, creating game with round count: ', roundCount, '...');
    socket.emit('create-game', { roundCount, roundTime, language });

    socket.on('game-created', (pin) => {
      console.log('Game created with pin:', pin);
      setGamePin(pin);
    });

    return () => {
      console.log("socket.off(game-created) called")
      socket.off('game-created');
    };
  }, [socket, roundCount, roundTime, language]);

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
      return Math.min(Math.max(5, newValue), 120); // Min 10, Max 120 seconds
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FF9A8B] to-[#FF6B6B]">
      <LanguageSwitcher />
      <Link href="/" className="fixed top-4 left-4 z-50 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-2xl">
          ↩️
        </motion.div>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl w-full max-w-md mx-auto"
      >
        <h1 className="text-4xl font-bold text-center mb-8">{t('host.title')}</h1>

        <div className="space-y-6">
          <div className="text-center mb-6">
            <AvatarCustomizer onSelect={setAvatar} />
          </div>

          <div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder={t('host.namePlaceholder')}
              className="w-full p-4 text-lg text-center rounded-xl border-2 border-gray-200 focus:border-[#FF6B6B] focus:outline-none transition-colors"
              maxLength={20}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium mb-2 text-center">
                {t('host.roundsLabel')}
              </label>
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundCount(-1)}
                  className="w-12 h-12 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-2xl"
                >
                  -
                </motion.button>
                <span className="text-3xl font-bold w-16 text-center">{roundCount}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundCount(1)}
                  className="w-12 h-12 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-2xl"
                >
                  +
                </motion.button>
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium mb-2 text-center">
                {t('host.timeLabel')}
              </label>
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundTime(-5)}
                  className="w-12 h-12 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-2xl"
                >
                  -
                </motion.button>
                <span className="text-3xl font-bold w-16 text-center">{roundTime}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRoundTime(5)}
                  className="w-12 h-12 rounded-full bg-[#FF9A8B] text-white flex items-center justify-center text-2xl"
                >
                  +
                </motion.button>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartHosting}
            disabled={!playerName.trim()}
            className={`w-full p-4 bg-[#FF6B6B] text-white text-xl font-semibold rounded-xl hover:bg-[#FF9A8B] transition-colors ${
              !playerName.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {t('host.createButton')} 🎮
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
} 