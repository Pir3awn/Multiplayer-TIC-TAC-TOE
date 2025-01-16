class Game {
    constructor() {
        this.board = Array(9).fill(null);
        this.players = [];
        this.currentPlayerIndex = 0;
        this.status = 'waiting'; // waiting, playing, finished
    }

    hasPlayer(playerId) {
        return this.players.includes(playerId);
    }

    addPlayer(playerId) {
        if (this.players.length >= 2) return false;
        this.players.push(playerId);
        if (this.players.length === 2) {
            this.status = 'playing';
        }
        return true;
    }

    canJoin() {
        return this.players.length < 2;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getBoard() {
        return this.board;
    }

    isValidMove(position, playerId) {
        return (
            this.players[this.currentPlayerIndex] === playerId &&
            position >= 0 &&
            position < 9 &&
            this.board[position] === null
        );
    }

    makeMove(position) {
        this.board[position] = this.currentPlayerIndex === 0 ? 'X' : 'O';
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    }

    checkWinner() {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // lignes
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // colonnes
            [0, 4, 8], [2, 4, 6] // diagonales
        ];

        return winningCombinations.some(([a, b, c]) => {
            return (
                this.board[a] &&
                this.board[a] === this.board[b] &&
                this.board[a] === this.board[c]
            );
        });
    }

    isDraw() {
        return this.board.every(cell => cell !== null);
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.getCurrentPlayer(),
            status: this.status,
            players: {
                player1: this.players[0],
                player2: this.players[1]
            }
        };
    }
}

module.exports = Game; 