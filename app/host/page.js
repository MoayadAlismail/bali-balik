'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import config from '@/config';

export default function HostGame() {
  const [gamePin, setGamePin] = useState('');
  const [socket, setSocket] = useState(null);
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');



  useEffect(() => {
    const newSocket = io(config.socketUrl);

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGamePin(pin);
    if (socket) {
      socket.emit('create-game', pin);
    }
  };

  const handleJoin = (e) => {
    console.log("handlejoincalled");
    e.preventDefault();
    if (socket) {
      socket.emit('validate-game', pin, (isValid) => {
        if (isValid) {
          router.push(`/game/${pin}?role=player&name=${encodeURIComponent(playerName)}`);
        }
      });
    }
  };

  const startGame = (e) => {
    handleJoin(e);
    if (gamePin) {
      router.push(`/game/${gamePin}?role=host`);
    }
  };

  // setPin({gamePin});

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">إنشاء غرفة لعب</h1>
      
      {/* We gotta remove the submit from this form, make the name submit when ابدا اللعبة is pressed instead.
      <form onSubmit={handleJoin} className="w-full max-w-sm">
   
        
        

        <button
          type="submit"
          className="w-full rounded-full bg-foreground text-background px-6 py-3"
        >
        </button>
      </form> */}
      


      <button
        onClick={generatePin}
        className="mb-4 rounded-full bg-foreground text-background px-6 py-3"
      >
        إنشاء كود للعب
      </button>
      
      {gamePin && (
        
        <div className="text-center">
          <input
          type="text"
          placeholder="ادخل اسمك"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full mb-4 p-3 rounded border text-black"
        />
          <p className="text-2xl font-mono mb-4">كود الغرفة: {gamePin}</p>
          <button
            onClick={startGame}
            className="rounded-full border border-black/[.08] px-6 py-3"
          >
            ابدأ الغرفة
          </button>
        </div>
      )}
    </div>
  );
} 