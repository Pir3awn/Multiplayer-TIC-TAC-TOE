class GameClient {
    constructor() {
        this.socket = io();
        this.currentRoom = null;
        this.myPlayerId = null;
        this.currentPlayer = null;
        this.gameState = null;
        this.stats = null;
        this.rematchState = null;
        
        this.setupSocketHandlers();
        this.setupUIHandlers();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.handleConnect();
            this.socket.emit('getStats');
        });
        this.socket.on('roomCreated', (roomId) => this.handleRoomCreated(roomId));
        this.socket.on('gameStart', (gameState) => this.handleGameStart(gameState));
        this.socket.on('updateBoard', (gameState) => this.handleUpdateBoard(gameState));
        this.socket.on('gameOver', (data) => this.handleGameOver(data));
        this.socket.on('gameDraw', (data) => this.handleGameDraw(data));
        this.socket.on('playerDisconnected', (data) => this.handlePlayerDisconnected(data));
        this.socket.on('error', (message) => this.handleError(message));
        this.socket.on('roomFull', () => this.handleRoomFull());
        this.socket.on('playerStats', (stats) => this.handlePlayerStats(stats));
        this.socket.on('rematchRequested', (data) => this.handleRematchRequested(data));
        this.socket.on('rematchAccepted', (gameState) => this.handleRematchAccepted(gameState));
        this.socket.on('rematchDeclined', () => this.handleRematchDeclined());
        this.socket.on('rematchCanceled', () => this.handleRematchCanceled());
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
        this.socket.emit('getStats');
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
        this.socket.emit('getStats');
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
        this.socket.emit('getStats');
        this.rematchState = null;
        this.addGameEndButtons();
    }

    handleGameDraw(data) {
        this.gameState = data.gameState;
        this.currentPlayer = null;
        this.updateBoard();
        this.updateStatus('Match nul! 🤝');
        this.socket.emit('getStats');
        this.rematchState = null;
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

        if (!this.rematchState) {
            const rematchBtn = document.createElement('button');
            rematchBtn.textContent = 'Revanche';
            rematchBtn.classList.add('secondary');
            rematchBtn.onclick = () => this.requestRematch();
            controls.appendChild(rematchBtn);
        }

        if (this.rematchState === 'requesting') {
            const waitingText = document.createElement('div');
            waitingText.textContent = 'En attente de réponse...';
            waitingText.className = 'waiting-text';
            controls.appendChild(waitingText);
        }

        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'Nouvelle Partie';
        newGameBtn.onclick = () => window.location.reload();
        controls.appendChild(newGameBtn);

        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Retour au Menu';
        menuBtn.onclick = () => this.showMenu();
        controls.appendChild(menuBtn);
    }

    showMenu() {
        document.getElementById('gameBoard').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
        this.currentRoom = null;
        this.currentPlayer = null;
        this.gameState = null;
        this.rematchState = null;
    }

    handlePlayerStats(stats) {
        this.stats = stats;
        this.updateStats();
    }

    updateStats() {
        if (!this.stats) return;

        const statsDiv = document.createElement('div');
        statsDiv.className = 'stats-container';
        
        const wins = parseInt(this.stats.wins) || 0;
        const losses = parseInt(this.stats.losses) || 0;
        const draws = parseInt(this.stats.draws) || 0;

        statsDiv.innerHTML = `
            <h3>Vos Statistiques</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${wins}</div>
                    <div class="stat-label">Victoires</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${losses}</div>
                    <div class="stat-label">Défaites</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${draws}</div>
                    <div class="stat-label">Nuls</div>
                </div>
            </div>
        `;

        const statsInfo = document.getElementById('statsInfo');
        statsInfo.innerHTML = '';
        statsInfo.appendChild(statsDiv);
    }

    requestRematch() {
        if (this.currentRoom) {
            this.rematchState = 'requesting';
            this.socket.emit('requestRematch', this.currentRoom);
            this.addGameEndButtons();
        }
    }

    handleRematchRequested(data) {
        this.rematchState = 'pending';
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
            this.socket.emit('declineRematch', this.currentRoom);
            this.showMenu();
        };

        controls.appendChild(acceptBtn);
        controls.appendChild(declineBtn);
    }

    handleRematchAccepted(gameState) {
        this.rematchState = null;
        this.gameState = gameState;
        this.currentPlayer = gameState.currentPlayer;
        
        // Réinitialiser l'interface
        this.showGameBoard();
        this.updateBoard();
        this.updateStatus();
        document.getElementById('gameControls').innerHTML = '';
    }

    handleRematchDeclined() {
        this.rematchState = 'declined';
        alert('L\'adversaire a refusé la revanche');
        this.showMenu();
    }

    handleRematchCanceled() {
        this.rematchState = null;
        alert('La demande de revanche a été annulée');
        this.addGameEndButtons();
    }
}

// Initialiser le client quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new GameClient();
}); 