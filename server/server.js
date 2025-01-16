const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const GameManager = require('./GameManager');

class GameServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });
        this.gameManager = new GameManager();

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
            socket.on('disconnect', () => this.handleDisconnect(socket));
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

    handleMakeMove(socket, data) {
        const { roomId, position } = data;
        const game = this.gameManager.getGame(roomId);
        
        if (!game || !game.isValidMove(position, socket.id)) {
            return;
        }

        game.makeMove(position);
        this.io.to(roomId).emit('updateBoard', game.getGameState());

        if (game.checkWinner()) {
            game.status = 'finished';
            this.io.to(roomId).emit('gameOver', {
                winner: socket.id,
                gameState: game.getGameState()
            });
        } else if (game.isDraw()) {
            game.status = 'finished';
            this.io.to(roomId).emit('gameDraw', {
                gameState: game.getGameState()
            });
            this.gameManager.removeGame(roomId);
        }
    }

    handleRematchRequest(socket, roomId) {
        const game = this.gameManager.getGame(roomId);
        if (game) {
            // Envoyer la demande à l'autre joueur avec l'ID du demandeur
            const otherPlayer = game.players.find(id => id !== socket.id);
            if (otherPlayer) {
                this.io.to(roomId).emit('rematchRequested', {
                    requesterId: socket.id,
                    otherPlayer: otherPlayer
                });
            }
        }
    }

    handleRematchAccept(socket, roomId) {
        // Créer une nouvelle partie avec les mêmes joueurs
        const oldGame = this.gameManager.getGame(roomId);
        if (oldGame) {
            const newGame = new Game();
            // Garder les mêmes joueurs mais inverser l'ordre
            newGame.addPlayer(oldGame.players[1]); // Le second joueur commence
            newGame.addPlayer(oldGame.players[0]);
            this.gameManager.removeGame(roomId);
            this.gameManager.games.set(roomId, newGame);
            
            // Informer les deux joueurs du redémarrage
            this.io.to(roomId).emit('gameRestarted', newGame.getGameState());
        }
    }

    handleDisconnect(socket) {
        console.log('Joueur déconnecté:', socket.id);
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