# Tic Tac Toe Multijoueur

A modern, real-time multiplayer Tic Tac Toe game with a sleek dark theme and player statistics.

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## Features

- ✨ Real-time multiplayer gameplay
- 🎮 Room-based matchmaking
- 📊 Player statistics tracking
- 🌓 Modern dark theme UI
- 📱 Responsive design for all devices
- 🔄 Real-time game state updates
- 🏆 Win/Loss/Draw tracking

## Prerequisites

- Node.js (v14+ recommended)
- Redis Server
- Modern web browser

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Pir3awn/node-efm.git
cd node-efm
```

2. Install dependencies:
```bash
cd server
npm install
```

3. Install and start Redis:
- **Windows**:
  - Download [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
  - Run the installer
  - Redis will start automatically as a Windows service

- **Linux**:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

- **macOS**:
```bash
brew install redis
brew services start redis
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

## Project Structure

```
├── client/
│   ├── index.html
│   ├── style.css
│   └── js/
│       └── GameClient.js
└── server/
    ├── server.js
    ├── Game.js
    ├── GameManager.js
    └── package.json
```

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **State Management**: Redis
- **Session Handling**: Redis

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Socket.IO for real-time communication
- Redis for state management
- Node.js community for amazing tools 