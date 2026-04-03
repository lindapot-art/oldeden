# Old Eden - Deployment Guide

This guide covers how to deploy and run Old Eden locally and in staging/production environments.

---

## 🖥️ Local Development (Windows)

### Quick Start with `start.bat`

The easiest way to run Old Eden on Windows is to use the self-executable `start.bat` file:

1. **Double-click `start.bat`** in the repository root
2. The script will automatically:
   - Check for Node.js installation
   - Install dependencies (first run only)
   - Create `.env` configuration file
   - Start the game server

That's it! The game will be available at `http://localhost:3000`

### Requirements

- **Node.js 20.0.0 or higher** - Download from [nodejs.org](https://nodejs.org/)
- **Git** (optional) - For cloning the repository
- **~500 MB disk space** - For dependencies

### First-Time Setup

If you don't have Node.js installed:
1. Download Node.js from https://nodejs.org/
2. Install Node.js (use the LTS version recommended for most users)
3. Restart your computer (recommended)
4. Double-click `start.bat`

---

## 🐧 Local Development (Linux/Mac)

### Quick Start with `start.sh`

For Linux and Mac users:

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Run the launcher
./start.sh
```

The script provides the same automatic setup as `start.bat`:
- Checks for Node.js
- Installs dependencies
- Creates configuration
- Starts the server

### Manual Start (Alternative)

If you prefer to run commands manually:

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the server
npm start

# Or use development mode with auto-reload
npm run dev
```

---

## 🌐 Staging Deployment (Private Repository)

Old Eden includes GitHub Actions workflows for staging deployment, even for private repositories.

### Setting Up Staging

1. **Enable GitHub Pages** in your repository:
   - Go to `Settings` → `Pages`
   - Under "Source", select `GitHub Actions`
   - Click Save

2. **Create a staging branch** (optional):
   ```bash
   git checkout -b staging
   git push origin staging
   ```

3. **Automatic Deployment**:
   - Pushing to `staging` or `develop` branches triggers automatic deployment
   - The staging site will be available at: `https://[username].github.io/oldeden/`

### Manual Staging Deployment

You can also manually trigger a staging deployment:

1. Go to `Actions` tab in GitHub
2. Select `Deploy Staging Environment` workflow
3. Click `Run workflow`
4. Choose your environment (staging/preview)
5. Click `Run workflow` button

### Staging Features

The staging workflow automatically:
- ✅ Installs dependencies
- ✅ Runs tests
- ✅ Creates build information (commit, branch, timestamp)
- ✅ Deploys to GitHub Pages
- ✅ Provides a preview URL
- ✅ Works with private repositories
- ✅ Comments on PRs with staging URLs

### Accessing Staging

After deployment completes (usually 2-5 minutes):
- Visit: `https://[your-username].github.io/oldeden/`
- Build info available at: `https://[your-username].github.io/oldeden/build-info.json`

---

## 🚀 Production Deployment

### Option 1: Self-Hosted Server

Deploy on any server with Node.js:

```bash
# Clone the repository
git clone https://github.com/lindapot-art/oldeden.git
cd oldeden

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your production settings

# Start with PM2 (recommended for production)
npm install -g pm2
pm2 start src/core/index.js --name oldeden
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Option 2: Docker Deployment

Create a `Dockerfile` in the repository root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "src/core/index.js"]
```

Build and run:

```bash
docker build -t oldeden .
docker run -p 3000:3000 --env-file .env oldeden
```

### Option 3: Cloud Platforms

**Heroku:**
```bash
heroku create oldeden-prod
git push heroku main
```

**Railway:**
1. Connect your GitHub repository
2. Deploy automatically on push

**Render:**
1. Create a new Web Service
2. Connect repository
3. Build command: `npm install`
4. Start command: `node src/core/index.js`

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file to configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/oldeden
REDIS_URL=redis://localhost:6379

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_deployer_key

# Authentication
JWT_SECRET=your_random_secret_key

# AI Services
AI_SERVICE_URL=http://localhost:8000
```

### Required Services

For full functionality, you'll need:
- **MongoDB** - Database for game state
- **Redis** - Session cache and real-time data
- **Polygon RPC** - Blockchain integration

For local testing, these are optional - the game will run in a limited mode without them.

---

## 📦 Build Information

Staging builds include build information at `/build-info.json`:

```json
{
  "buildDate": "2026-04-03T23:55:00Z",
  "gitCommit": "abc123...",
  "gitBranch": "staging",
  "gitAuthor": "username",
  "environment": "staging"
}
```

---

## 🛠️ Troubleshooting

### Windows: "Node.js is not installed"
- Download from https://nodejs.org/
- Install and restart your computer
- Run `start.bat` again

### Windows: "npm is not recognized"
- Close all command prompts
- Restart your computer
- Run `start.bat` again

### Port 3000 already in use
- Edit `.env` file and change `PORT=3000` to another port (e.g., `PORT=8080`)
- Or stop the process using port 3000

### Dependencies fail to install
- Check your internet connection
- Try deleting `node_modules` folder and running again
- Ensure you have Node.js 20.0.0 or higher

### Staging deployment fails
- Check GitHub Actions logs in the `Actions` tab
- Ensure GitHub Pages is enabled in repository settings
- Verify you have push access to the repository

---

## 📞 Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [GitHub Issues](https://github.com/lindapot-art/oldeden/issues)
- Contact the development team

---

*Old Eden — where every death is a new beginning.*
