'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
const { activeGames, addGame, removeGame, validateGame } = require('../activeGames/activeGames');

export default function JoinGame() {
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const router = useRouter();

  const handleJoin = (e) => {
    e.preventDefault();
    if (pin && playerName && validateGame(pin)) {
      router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}`);
    }
    else {
      console.log("active games:",activeGames);
      console.log("ERROR: Please check the name and the validity of your PIN");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Join a Game</h1>
      
      <form onSubmit={handleJoin} className="w-full max-w-sm">
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full mb-4 p-3 rounded border text-black"
        />
        
        <input
          type="text"
          placeholder="Enter game PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full mb-4 p-3 rounded border text-black"
        />
        
        <button
          type="submit"
          className="w-full rounded-full bg-foreground text-background px-6 py-3 text-black"
        >
          Join Game
        </button>
      </form>
    </div>
  );
} 