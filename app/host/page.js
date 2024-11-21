'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
const { activeGames, addGame, removeGame, validateGame } = require('../activeGames/activeGames');



export default function HostGame() {
  const [gamePin, setGamePin] = useState('');
  const router = useRouter();

  const generatePin = () => {
    // Generate a random 6-digit pin
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGamePin(pin);
  };

  const startGame = () => {
    if (gamePin) {
      addGame(gamePin);
      console.log(activeGames);
      router.push(`/game/${gamePin}?role=host`);

    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Host a Game</h1>
      <button
        onClick={generatePin}
        className="mb-4 rounded-full bg-foreground text-background px-6 py-3"
      >
        Generate Game PIN
      </button>
      
      {gamePin && (
        <div className="text-center">
          <p className="text-2xl font-mono mb-4">Game PIN: {gamePin}</p>
          <button
            onClick={startGame}
            className="rounded-full border border-black/[.08] px-6 py-3"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
} 