'use client';
import { motion } from 'framer-motion';

export default function JoinGame() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-8 rounded-xl shadow-xl"
      >
        <h1 className="text-3xl font-bold text-purple-600 mb-6">ادخل رمز اللعبة</h1>
        <input
          type="text"
          placeholder="رمز اللعبة..."
          className="w-full p-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full mt-4 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          انضم للعبة
        </motion.button>
      </motion.div>
    </div>
  );
} 