'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
const buttonSFX = "/assets/buttonClick.mp3";

export default function Home() {
  const router = useRouter()
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
          تفكر باللي أفكر فيه؟ 🧠
        </motion.h1>

        {/* Short paragraph explaining how to play */}
        <motion.h3
        variants={itemVariants}
        className="text-white text-lg mb-12 px-4 leading-relaxed max-w-2xl mx-auto bg-white/20 rounded-lg p-4 shadow-lg"
        >
        اللعبة بسيطة وممتعة! 🎉 كل اللاعبين ياخذون نفس الموضوع، ومهمتهم إنهم يخمنون نفس الكلمة اللي تتعلق بالموضوع. مثلاً: لو كان الموضوع رياضة، اللاعبين يخمنون كرة القدم. كل ما زادت التخمينات المشتركة بين اللاعبين، زادت النقاط اللي يحصلونها. الفكرة إنكم تفكرون زي بعض وتدخلون جو! 😄        
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
            إنشاء لعبة جديدة 🎲
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#45B26B' }}
            whileTap={{ scale: 0.95 }}
            className="w-72 p-5 bg-[#4CAF50] text-white rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleJoinClick}
          >
            انضم للعبة 🎮
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
