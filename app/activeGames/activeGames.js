// activeGames.js

// Export the activeGames array
const activeGames = [];

// Utility functions to manage the activeGames array
const addGame = (pin) => {
    if (!activeGames.includes(pin)) {
        activeGames.push(pin);
    }
};

const removeGame = (pin) => {
    const index = activeGames.indexOf(pin);
    if (index !== -1) {
        activeGames.splice(index, 1);
    }
};

const validateGame = (pin) => activeGames.includes(pin);

module.exports = { activeGames, addGame, removeGame, validateGame };
