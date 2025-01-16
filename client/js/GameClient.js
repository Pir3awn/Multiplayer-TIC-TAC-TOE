class GameClient {
    constructor() {
        this.socket = io();
        this.currentRoom = null;
        this.myPlayerId = null;
        this.currentPlayer = null;
        this.gameState = null;
        this.rematchRequested = false;
        this.rematchRequesterId = null;
        
        this.setupSocketHandlers();
        this.setupUIHandlers();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('roomCreated', (roomId) => this.handleRoomCreated(roomId));
        this.socket.on('gameStart', (gameState) => this.handleGameStart(gameState));
        this.socket.on('updateBoard', (gameState) => this.handleUpdateBoard(gameState));
        this.socket.on('gameOver', (data) => this.handleGameOver(data));
        this.socket.on('gameDraw', (data) => this.handleGameDraw(data));
        this.socket.on('playerDisconnected', (data) => this.handlePlayerDisconnected(data));
        this.socket.on('error', (message) => this.handleError(message));
        this.socket.on('roomFull', () => this.handleRoomFull());
        this.socket.on('rematchRequested', (data) => this.handleRematchRequest(data));
        this.socket.on('gameRestarted', (gameState) => this.handleGameRestart(gameState));
    }

    setupUIHandlers() {
        document.getElementById('createRoom').addEventListener('click', 
            () => this.createRoom());
        document.getElementById('joinRoom').addEventListener('click',
            () => this.joinRoom());
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });
    }

    createRoom() {
        this.socket.emit('createRoom');
    }

    joinRoom() {
        const roomId = document.getElementById('roomId').value;
        if (roomId) {
            this.currentRoom = roomId;
            this.socket.emit('joinRoom', roomId);
        }
    }

    handleConnect() {
        this.myPlayerId = this.socket.id;
    }

    handleRoomCreated(roomId) {
        this.currentRoom = roomId;
        this.updateStatus(`Code de la salle: ${roomId}`);
        this.showGameBoard();
    }

    handleGameStart(gameState) {
        this.gameState = gameState;
        this.currentPlayer = gameState.currentPlayer;
        this.showGameBoard();
        this.updateBoard();
        this.updateStatus();
    }

    handleUpdateBoard(gameState) {
        this.gameState = gameState;
        this.currentPlayer = gameState.currentPlayer;
        this.updateBoard();
        this.updateStatus();
    }

    handleGameOver(data) {
        this.gameState = data.gameState;
        this.currentPlayer = null;
        this.updateBoard();
        const message = data.winner === this.myPlayerId ? 
            'Vous avez gagné! 🎉' : 'Vous avez perdu!';
        this.updateStatus(message, data.winner === this.myPlayerId);
        this.addGameEndButtons();
    }

    handleGameDraw(data) {
        this.gameState = data.gameState;
        this.currentPlayer = null;
        this.updateBoard();
        this.updateStatus('Match nul! 🤝');
        this.addGameEndButtons();
    }

    handlePlayerDisconnected(data) {
        this.gameState = data.gameState;
        this.currentPlayer = null;
        this.updateStatus('L\'autre joueur s\'est déconnecté! 😕');
        this.addGameEndButtons();
    }

    handleError(message) {
        alert(message);
    }

    handleRoomFull() {
        alert('Cette salle est pleine!');
    }

    handleCellClick(event) {
        if (this.currentRoom && this.socket.id === this.currentPlayer) {
            const position = parseInt(event.target.dataset.index);
            this.socket.emit('makeMove', { 
                roomId: this.currentRoom, 
                position 
            });
        }
    }

    showGameBoard() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameBoard').classList.remove('hidden');
    }

    updateBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.textContent = this.gameState.board[index] || '';
            cell.className = 'cell';
            if (this.gameState.board[index] === 'X') {
                cell.classList.add('x');
            } else if (this.gameState.board[index] === 'O') {
                cell.classList.add('o');
            }
        });
    }

    updateStatus(message, isWinner = false) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = isWinner ? 'winner' : '';
        
        // Mettre à jour les informations de la salle
        const roomInfo = document.getElementById('roomInfo');
        if (this.currentRoom) {
            roomInfo.textContent = `Code de la salle: ${this.currentRoom}`;
        }

        // Mettre à jour les informations du joueur
        const playerInfo = document.getElementById('playerInfo');
        if (this.gameState && this.gameState.players) {
            const symbol = this.myPlayerId === this.gameState.players.player1 ? 'X' : 'O';
            playerInfo.textContent = `Vous jouez avec: ${symbol}`;
        }
    }

    addGameEndButtons() {
        const controls = document.getElementById('gameControls');
        controls.innerHTML = '';
        
        if (!this.rematchRequested && !this.rematchRequesterId) {
            const rematchBtn = document.createElement('button');
            rematchBtn.textContent = 'Proposer une revanche';
            rematchBtn.classList.add('secondary');
            rematchBtn.onclick = () => {
                this.requestRematch();
                rematchBtn.textContent = 'En attente de l\'autre joueur...';
                rematchBtn.disabled = true;
            };
            controls.appendChild(rematchBtn);
        }
        
        if (this.rematchRequested) {
            const waitingText = document.createElement('div');
            waitingText.textContent = 'En attente de l\'autre joueur...';
            waitingText.className = 'waiting-text';
            controls.appendChild(waitingText);
        }
        
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'Nouvelle Partie';
        newGameBtn.onclick = () => {
            window.location.reload();
        };
        
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Retour au Menu';
        menuBtn.onclick = () => {
            this.showMenu();
        };
        
        controls.appendChild(newGameBtn);
        controls.appendChild(menuBtn);
    }

    requestRematch() {
        this.rematchRequested = true;
        this.socket.emit('requestRematch', this.currentRoom);
    }

    handleRematchRequest(data) {
        if (data.requesterId !== this.myPlayerId) {
            this.rematchRequesterId = data.requesterId;
            const controls = document.getElementById('gameControls');
            controls.innerHTML = '';
            
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Accepter la revanche';
            acceptBtn.classList.add('secondary');
            acceptBtn.onclick = () => {
                this.socket.emit('acceptRematch', this.currentRoom);
            };
            
            const declineBtn = document.createElement('button');
            declineBtn.textContent = 'Refuser';
            declineBtn.onclick = () => {
                this.showMenu();
            };
            
            controls.appendChild(acceptBtn);
            controls.appendChild(declineBtn);
        }
    }

    handleGameRestart(gameState) {
        this.gameState = gameState;
        this.currentPlayer = gameState.currentPlayer;
        this.rematchRequested = false;
        this.rematchRequesterId = null;
        this.updateBoard();
        this.updateStatus();
        
        // Nettoyer les contrôles
        document.getElementById('gameControls').innerHTML = '';
    }

    showMenu() {
        document.getElementById('gameBoard').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
        this.currentRoom = null;
        this.currentPlayer = null;
        this.gameState = null;
        this.rematchRequested = false;
        this.rematchRequesterId = null;
    }
}

// Initialiser le client quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new GameClient();
}); 