const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const GameManager = require('./GameManager');
const Game = require('./Game');
const Redis = require('ioredis');

// Redis connection with error handling
const redis = new Redis();
redis.on('error', (err) => {
    console.error('Erreur de connexion Redis:', err);
    process.exit(1); // Exit if Redis connection fails
});

redis.on('connect', () => {
    console.log('Connecté à Redis avec succès');
});

class GameServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });
        this.gameManager = new GameManager();
        this.rematchRequests = new Map();

        this.setupMiddleware();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(express.static('../client'));
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Nouveau joueur connecté:', socket.id);

            socket.on('createRoom', () => this.handleCreateRoom(socket));
            socket.on('joinRoom', (roomId) => this.handleJoinRoom(socket, roomId));
            socket.on('makeMove', (data) => this.handleMakeMove(socket, data));
            socket.on('requestRematch', (roomId) => this.handleRematchRequest(socket, roomId));
            socket.on('acceptRematch', (roomId) => this.handleRematchAccept(socket, roomId));
            socket.on('declineRematch', (roomId) => this.handleRematchDecline(socket, roomId));
            socket.on('disconnect', () => this.handleDisconnect(socket));
            socket.on('getStats', () => this.getPlayerStats(socket));
        });
    }

    handleCreateRoom(socket) {
        const roomId = Math.random().toString(36).substring(7);
        const game = this.gameManager.createGame(roomId);
        socket.join(roomId);
        game.addPlayer(socket.id);
        socket.emit('roomCreated', roomId);
    }

    handleJoinRoom(socket, roomId) {
        const game = this.gameManager.getGame(roomId);
        if (!game) {
            socket.emit('error', 'Salle introuvable');
            return;
        }

        if (!game.canJoin()) {
            socket.emit('roomFull');
            return;
        }

        socket.join(roomId);
        game.addPlayer(socket.id);
        this.io.to(roomId).emit('gameStart', game.getGameState());
    }

    async handleGameOver(socket, roomId, winner) {
        const game = this.gameManager.getGame(roomId);
        if (game) {
            game.status = 'finished';
            
            try {
                await redis.hincrby(`player:${winner}`, 'wins', 1);
                
                const loser = game.players.find(id => id !== winner);
                if (loser) {
                    await redis.hincrby(`player:${loser}`, 'losses', 1);
                }

                const winnerStats = await redis.hgetall(`player:${winner}`);
                const loserStats = loser ? await redis.hgetall(`player:${loser}`) : null;

                this.io.to(winner).emit('playerStats', winnerStats);
                if (loser) {
                    this.io.to(loser).emit('playerStats', loserStats);
                }

                this.io.to(roomId).emit('gameOver', {
                    winner: winner,
                    gameState: game.getGameState()
                });
            } catch (error) {
                console.error('Erreur Redis:', error);
            }
        }
    }

    async handleMakeMove(socket, data) {
        const { roomId, position } = data;
        const game = this.gameManager.getGame(roomId);
        
        if (!game || !game.isValidMove(position, socket.id)) {
            return;
        }

        game.makeMove(position);
        this.io.to(roomId).emit('updateBoard', game.getGameState());

        if (game.checkWinner()) {
            await this.handleGameOver(socket, roomId, socket.id);
        } else if (game.isDraw()) {
            game.status = 'finished';
            try {
                await Promise.all(game.players.map(playerId => 
                    redis.hincrby(`player:${playerId}`, 'draws', 1)
                ));

                for (const playerId of game.players) {
                    const stats = await redis.hgetall(`player:${playerId}`);
                    this.io.to(playerId).emit('playerStats', stats);
                }

                this.io.to(roomId).emit('gameDraw', {
                    gameState: game.getGameState()
                });
            } catch (error) {
                console.error('Erreur Redis:', error);
            }
        }
    }

    async getPlayerStats(socket) {
        try {
            const stats = await redis.hgetall(`player:${socket.id}`);
            socket.emit('playerStats', stats);
        } catch (error) {
            console.error('Erreur Redis:', error);
        }
    }

    handleRematchRequest(socket, roomId) {
        const game = this.gameManager.getGame(roomId);
        if (game && game.status === 'finished') {
            const otherPlayer = game.players.find(id => id !== socket.id);
            if (otherPlayer) {
                this.rematchRequests.set(roomId, {
                    requesterId: socket.id,
                    receiverId: otherPlayer
                });
                this.io.to(otherPlayer).emit('rematchRequested', {
                    roomId: roomId,
                    requesterId: socket.id
                });
            }
        }
    }

    handleRematchAccept(socket, roomId) {
        const request = this.rematchRequests.get(roomId);
        if (request && request.receiverId === socket.id) {
            const oldGame = this.gameManager.getGame(roomId);
            const newGame = new Game();
            
            newGame.addPlayer(oldGame.players[1]);
            newGame.addPlayer(oldGame.players[0]);
            
            newGame.status = 'playing';
            
            this.gameManager.removeGame(roomId);
            this.gameManager.games.set(roomId, newGame);
            
            this.io.to(roomId).emit('rematchAccepted', newGame.getGameState());
            this.rematchRequests.delete(roomId);
        }
    }

    handleRematchDecline(socket, roomId) {
        const request = this.rematchRequests.get(roomId);
        if (request && request.receiverId === socket.id) {
            this.io.to(request.requesterId).emit('rematchDeclined');
            this.rematchRequests.delete(roomId);
        }
    }

    handleDisconnect(socket) {
        console.log('Joueur déconnecté:', socket.id);
        for (const [roomId, request] of this.rematchRequests.entries()) {
            if (request.requesterId === socket.id || request.receiverId === socket.id) {
                this.rematchRequests.delete(roomId);
                this.io.to(roomId).emit('rematchCanceled');
            }
        }
        const result = this.gameManager.handlePlayerDisconnect(socket.id);
        if (result) {
            const { roomId, game } = result;
            game.status = 'finished';
            this.io.to(roomId).emit('playerDisconnected', {
                player: socket.id,
                gameState: game.getGameState()
            });
            this.gameManager.removeGame(roomId);
        }
    }

    start(port) {
        this.server.listen(port, '0.0.0.0', () => {
            console.log(`Serveur démarré sur le port ${port}`);
        });
    }
}

const gameServer = new GameServer();
gameServer.start(process.env.PORT || 3000); 