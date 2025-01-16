# Deployment Guide

This guide covers deployment steps for different platforms.

## Local Development Setup

### Prerequisites
1. Node.js (v14+ recommended)
2. Redis Server
3. Git

### Redis Installation

#### Windows
1. Download Redis for Windows from [GitHub](https://github.com/microsoftarchive/redis/releases)
2. Run the installer (Redis-x64-xxx.msi)
3. During installation:
   - Add Redis installation folder to the PATH environment variable
   - Enable running Redis as a Windows Service
4. Verify installation:
   ```bash
   redis-cli ping
   ```
   Should return: `PONG`

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis

# Enable Redis to start on boot
sudo systemctl enable redis

# Verify installation
redis-cli ping
```

#### macOS
```bash
# Install Redis using Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping
```

### Application Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tic-tac-toe-multiplayer.git
cd tic-tac-toe-multiplayer
```

2. Install dependencies:
```bash
cd server
npm install
```

3. Create .env file:
```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

4. Start the application:
```bash
npm start
```

## Production Deployment

### Option 1: Heroku Deployment

1. Install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create new Heroku app:
```bash
heroku create your-app-name
```

4. Add Redis add-on:
```bash
heroku addons:create heroku-redis:hobby-dev
```

5. Deploy the application:
```bash
git push heroku main
```

### Option 2: DigitalOcean Deployment

1. Create a new Droplet
2. SSH into your Droplet
3. Install Node.js:
```bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Install Redis:
```bash
sudo apt update
sudo apt install redis-server
```

5. Configure Redis:
```bash
sudo nano /etc/redis/redis.conf
```
Change `supervised no` to `supervised systemd`

6. Restart Redis:
```bash
sudo systemctl restart redis.service
```

7. Clone and setup application:
```bash
git clone https://github.com/yourusername/tic-tac-toe-multiplayer.git
cd tic-tac-toe-multiplayer/server
npm install
```

8. Install PM2:
```bash
sudo npm install -g pm2
```

9. Start application with PM2:
```bash
pm2 start server.js
pm2 save
pm2 startup
```

### Security Considerations

1. Redis Security:
   - Set a strong Redis password
   - Configure Redis to listen only on localhost
   - Enable SSL/TLS for Redis connections

2. Application Security:
   - Use HTTPS in production
   - Set secure headers
   - Implement rate limiting
   - Add DDoS protection

3. Server Security:
   - Configure firewall (UFW)
   - Keep system updated
   - Use SSH key authentication
   - Disable root login

## Troubleshooting

### Redis Connection Issues
1. Verify Redis is running:
```bash
redis-cli ping
```

2. Check Redis logs:
```bash
sudo tail -f /var/log/redis/redis-server.log
```

3. Common fixes:
   - Restart Redis service
   - Check Redis configuration
   - Verify connection string
   - Check firewall settings

### Application Issues
1. Check application logs:
```bash
pm2 logs
```

2. Verify environment variables:
```bash
pm2 env 0
```

3. Common fixes:
   - Clear Redis cache
   - Restart application
   - Check port availability
   - Verify file permissions 