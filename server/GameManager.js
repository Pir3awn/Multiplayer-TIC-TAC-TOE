const Game = require('./Game');

class GameManager {
    constructor() {
        this.games = new Map();
    }

    createGame(roomId) {
        const game = new Game();
        this.games.set(roomId, game);
        return game;
    }

    getGame(roomId) {
        return this.games.get(roomId);
    }

    removeGame(roomId) {
        this.games.delete(roomId);
    }

    handlePlayerDisconnect(socketId) {
        let result = null;
        this.games.forEach((game, roomId) => {
            if (game.hasPlayer(socketId)) {
                result = { roomId, game };
            }
        });
        return result;
    }
}

module.exports = GameManager; 