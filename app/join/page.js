'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AvatarCustomizer from '@/app/components/AvatarCustomizer';
import Link from 'next/link';
const buttonSFX = "/assets/buttonClick.mp3";
const errorSFX = "/assets/errorSFX.mp3"
const joinSFX = "/assets/joinSound.mp3"



export default function JoinGame() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState({ character: '', accessory: null, display: '👨' });


  
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
          انضم إلى لعبة
        </motion.h1>

        <motion.div className="space-y-6">
          {/* Add Avatar Customizer */}
          <AvatarCustomizer onSelect={setAvatar} />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="ادخل رمز الغرفة"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-none bg-white/50 backdrop-blur-sm transition-all mb-4"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="ادخل اسمك"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              className="w-full p-4 text-2xl text-center border-3 border-[#FF9A8B] rounded-xl focus:border-[#FF6B6B] outline-none bg-white/50 backdrop-blur-sm transition-all"
            />
            {/* Show selected avatar next to name */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl">
              {avatar.display}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#FF6B6B' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJoin}
            disabled={!pin.trim() || !playerName.trim()}
            className={`w-full p-4 bg-[#FF9A8B] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 ${
              (!pin.trim() || !playerName.trim()) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            يلا نلعب 🎮
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
} 