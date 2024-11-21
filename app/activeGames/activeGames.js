// activeGames.js

// Store active games in a Set for efficient lookup
const activeGames = new Set();

// Add a new game
const addGame = (pin) => {
  activeGames.add(pin);
  console.log(`Game ${pin} added. Active games:`, Array.from(activeGames));
};

// Remove a game
const removeGame = (pin) => {
  activeGames.delete(pin);
  console.log(`Game ${pin} removed. Active games:`, Array.from(activeGames));
};

// Validate if a game exists
const validateGame = (pin) => {
  const isValid = activeGames.has(pin);
  console.log(`Validating game ${pin}:`, isValid);
  return isValid;
};

module.exports = { activeGames, addGame, removeGame, validateGame };