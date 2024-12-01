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
  const [players, setPlayers] = useState(playerName ? [playerName] : []);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedGuesses, setSubmittedGuesses] = useState([]);

  // Debug players state changes
  useEffect(() => {
    console.log('Players state changed:', players);
  }, [players]);

  // Initialize socket connection when component mounts
  useEffect(() => {
    console.log('Initializing socket connection...');
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    console.log('Connecting to:', socketUrl);
    
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ['websocket'],
      upgrade: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      path: '/socket.io/',
      withCredentials: true,
      extraHeaders: {
        'Origin': process.env.NEXT_PUBLIC_APP_URL
      }
    });

    // Add better error logging
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', {
        message: error.message,
        description: error.description,
        type: error.type,
        transport: newSocket.io?.engine?.transport?.name
      });
    });

    // Add connection event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected successfully via:', newSocket.io.engine.transport.name);
      if (pin && playerName && role) {
        console.log('Joining room with:', { pin, playerName, role });
        newSocket.emit('join-room', { pin, playerName, role });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Store socket in state
    setSocket(newSocket);

    // Clean up
    return () => {
      if (newSocket) {
        console.log('Cleaning up socket connection');
        newSocket.removeAllListeners();
        newSocket.close();
      }
    };
  }, [pin, playerName, role]);

  // Set up game event listeners after socket is initialized
  useEffect(() => {
    if (!socket) return; // Don't do anything if socket isn't initialized

    socket.on('player-joined', (data) => {
      console.log('Player joined event received:', data);
      
      if (data && Array.isArray(data.players)) {
        console.log('Setting players from data.players:', data.players);
        setPlayers(prevPlayers => {
          const newPlayers = [...new Set([...data.players])];
          console.log('New players array:', newPlayers);
          return newPlayers;
        });
      } else if (Array.isArray(data)) {
        console.log('Setting players from direct array:', data);
        setPlayers(prevPlayers => {
          const newPlayers = [...new Set([...data])];
          console.log('New players array:', newPlayers);
          return newPlayers;
        });
      }
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

  // Also add a useEffect to monitor players state changes
  useEffect(() => {
    console.log('Players state updated:', players);
  }, [players]);

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
            {players.length > 0 ? (
              <ul className="space-y-2">
                {players.map((player, index) => (
                  <li key={index} className="text-lg">
                    {player} {player === playerName && '(أنت)'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">لا يوجد لاعبين حتى الآن</p>
            )}
          </div>
          {role === 'host' && players.length > 0 && (
            <button
              onClick={startGame}
              className="rounded-lg bg-white text-black px-6 py-3 hover:bg-gray-100 transition-colors font-semibold border-2 border-black active:transform active:scale-95">
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