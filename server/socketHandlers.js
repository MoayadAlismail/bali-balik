let rooms;

module.exports = function(io, sharedRooms) {
    rooms = sharedRooms;

    io.on('connection', (socket) => {
        socket.on('create-game', (settings) => {
            const pin = generatePin();
            console.log('Creating game with settings:', settings);
            rooms.set(pin, {
                pin,
                players: [],
                roundCount: settings.roundCount || 5,
                roundTime: settings.roundTime || 60,
                currentRound: 0,
                submittedGuesses: [],
                scores: new Map(),
                timer: null,
                gameState: 'waiting'
            });
            socket.emit('game-created', pin);
            console.log('Game created, current rooms:', rooms);
        });

        socket.on('join-room', ({ pin, playerName, role, avatar }) => {
            const room = rooms.get(pin);
            if (room) {
                const playerData = {
                    name: playerName,
                    avatar: avatar,
                    role: role
                };
                
                room.players = room.players.filter(p => p.name !== playerName);
                room.players.push(playerData);
                socket.join(pin);
                
                console.log(`Player ${playerName} joined room ${pin}. Current players:`, room.players);
                io.to(pin).emit(`player-joined:${pin}`, { players: room.players });
            }
        });

        socket.on('start-game', (pin, callback) => {
            console.log('Start game request received for pin:', pin);
            const room = rooms.get(pin);
            
            if (!room) {
                console.error('Room not found:', pin);
                if (callback) callback({ success: false, error: 'Room not found' });
                return;
            }

            try {
                // Reset room state
                room.gameState = 'playing';
                room.currentRound = 1;
                room.submittedGuesses = [];
                const currentTopic = getRandomTopic();

                // Clear any existing timer
                if (room.timer) {
                    clearInterval(room.timer);
                    room.timer = null;
                }

                // Prepare first round data
                const gameStartData = {
                    topic: currentTopic,
                    timeLeft: room.roundTime,
                    maxRounds: room.roundCount,
                    roundNumber: 1
                };

                // Start the game
                console.log('Starting first round with data:', gameStartData);
                io.to(pin).emit(`game-started:${pin}`, gameStartData);

                // Start the timer for the first round
                let timeLeft = room.roundTime;
                io.to(pin).emit(`timer-update:${pin}`, timeLeft);

                room.timer = setInterval(() => {
                    timeLeft--;
                    io.to(pin).emit(`timer-update:${pin}`, timeLeft);
                    
                    if (timeLeft <= 0) {
                        clearInterval(room.timer);
                        room.timer = null;
                        
                        // Handle round completion
                        const roundResults = {
                            guessGroups: room.submittedGuesses,
                            scores: Array.from(room.scores.entries()).map(([player, score]) => ({
                                player,
                                score
                            }))
                        };
                        
                        io.to(pin).emit(`round-completed:${pin}`, roundResults);
                        room.submittedGuesses = [];

                        // Start next round
                        if (room.currentRound < room.roundCount) {
                            setTimeout(() => {
                                room.currentRound++;
                                const newTopic = getRandomTopic();
                                const nextRoundData = {
                                    topic: newTopic,
                                    roundNumber: room.currentRound,
                                    maxRounds: room.roundCount,
                                    timeLeft: room.roundTime
                                };
                                io.to(pin).emit(`new-round:${pin}`, nextRoundData);
                            }, 5000);
                        } else {
                            io.to(pin).emit(`game-ended:${pin}`, {
                                finalScores: Array.from(room.scores.entries()).map(([player, score]) => ({
                                    player,
                                    score
                                }))
                            });
                        }
                    }
                }, 1000);

                if (callback) callback({ success: true });
                
            } catch (error) {
                console.error('Error starting game:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        socket.on('submit-guess', ({ pin, playerName, guess }) => {
            const room = rooms.get(pin);
            if (room) {
                room.submittedGuesses.push({ playerName, guess });
                io.to(pin).emit(`guesses-updated:${pin}`, {
                    guesses: room.submittedGuesses,
                    totalPlayers: room.players.length
                });
            }
        });
    });
};

function generatePin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function getRandomTopic() {
    const topics = ['طعام', 'رياضة', 'سيارات', 'حيوانات', 'مدن'];
    return topics[Math.floor(Math.random() * topics.length)];
} 