'use client'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.h1 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-5xl font-bold text-purple-600 mb-8"
      >
        يلا نلعب!
      </motion.h1>
      
      <div className="space-y-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-64 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
          onClick={() => router.push('/host')}
        >
          إنشاء لعبة جديدة
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-64 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors"
          onClick={() => router.push('/join')}
        >
          انضم للعبة
        </motion.button>
      </div>
    </div>
  )
}
