'use client';
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import config from '@/config';

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
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const newSocket = io('https://bali-balik-production.up.railway.app', {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      query: {
        pin: pin,
        playerName: playerName,
        role: role
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join-room', { pin, playerName, role });
    });

    setSocket(newSocket);

    newSocket.on('player-joined', (playersList) => {
      console.log('Player joined:', playersList);
      setPlayers(playersList);
    });

    newSocket.on('game-started', ({ topic, timeLeft }) => {
      console.log('Game started with topic:', topic);
      setGameState('playing');
      setCurrentTopic(topic);
      setTimeLeft(timeLeft);
      setHasSubmitted(false);
      setGuess(''); // Reset guess for new round
    });

    newSocket.on('timer-update', (time) => {
      console.log('Timer update:', time);
      setTimeLeft(time);
      if (time <= 0) {
        setGameState('results');
      }
    });

    newSocket.on('game-results', (matchResults) => {
      console.log('Game results:', matchResults);
      setGameState('results');
      setResults(matchResults);
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [pin, playerName, role]);

  const [submittedGuesses, setSubmittedGuesses] = useState([]);

  const handleSubmitGuess = () => {
    if (socket && guess.trim()) {
      // Emit the guess to the server
      socket.emit('submit-guess', { pin, playerName, guess });
      
      // Update local state with the new guess
      setSubmittedGuesses(prevGuesses => [
        ...prevGuesses,
        { playerName, guess }
      ]);
  
      // Clear the guess input field after submission
      setGuess('');
    }
  };
  

  const startGame = () => {
    if (socket && role === 'host') {
      console.log('Emitting start-game event for pin:', pin);
      socket.emit('start-game', pin);
    }
  };

  // Handle enter key press for submitting guess
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !hasSubmitted) {
      handleSubmitGuess();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {gameState === 'waiting' && (
        <div className="text-center">
          <h2 className="text-2xl mb-4">كود الغرفة: {pin}</h2>
          <div className="mb-4">
            <h3 className="text-xl mb-2">اللاعبين:</h3>
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li key={index} className="text-lg">{player}</li>
              ))}
            </ul>
          </div>
          {role === 'host' && players.length > 0 && (
            <button
              onClick={startGame}
              className="rounded-full bg-foreground text-background px-6 py-3 hover:bg-opacity-90 transition-colors"
            >
              ابدأ
            </button>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold mb-2">{timeLeft}</div>
            <div className="text-sm text-gray-600">ثواني باقية</div>
          </div>
          
          <h2 className="text-2xl mb-4">الموضوع: {currentTopic}</h2>
          
          {!hasSubmitted ? (
            <div>
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyPress={handleKeyPress}
                className="mb-4 p-3 rounded border"
                placeholder="Enter your guess"
                autoFocus
              />
              <button
                onClick={handleSubmitGuess}
                className="rounded-full bg-foreground text-background px-6 py-3"
              >
                تقديم التخمين
              </button>
            </div>
          ) : (
            <div className="text-green-600 text-lg">
               انتظار اللاعبين الآخرين..
            </div>
          )}
        </div>
      )}


      {gameState === 'results' && (
        <div className="text-center">
          <h2 className="text-2xl mb-4">النتائج</h2>
             <h2 className="text-2xl mb-4">التخمينات المقدمة</h2>
              <ul>
                {submittedGuesses.map((entry, index) => (
                  <li key={index}>
                    {/* formatting issue, names dont mix well with arabic (right to left) text */}
                    <span className="font-bold">{entry.playerName}</span> guessed: {entry.guess}
                  </li>
                ))}
              </ul>
          {/* {results && Object.entries(results).map(([word, count]) => (
            <div key={word} className="mb-2">
              <span className="font-bold">{word}</span>: {count} matches
            </div>
          ))} */}
        </div>
      )}
    </div>
  );
} 