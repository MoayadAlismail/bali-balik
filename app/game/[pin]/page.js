'use client';
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';

export default function GameRoom({ params }) {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const playerName = searchParams.get('name');
  const pin = use(params).pin;
  
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [currentTopic, setCurrentTopic] = useState('');
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('join-room', { pin, playerName, role });

    newSocket.on('player-joined', (playersList) => {
      console.log('Player joined:', playersList);
      setPlayers(playersList);
    });

    newSocket.on('game-started', (topic) => {
      console.log('Game started with topic:', topic);
      setGameState('playing');
      setCurrentTopic(topic);
    });

    newSocket.on('game-results', (matchResults) => {
      console.log('Game results:', matchResults);
      setGameState('results');
      setResults(matchResults);
    });

    return () => newSocket.disconnect();
  }, [pin, playerName, role]);

  const handleSubmitGuess = () => {
    if (socket && guess.trim()) {
      socket.emit('submit-guess', { pin, playerName, guess });
    }
  };

  const startGame = () => {
    if (socket && role === 'host') {
      console.log('Emitting start-game event for pin:', pin);
      socket.emit('start-game', pin);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {gameState === 'waiting' && (
        <div className="text-center">
          <h2 className="text-2xl mb-4">Game PIN: {pin}</h2>
          <div className="mb-4">
            <h3 className="text-xl mb-2">Players:</h3>
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li key={index} className="text-lg">{player}</li>
              ))}
            </ul>
          </div>
          {role === 'host' && (
            <button
              onClick={startGame}
              className="rounded-full bg-foreground text-background px-6 py-3 hover:bg-opacity-90 transition-colors"
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="text-center">
          <h2 className="text-2xl mb-4">Topic: {currentTopic}</h2>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="mb-4 p-3 rounded border"
          />
          <button
            onClick={handleSubmitGuess}
            className="rounded-full bg-foreground text-background px-6 py-3"
          >
            Submit Guess
          </button>
        </div>
      )}

      {gameState === 'results' && (
        <div>
          <h2 className="text-2xl mb-4">Results</h2>
          {results && Object.entries(results).map(([word, count]) => (
            <div key={word} className="mb-2">
              <span className="font-bold">{word}</span>: {count} matches
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 