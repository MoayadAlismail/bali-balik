'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';

export default function GameRoom({ params }) {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const playerName = searchParams.get('name');
  const pin = params.pin;
  
  // Initialize socket state
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [currentTopic, setCurrentTopic] = useState('');
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState(null);
  const [players, setPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedGuesses, setSubmittedGuesses] = useState([]);

  // Initialize socket connection when component mounts
  useEffect(() => {
    const newSocket = io('https://bali-balik.onrender.com', {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      secure: true,  // Changed to true since Render provides HTTPS
      rejectUnauthorized: false,
      extraHeaders: {
        'Origin': 'https://www.balibalik.com'
      }
    });
    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Only emit join-room after successful connection
      newSocket.emit('join-room', { pin, playerName, role });
    });

    // Store socket in state
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount

  // Set up game event listeners after socket is initialized
  useEffect(() => {
    if (!socket) return; // Don't do anything if socket isn't initialized

    socket.on('player-joined', (playersList) => {
      console.log('Player joined:', playersList);
      setPlayers(playersList);
    });

    socket.on('game-started', ({ topic, timeLeft }) => {
      console.log('Game started with topic:', topic);
      setGameState('playing');
      setCurrentTopic(topic);
      setTimeLeft(timeLeft);
      setHasSubmitted(false);
      setGuess('');
    });

    socket.on('timer-update', (time) => {
      setTimeLeft(time);
      if (time <= 0) {
        setGameState('results');
      }
    });

    socket.on('game-results', (matchResults) => {
      setGameState('results');
      setResults(matchResults);
    });

    // Clean up listeners
    return () => {
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('timer-update');
      socket.off('game-results');
    };
  }, [socket]); // Only re-run if socket changes

  const handleSubmitGuess = () => {
    if (!socket) return; // Guard clause for socket
    if (guess.trim()) {
      socket.emit('submit-guess', { pin, playerName, guess });
      setSubmittedGuesses(prev => [...prev, { playerName, guess }]);
      setGuess('');
      setHasSubmitted(true);
    }
  };

  const startGame = () => {
    console.log('=== Start Game Function Called ===');
    console.log('Socket state:', socket ? 'exists' : 'null');
    console.log('Role:', role);
    console.log('PIN:', pin);
    
    if (!socket) {
      console.error('❌ Cannot start game: Socket not initialized');
      return;
    }
    
    if (role === 'host') {
      console.log('✅ Conditions met for starting game:');
      console.log('- Is host');
      console.log('- Socket connected:', socket.connected);
      console.log('- Socket ID:', socket.id);
      console.log('Emitting start-game event for pin:', pin);
      
      // Add error handling and timeout for the emit
      try {
        const timeout = setTimeout(() => {
          console.error('❌ Start game event timed out after 5 seconds');
        }, 5000);

        socket.emit('start-game', pin, (response) => {
          clearTimeout(timeout);
          console.log('Start game event acknowledgement:', response);
        });

        // Add an error event listener
        socket.once('error', (error) => {
          console.error('❌ Socket error during start-game:', error);
        });
      } catch (error) {
        console.error('❌ Error emitting start-game event:', error);
      }
    } else {
      console.log('❌ Cannot start game: Not a host (role is', role, ')');
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