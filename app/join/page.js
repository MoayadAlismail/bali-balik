'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import AvatarCustomizer from '@/app/components/AvatarCustomizer';
import Link from 'next/link';
const buttonSFX = "/assets/buttonClick.mp3";
const errorSFX = "/assets/errorSFX.mp3"
const joinSFX = "/assets/joinSound.mp3"



export default function Join() {
  const { t } = useTranslation();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState({ character: '👑', accessory: null, display: '👑' });


  
   //defining the sound variables
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

  const validatePin = async (pin) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/validate-pin/${pin}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Server response not OK:', response.status, response.statusText);
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('PIN validation response:', data);
      return data.valid;
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };


  const handleJoin = async () => {
    if (!pin.trim() || !playerName.trim()) {
      playErrorSound();
      setError('Please enter both PIN and name');
      return;
    }

    const isValid = await validatePin(pin);
    if (isValid) {
      playJoinSound();
      router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}&avatar=${encodeURIComponent(JSON.stringify(avatar))}`);
    } else {
      playErrorSound();
      setError('Invalid game PIN');
    }
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
        <h1 className="text-4xl font-bold text-center mb-8">{t('join.title')}</h1>

        <div className="space-y-6">
          <div className="text-center mb-6">
            <AvatarCustomizer onSelect={setAvatar} />
          </div>

          <div>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder={t('join.pinPlaceholder')}
              className="w-full p-4 text-lg text-center rounded-xl border-2 border-gray-200 focus:border-[#FF6B6B] focus:outline-none transition-colors"
              maxLength={4}
            />
          </div>

          <div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              placeholder={t('join.namePlaceholder')}
              className="w-full p-4 text-lg text-center rounded-xl border-2 border-gray-200 focus:border-[#FF6B6B] focus:outline-none transition-colors"
              maxLength={20}
            />
          </div>

          {error && (
            <p className="text-red-500 text-center">
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            className="w-full p-4 bg-[#FF6B6B] text-white text-xl font-semibold rounded-xl hover:bg-[#FF9A8B] transition-colors"
          >
            {t('join.joinButton')} 🎮
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
} 