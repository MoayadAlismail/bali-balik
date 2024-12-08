'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socketClient';
import { Confetti } from '@/app/components/ui/confetti';
import { useTranslation } from '@/contexts/LanguageContext';
const buttonSFX = "/assets/buttonClick.mp3";
const errorSFX = "/assets/errorSFX.mp3"
const joinSFX = "/assets/joinSound.mp3"
const gameStartSFX = "/assets/gameStart.mp3"
const tickSFX = "/assets/clockTick.mp3"
const roundCompleteSFX = "/assets/roundComplete.mp3"
const gameEndSFX = "/assets/gameEnd.mp3"




export default function GameRoom({ params }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const playerName = searchParams.get('name');
  const pin = params.pin;
  // Near the top of the component, parse the avatar from URL
  const avatarParam = searchParams.get('avatar');
  const playerAvatar = avatarParam ? JSON.parse(decodeURIComponent(avatarParam)) : null;
  
  // Initialize socket state using shared socket
  const [socket] = useState(() => getSocket());
  const [gameState, setGameState] = useState('waiting');
  const [currentTopic, setCurrentTopic] = useState('');
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState(null);
  const [players, setPlayers] = useState([{
    name: playerName,
    avatar: playerAvatar,
    role: role
  }]);
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
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [thikrMessage, setThikr] = useState("");
  const [alreadySubmitted, setGuessSubmitted] = useState(false);
  const router = useRouter();



  //Initilazing sound functions
  const playClickSound = useCallback(() => {
    new Audio(buttonSFX).play();
    return;
  })

  const playErrorSound = () => {
    new Audio(errorSFX).play();
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

 const playGameEnd = () => {
    new Audio(gameEndSFX).play();
    return;
  }

  const handleSubmitGuess = useCallback(() => {
    if (!socket || !guess.trim()) return;
    setGuessSubmitted(true);
    playClickSound();
    socket.emit('submit-guess', { pin, playerName, guess: guess.trim() });
    setHasSubmitted(true);
    setGuess('');
  }, [socket, guess, pin, playerName, playClickSound]);

  // Add this function to handle auto-submission
  const handleAutoSubmit = useCallback(() => {
    if (!hasSubmitted && guess.trim()) {
        socket.emit('submit-guess', { pin, playerName, guess: guess.trim() });
        setHasSubmitted(true);
    }
  }, [socket, pin, playerName, guess, hasSubmitted]);

  // Join room when component mounts
  useEffect(() => {
    if (!socket || !pin || !playerName || !role) return;

    const joinData = { pin, playerName, role, avatar: playerAvatar };
    socket.emit('join-room', joinData);

    // Set up all game-related event listeners with room-specific events
    const handlePlayerJoined = (data) => {
        console.log('Received player-joined event:', data);
        if (data && Array.isArray(data.players)) {
            // Make sure we're not losing the current player's data
            const updatedPlayers = data.players.map(player => ({
                name: player.name,
                avatar: player.avatar,
                role: player.role
            }));
            console.log('Setting players to:', updatedPlayers);
            setPlayers(updatedPlayers);
        }
    };

    const handleGameStarted = (data) => {
        console.log('Game started data received:', data);
        playGameStartSound();
        
        // Reset game state for new game
        setHasSubmitted(false);
        setGuess('');
        setAllGuesses([]);
        setGuessSubmitted(false);
        
        // Set up first round
        setGameState('playing');
        setCurrentTopic(data.topic);
        setTimeLeft(data.timeLeft);
        setMaxRounds(data.maxRounds);
        setRoundNumber(data.roundNumber || 1);
        
        console.log(`Starting round ${data.roundNumber} of ${data.maxRounds}`);
    };

    const handleTimerUpdate = (time) => {
        setTimeLeft(time);
        // Auto-submit when 1 second remains
        if (time === 1 && !hasSubmitted) {
            handleAutoSubmit();
        }
        // Play tick sound if time is less than 5 seconds
        if (time <= 5 && !hasSubmitted) {
            playClockTick();
        }
    };

    const handleGuessesUpdated = ({ guesses, totalPlayers }) => {
        playClickSound();
        setAllGuesses(guesses);
        setTotalPlayers(totalPlayers);
    };

    const handleRoundCompleted = (results) => {
        if (!hasSubmitted) {
            handleAutoSubmit();
        }
        
        // Only play round complete sound if it's not the last round
        if (roundNumber < maxRounds) {
            playRoundComplete();
        }
        
        setGuessSubmitted(false);
        setRoundResults(results);
        setGameState('round-results');
    };

    const handleGameEnded = (data) => {
        console.log('Game ended event received:', data);
        // Only play game end sound, don't play round complete sound
        playGameEnd();
        setGameState('game-over');
        
        if (data?.finalScores) {
            const scoresMap = new Map();
            data.finalScores.forEach(({ player, score }) => {
                scoresMap.set(player, score);
            });
            setScores(scoresMap);
        }
        
        if (!confettiTriggered) {
            setConfettiTriggered(true);
            if (confettiRef.current) {
                confettiRef.current.trigger();
            }
        }
    };

    // Listen for room-specific events
    socket.on('player-joined', handlePlayerJoined);
    socket.on(`game-started:${pin}`, handleGameStarted);
    socket.on(`timer-update`, handleTimerUpdate);
    socket.on(`guesses-updated:${pin}`, handleGuessesUpdated);
    socket.on(`round-completed:${pin}`, handleRoundCompleted);
    socket.on(`game-ended:${pin}`, handleGameEnded);

    // Add this to debug players state changes
    const debugInterval = setInterval(() => {
        console.log('Current players:', players);
    }, 2000);

    // Cleanup function
    return () => {
        socket.off('player-joined', handlePlayerJoined);
        socket.off(`game-started:${pin}`, handleGameStarted);
        socket.off(`timer-update`, handleTimerUpdate);
        socket.off(`guesses-updated:${pin}`, handleGuessesUpdated);
        socket.off(`round-completed:${pin}`, handleRoundCompleted);
        socket.off(`game-ended:${pin}`, handleGameEnded);
        clearInterval(debugInterval);
    };
  }, [socket, pin, playerName, role, playerAvatar, allGuesses.length, totalPlayers, handleSubmitGuess, alreadySubmitted, hasSubmitted, handleAutoSubmit]);

    // Also add a useEffect to monitor players state changes
    // useEffect(() => {
    //   console.log('Players state updated:', players);
    // }, [players]);
  
    const startGame = () => {
      if (!socket || role !== 'host') return;
      
      // Immediately change game state to show we're starting
      setGameState('playing');
      
      socket.emit('start-game', pin, (response) => {
        if (response?.success) {
          console.log('✅ Game started successfully:', response);
        } else {
          playErrorSound();
          console.error('❌ Failed to start game:', response?.error || 'No response');
          // Reset game state if there was an error
          setGameState('waiting');
        }
      });
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
        if (alreadySubmitted == false) {
          handleSubmitGuess();
        }

        playRoundComplete();
        setGuessSubmitted(false);
        console.log('Round completed:', results);
        setRoundResults(results);
        setGameState('round-results');
      });

      socket.on('new-round', ({ topic, roundNumber, maxRounds, timeLeft }) => {
        if (gameState !== 'ended') {
            setCurrentTopic(topic);
            setRoundNumber(roundNumber);
            setMaxRounds(maxRounds);
            setTimeLeft(timeLeft);
            setHasSubmitted(false);
            setAllGuesses([]);
            setRoundResults(null);
            setGameState('playing');
            playGameStartSound();
        }
      });
      
      socket.on('game-ended', (data) => {
        playGameEnd();
        setGameState('game-over');
        
        // Don't disconnect the socket here anymore
        // Instead, just update the game state
        if (data?.finalScores) {
          const scoresMap = new Map();
          data.finalScores.forEach(({ player, score }) => {
            scoresMap.set(player, score);
          });
          setScores(scoresMap);
        }
        
        if (!confettiTriggered) {
          setConfettiTriggered(true);
          if (confettiRef.current) {
            confettiRef.current.trigger();
          }
        }
      });

      return () => {
        socket.off('round-completed');
        socket.off('new-round');
        socket.off('game-ended');
        // Only disconnect if actually leaving the room (not playing again)
        if (gameState === 'game-over' && window.location.pathname !== `/game/${pin}`) {
          socket.emit('leave-room', pin);
          socket.disconnect();
        }
      };
    }, [socket, confettiTriggered, alreadySubmitted, handleSubmitGuess]);
  

    //Selects a random thikr
    function getRandomIndex(max) {
      return Math.floor(Math.random() * max);
    }
    useEffect(() => {
      const thikr = [
        "قول سبحان الله",
        "قل لا اله إلا الله",
        "قول الحمدلله",
        "قول استغفر الله",    
        "صل على النبي",
      ];
      // Generate a random index to select a message
      const randomIndex = getRandomIndex(thikr.length);
      setThikr(thikr[randomIndex]);
    }, []); 

    // Add this function to trigger confetti
    const triggerWinnerConfetti = () => {
      if (confettiRef.current) {
        confettiRef.current.fire({
          spread: 90,
          decay: 0.91,
          scalar: 0.8,
          particleCount: 100,
          origin: { y: 0.6 },
          ticks: 100,
          startVelocity: 30
        });
        setConfettiTriggered(true);
      }
    };
  
    const handlePlayAgain = () => {
      playClickSound();
      // Reset game state
      setGameState('waiting');
      setConfettiTriggered(false);
      setScores(new Map());
      setRoundNumber(1);
      setAllGuesses([]);
      setRoundResults(null);
      setHasSubmitted(false);
      setGuessSubmitted(false);
      
      // No need to reconnect socket if it's already connected
      const joinData = { pin, playerName, role, avatar: playerAvatar };
      socket.emit('join-room', joinData);
    };

    const handleReturnHome = () => {
      playClickSound();
      // Properly cleanup before leaving
      socket.emit('leave-room', pin);
      socket.disconnect();
      router.push('/');
    };

    const handleShareResults = async () => {
      playClickSound();
      const winner = Array.from(scores)[0];
      const shareText = t('gameOver.shareText')
        .replace('{winner}', winner[0])
        .replace('{score}', winner[1]);
      
      try {
        if (navigator.share) {
          await navigator.share({ text: shareText });
        } else {
          await navigator.clipboard.writeText(shareText);
          alert(t('copied'));
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    };
  
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {gameState === 'waiting' && (
          <div className="text-center">
            <h2 className="text-2xl mb-4">{t('waiting.roomCode')} {pin}</h2>
            <div className="mb-4">
              <h3 className="text-xl mb-2">{t('waiting.players')}</h3>
              {players && players.length > 0 ? (
                <>
                    <div className="text-sm mb-2">{t('waiting.playerCount')} {players.length}</div>
                    <ul className="space-y-2">
                        {players.map((player, index) => (
                            <li key={index} className="text-lg flex items-center justify-center gap-2">
                                <span className="text-2xl">
                                    {player.avatar?.display || '👤'}
                                </span>
                                <span>
                                    {player.name} {player.name === playerName ? t('waiting.you') : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
              ) : (
                <p className="text-gray-500">{t('waiting.noPlayers')}</p>
              )}
            </div>
            {role === 'host' && players.length > 0 && (
              <button
                onClick={startGame}
                className="rounded-lg bg-white text-black px-6 py-3 hover:bg-gray-100 transition-colors font-semibold border-2 border-black active:transform active:scale-95">
                {t('waiting.start')}
              </button>
            )}
          </div>
        )}
  
        {gameState === 'playing' && (
          <div className="text-center">
            <div className="mb-4 text-lg text-gray-600">
              {t('playing.round')} {roundNumber} {t('playing.of')} {maxRounds || '...'}
            </div>

            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">{timeLeft}</div>
              <div className="text-sm text-gray-600">{t('playing.secondsLeft')}</div>
            </div>
            
            <h2 className="text-2xl mb-4">{t('playing.topic')} {currentTopic}</h2>
            
            {!hasSubmitted ? (
              <div>
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mb-4 p-3 rounded border"
                  placeholder={t('playing.enterGuess')}
                  autoFocus
                />
                <button
                  onClick={handleSubmitGuess}
                  className="rounded-full bg-foreground text-background px-6 py-3"
                >
                  {t('playing.submitGuess')}
                </button>
              </div>
            ) : (
              <div>
                <div className="text-green-600 text-lg mb-4">
                  {t('playing.guessSubmitted')}
                  <h1 className="loading-text">{t('playing.whileWaiting')} {thikrMessage}</h1>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl mb-2">{t('playing.submittedGuesses')}</h3>
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
                    {allGuesses.length} {t('playing.playersSubmitted')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
  
  
        {gameState === 'results' && (
          <div className="text-center">
            <h2 className="text-2xl mb-4">النتائج</h2>
               <h2 className="text-2xl mb-4">التخمينات القدمة</h2>
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
              {t('roundResults.roundComplete')} {roundNumber} {t('playing.of')} {maxRounds || '...'}
            </div>
            <h2 className="text-2xl mb-4">{t('roundResults.roundComplete')}</h2>
            <div className="w-full max-w-3xl mx-auto">
              {/* Show Matching Guesses First */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 text-black">{t('roundResults.matchingGuesses')}</h3>
                <div className="space-y-4">
                  {roundResults.guessGroups.map(({ guess, players, points }, index) => (
                    <div key={index} 
                      className="bg-white rounded-lg p-4 shadow-lg border-l-4 border-green-500">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-xl font-bold mb-2">{guess}</div>
                          <div className="flex flex-wrap gap-2">
                            {players.map((p, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-green-100 rounded-full px-3 py-1">
                                <span className="text-xl">{p.avatar?.display || '👤'}</span>
                                <span>{p.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          +{points} نقطة
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show All Submitted Guesses */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 text-black">{t('roundResults.allGuesses')}</h3>
                <div className="grid gap-3">
                  {allGuesses.map((g, index) => (
                    <div
                      key={index}
                      className="bg-white bg-opacity-90 rounded-lg p-4 shadow-lg
                                transform transition-all duration-300 hover:scale-102
                                border-l-4 border-blue-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {players.find(p => p.name === g.playerName)?.avatar?.display || '👤'}
                          </span>
                          <span className="font-semibold text-lg">{g.playerName}</span>
                        </div>
                        <div className="px-4 py-1 bg-blue-100 rounded-full font-medium">
                          {g.guess}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show Current Leaderboard */}
              <div>
                <h3 className="text-2xl font-bold mb-4 text-black">{t('roundResults.currentStandings')}</h3>
                <div className="space-y-3">
                  {roundResults.scores
                    .sort((a, b) => b.score - a.score)
                    .map(({ player, avatar, score }, index) => (
                      <div
                        key={player}
                        className={`
                          transform transition-all duration-300 hover:scale-102
                          flex items-center justify-between
                          p-4 rounded-xl shadow-lg
                          ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-black' : 
                            index === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-200 text-black' :
                            index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white' :
                            'bg-white text-black'}
                        `}
                      >
                        {/* Position Badge */}
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold
                            ${index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-slate-400' :
                              index === 2 ? 'bg-amber-800' : 'bg-blue-100'}
                          `}>
                            {index + 1}
                          </div>

                          {/* Player Info */}
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{avatar?.display || '👤'}</span>
                            <span className="font-bold text-xl">{player}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-2xl">{score}</span>
                          {index < 3 && (
                            <span className="animate-bounce">
                              {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'game-over' && (
          <div className="text-center relative">
            <Confetti
              ref={confettiRef}
              className="fixed inset-0 w-full h-full pointer-events-none"
              options={{
                gravity: 0.5,
                spread: 360,
                ticks: 100,
                decay: 0.94,
                startVelocity: 30,
                shapes: ['star'],
                colors: ['#FFD700', '#FFA500', '#FF6B6B', '#FF9A8B']
              }}
              manualstart={true}
            />
            <h2 className="text-3xl mb-6">{t('gameOver.gameEnded')}</h2>
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
                {t('gameOver.congratulations')}
                {Array.from(scores)[0][0]}
              </div>
            )}
            
            {/* Add the new buttons section */}
            <div className="mt-8 space-y-4">
              <div className="flex justify-center gap-4">
                <button
                  onClick={handlePlayAgain}
                  className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-600 transition-colors font-semibold"
                >
                  {t('gameOver.playAgain')}
                </button>
                
                <button
                  onClick={handleShareResults}
                  className="px-6 py-3 bg-blue-500 text-black rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  {t('gameOver.shareResults')}
                </button>
              </div>
              
              <button
                onClick={handleReturnHome}
                className="px-6 py-3 bg-gray-500 text-black rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                {t('gameOver.home')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
}