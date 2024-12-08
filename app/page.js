'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
const buttonSFX = "/assets/buttonClick.mp3";

export default function Home() {
  const router = useRouter()
  const { t } = useTranslation()
   //defining the sound variables
   const playClickSound = () => {
    new Audio(buttonSFX).play();
    return;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  const handleHostClick = () => {
    router.push('/host')
    playClickSound();
  }

  const handleJoinClick = () => {
    router.push('/join')
    playClickSound();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FF9A8B] to-[#FF6B6B]">
      <LanguageSwitcher />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-6xl font-bold text-white mb-12 drop-shadow-lg"
        >
          {t('title')}
        </motion.h1>

        <motion.h3
          variants={itemVariants}
          className="text-white text-lg mb-12 px-4 leading-relaxed max-w-2xl mx-auto bg-white/20 rounded-lg p-4 shadow-lg"
        >
          {t('gameExplanation')}
        </motion.h3>

        <motion.div 
          variants={itemVariants}
          className="space-y-6"
        >
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#4A90E2' }}
            whileTap={{ scale: 0.95 }}
            className="w-72 p-5 bg-[#5C9CE5] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleHostClick}
          >
            {t('createGame')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#45B26B' }}
            whileTap={{ scale: 0.95 }}
            className="w-72 p-5 bg-[#4CAF50] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleJoinClick}
          >
            {t('joinGame')}
          </motion.button>
          <div className="fixed bottom-5 right-5 bg-black bg-opacity-60 text-white p-2 rounded-lg text-sm font-bold shadow-md">
            {t('earlyAccess')}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
