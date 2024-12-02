'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/utils/socket';
import { Confetti } from '@/app/components/ui/confetti';
const buttonSFX = "/assets/buttonClick.mp3";
const errorSFX = "/assets/errorSFX.mp3"
const joinSFX = "/assets/joinSound.mp3"
const gameStartSFX = "/assets/gameStart.mp3"
const tickSFX = "/assets/clockTick.mp3"
const roundCompleteSFX = "/assets/roundComplete.mp3"



export default function GameRoom({ params }) {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const playerName = searchParams.get('name');
  const pin = params.pin;
  
  // Initialize socket state using shared socket
  const [socket] = useState(() => getSocket());
  const [gameState, setGameState] = useState('waiting');
  const [currentTopic, setCurrentTopic] = useState('');
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState(null);
  const [players, setPlayers] = useState(playerName ? [playerName] : []);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedGuesses, setSubmittedGuesses] = useState([]);
  const [allGuesses, setAllGuesses] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [scores, setScores] = useState(new Map());
  const [roundNumber, setRoundNumber] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);
  const [roundResults, setRoundResults] = useState(null);
  const confettiRef = useRef(null);

  // Near the top of the component, parse the avatar from URL
  const avatarParam = searchParams.get('avatar');
  const playerAvatar = avatarParam ? JSON.parse(decodeURIComponent(avatarParam)) : null;

  //Initilazing sound functions
  const playClickSound = () => {
    new Audio(buttonSFX).play();
    return;
  }
  const playErrorSound = () => {
    new Audio(errorSFX).play();
    return;
  }
  const playJoinSound = () => {
    new Audio(joinSFX).play();
    return;
  }
  const playGameStartSound = () => {
    new Audio(gameStartSFX).play();
    return;
  }
  const playClockTick = () => {
    new Audio(tickSFX).play();
    return;
  }

  const playRoundComplete = () => {
    new Audio(roundCompleteSFX).play();
    return;
  }

  // Join room when component mounts
  useEffect(() => {
    if (!socket || !pin || !playerName || !role) return;

    console.log('Joining room with:', { pin, playerName, role, avatar: playerAvatar });
    socket.emit('join-room', { pin, playerName, role, avatar: playerAvatar });

    // Set up event listeners
    socket.on('player-joined', (data) => {
      console.log('Player joined event received:', data);
      if (data && Array.isArray(data.players)) {
        setPlayers(data.players);
      }
    });

    socket.on('game-started', (data) => {
      playGameStartSound();
      console.log('Game started with topic:', data.topic);
      setGameState('playing');
      setCurrentTopic(data.topic);
      setTimeLeft(data.timeLeft);
      setMaxRounds(data.maxRounds);
    });

    socket.on('timer-update', (time) => {
      playClockTick();
      setTimeLeft(time);
    });

    socket.on('guesses-updated', ({ guesses, totalPlayers }) => {
      playClickSound();
      console.log('Received updated guesses:', guesses);
      setAllGuesses(guesses);
      setTotalPlayers(totalPlayers);
    });

    // Cleanup
    return () => {
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('timer-update');
      socket.off('guesses-updated');
    };
  }, [socket, pin, playerName, role, playerAvatar]);

    // Also add a useEffect to monitor players state changes
    useEffect(() => {
      console.log('Players state updated:', players);
    }, [players]);
  
    const handleSubmitGuess = () => {
      if (!socket || !guess.trim()) return;
      playClickSound();
      socket.emit('submit-guess', { pin, playerName, guess: guess.trim() });
      setHasSubmitted(true);
      setGuess('');
    };
  
    const startGame = () => {
      console.log('=== Start Game Function Called ===');
      console.log('Socket state:', socket ? 'exists' : 'null');
      console.log('Role:', role);
      console.log('PIN:', pin);
      
      if (!socket) {
        playErrorSound();
        console.error('❌ Cannot start game: Socket not initialized');
        return;
      }
      
      if (role === 'host') {
        console.log('✅ Conditions met for starting game:');
        console.log('- Is host');
        console.log('- Socket connected:', socket.connected);
        console.log('- Socket ID:', socket.id);
        console.log('Emitting start-game event for pin:', pin);
        
        // Emit with acknowledgment callback
        socket.emit('start-game', pin, (response) => {
          if (response?.success) {
            console.log('✅ Game started successfully:', response);
          } else {
            playErrorSound();
            console.error('❌ Failed to start game:', response?.error || 'No response');
          }
        });
  
        // Add event listener for game-started
        socket.on('game-started', (data) => {
          playGameStartSound();
          console.log('Received game-started event:', data);
          setGameState('playing');
          setCurrentTopic(data.topic);
          setTimeLeft(data.timeLeft);
        });
      }
    };
  
    // Handle enter key press for submitting guess
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !hasSubmitted) {
        handleSubmitGuess();
      }
    };
  
    // Add this function to handle reconnection
    const connectWithRetry = () => {
      const maxRetries = 5;
      let retries = 0;
  
      const tryConnect = () => {
        if (retries >= maxRetries) {
          console.error('Max reconnection attempts reached');
          return;
        }
  
        socket.connect();
        retries++;
      };
  
      // socket.on('connect_error', () => {
      //   console.log(`Reconnection attempt ${retries + 1}/${maxRetries}`);
      //   setTimeout(tryConnect, 1000 * retries);
      // });
    };
  
    // Call this function when initializing your component
    connectWithRetry();
  
    // Add to your useEffect
    useEffect(() => {
      if (!socket) return;

      socket.on('round-completed', (results) => {
        playRoundComplete();
        console.log('Round completed:', results);
        setRoundResults(results);
        setGameState('round-results');
      });

      socket.on('new-round', ({ topic, roundNumber, maxRounds, timeLeft }) => {
        setCurrentTopic(topic);
        setRoundNumber(roundNumber);
        setMaxRounds(maxRounds);
        setTimeLeft(timeLeft);
        setHasSubmitted(false);
        setAllGuesses([]);
        setRoundResults(null);
        setGameState('playing');
      });
      
      const [gameEnd, setGameEnd] = useState(false);

      socket.on('game-ended', ({ reason, finalScores }) => {
        if (reason === 'completed') {
          setScores(new Map(finalScores.map(({player, score}) => [player, score])));
          setGameState('game-over');
          // Trigger confetti after a short delay
  
        }
      });

      if (!confettiTriggered) {
        setConfettiTriggered(true); // Prevent future triggers
        setTimeout(triggerWinnerConfetti, 500); }
        
      return () => {
        socket.off('round-completed');
        socket.off('new-round');
        socket.off('game-ended');
      };
    }, [socket]);
  
    // Add this function to trigger confetti
    const triggerWinnerConfetti = () => {
      confettiRef.current?.fire({
        spread: 90,
        decay: 0.91,
        scalar: 0.8,
        particleCount: 100,
        origin: { y: 0.6 }
      });
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
                    <li key={index} className="text-lg flex items-center gap-2">
                      <span className="text-2xl">
                        {player.avatar?.display || '👤'}
                      </span>
                      <span>
                        {player.name} {player.name === playerName && '(أنت)'}
                      </span>
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
            <div className="mb-4 text-lg text-gray-600">
              الجولة {roundNumber} من {maxRounds}
            </div>

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
              <div>
                <div className="text-green-600 text-lg mb-4">
                  تم تقديم تخمينك! انتظار اللاعبين الآخرين...
                </div>
                <div className="mt-4">
                  <h3 className="text-xl mb-2">التخمينات المقدمة:</h3>
                  <div className="space-y-2">
                    {allGuesses.map((g, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded flex items-center gap-2">
                        <span className="text-2xl">
                          {players.find(p => p.name === g.playerName)?.avatar?.display || '👤'}
                        </span>
                        <span className="font-bold">{g.playerName}</span>: {g.guess}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {allGuesses.length} من {totalPlayers} لاعبين قدموا تخميناتهم
                  </div>
                </div>
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
  
        {gameState === 'round-results' && roundResults && (
          <div className="text-center">
            <div className="mb-4 text-lg text-gray-600">
              اكتملت الجولة {roundNumber} من {maxRounds}
            </div>
            <h2 className="text-2xl mb-4">نتائج الجولة</h2>
            <div className="space-y-4">
              {roundResults.guessGroups.map(({ guess, players, points }, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg">{guess}</div>
                  <div className="text-sm text-gray-600">
                    {players.map(p => p.name).join(', ')} - {points} نقطة
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="text-xl mb-2">النقاط الحالية:</h3>
              {roundResults.scores
                .sort((a, b) => b.score - a.score)
                .map(({ player, avatar, score }, index) => (
                  <div key={index} className="text-lg flex items-center justify-center space-x-2 rtl:space-x-reverse">
                    <span className="text-2xl">{avatar?.display}</span>
                    <span>{player}: {score} نقطة</span>
                  </div>
                ))}
            </div>
            {roundNumber < maxRounds && (
              <div className="mt-4 text-sm text-gray-600">
                الجولة التالية تبدأ خلال 5 ثوان...
              </div>
            )}
          </div>
        )}
  
        {gameState === 'game-over' && (
          <div className="text-center relative">
            {/* Add Confetti component */}
            <Confetti
              ref={confettiRef}
              className="absolute left-0 top-0 z-0 w-full h-full"
              options={{
                gravity: 0.5,
                spread: 360,
                ticks: 100,
                decay: 0.94,
                startVelocity: 30,
                shapes: ['star'],
                colors: ['#FFD700', '#FFA500', '#FF6B6B', '#FF9A8B'],
              }}
            />

            <h2 className="text-3xl mb-6">انتهت اللعبة!</h2>
            <div className="space-y-4">
              {Array.from(scores)
                .sort(([,a], [,b]) => b - a)
                .map(([playerName, score], index) => (
                  <div 
                    key={playerName} 
                    className={`text-xl flex items-center justify-center space-x-2 rtl:space-x-reverse ${
                      index === 0 ? 'text-2xl font-bold text-yellow-600' : ''
                    }`}
                  >
                    <span>{index + 1}.</span>
                    {index === 0 && <span className="text-2xl">🏆</span>}
                    <span>{playerName}: {score} نقطة</span>
                  </div>
                ))}
            </div>
            {Array.from(scores).length > 0 && (
              <div className="mt-8 text-xl relative z-10">
                🎉 مبروك {Array.from(scores)[0][0]}! 🎉
              </div>
            )}
          </div>
        )}
      </div>
    );
} 