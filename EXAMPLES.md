# 📚 Usage Examples

This document provides step-by-step examples for common deployment scenarios.

---

## Example 1: First-Time Windows User

**Scenario:** You just cloned the repository and want to run the game on your Windows PC.

### Steps:

1. **Check if you have Node.js:**
   - Open Command Prompt
   - Type: `node --version`
   - If you see a version number (e.g., `v20.11.0`), you're good to go!
   - If not, download from https://nodejs.org/

2. **Run the game:**
   - Navigate to the `oldeden` folder in File Explorer
   - Double-click `start.bat`
   - Wait for automatic setup (first run takes 2-3 minutes)

3. **Access the game:**
   - Open your browser
   - Go to `http://localhost:3000`
   - Start playing!

4. **Stop the server:**
   - Go back to the command window
   - Press `Ctrl+C`
   - Type `Y` and press Enter

---

## Example 2: Setting Up Staging for Private Repo

**Scenario:** You want to test your private repository online without making it public.

### Steps:

1. **Enable GitHub Pages:**
   ```
   1. Go to your repository on GitHub
   2. Click `Settings` (top right)
   3. Scroll down to `Pages` (left sidebar)
   4. Under "Source", select `GitHub Actions`
   5. Click `Save`
   ```

2. **Create and push to staging branch:**
   ```bash
   # Create staging branch
   git checkout -b staging
   
   # Make any changes you want to test
   git add .
   git commit -m "Test changes for staging"
   
   # Push to GitHub
   git push origin staging
   ```

3. **Wait for deployment:**
   - Go to `Actions` tab on GitHub
   - Watch the "Deploy Staging Environment" workflow
   - Wait for green checkmark (usually 2-5 minutes)

4. **Access your staging site:**
   - Visit: `https://[your-username].github.io/oldeden/`
   - Example: `https://lindapot-art.github.io/oldeden/`

5. **Share with testers:**
   - Send them the URL
   - They can test without needing Node.js or Git
   - Works on mobile devices too!

---

## Example 3: Testing a Feature Before Merging

**Scenario:** You're working on a new feature and want to preview it online before merging to main.

### Steps:

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/soul-fracture-effect
   ```

2. **Make your changes and commit:**
   ```bash
   # Edit files...
   git add .
   git commit -m "Add soul fracture visual effect"
   ```

3. **Push to develop branch for staging:**
   ```bash
   # Push your feature branch
   git push origin feature/soul-fracture-effect
   
   # Merge to develop (triggers staging deployment)
   git checkout develop
   git merge feature/soul-fracture-effect
   git push origin develop
   ```

4. **Preview on staging:**
   - Automatic deployment triggers
   - Visit staging URL to test
   - Share with team for feedback

5. **Merge to main when ready:**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

---

## Example 4: Quick Local Testing (Linux/Mac)

**Scenario:** You're on Mac/Linux and want to quickly test the game.

### Steps:

1. **Clone and run:**
   ```bash
   # Clone the repo
   git clone https://github.com/lindapot-art/oldeden.git
   cd oldeden
   
   # Make start script executable
   chmod +x start.sh
   
   # Run it!
   ./start.sh
   ```

2. **Wait for setup:**
   - First run: ~2-3 minutes (installing dependencies)
   - Subsequent runs: ~2 seconds (instant start)

3. **Test the game:**
   - Browser opens automatically at `http://localhost:3000`
   - Or manually visit the URL

4. **Stop the server:**
   - Press `Ctrl+C` in the terminal

---

## Example 5: Running on Different Port

**Scenario:** Port 3000 is already in use, you need to use a different port.

### Steps:

1. **Edit .env file:**
   ```bash
   # Open .env in any text editor
   # Change this line:
   PORT=3000
   
   # To:
   PORT=8080
   ```

2. **Restart the server:**
   - Windows: Double-click `start.bat` again
   - Linux/Mac: Run `./start.sh` again

3. **Access on new port:**
   - Go to `http://localhost:8080`

---

## Example 6: Manual Staging Deployment

**Scenario:** You want to trigger a staging deployment manually without pushing code.

### Steps:

1. **Go to GitHub Actions:**
   ```
   1. Open your repository on GitHub
   2. Click the `Actions` tab
   3. Select "Deploy Staging Environment" from the left sidebar
   ```

2. **Trigger manual deployment:**
   ```
   1. Click "Run workflow" button (top right)
   2. Select branch to deploy (e.g., "staging")
   3. Choose environment ("staging" or "preview")
   4. Click "Run workflow" button
   ```

3. **Monitor progress:**
   - Watch the workflow run in real-time
   - Click on the run to see detailed logs
   - Wait for completion

4. **Access deployed site:**
   - Click on the deployment URL in the workflow summary
   - Or visit `https://[username].github.io/oldeden/`

---

## Example 7: Sharing with Non-Technical Users

**Scenario:** You want to share the game with friends who aren't developers.

### Option A: Use Staging (Easiest)

1. Deploy to staging (see Example 2)
2. Share the URL: `https://[your-username].github.io/oldeden/`
3. They just open the link - no installation needed!

### Option B: Send Them the Launcher

1. **Package the repository:**
   - Create a ZIP of your repository
   - Make sure `start.bat` is in the root

2. **Send with instructions:**
   ```
   Hey! To play Old Eden:
   
   1. Download and install Node.js from https://nodejs.org/
   2. Extract the ZIP file I sent you
   3. Double-click start.bat
   4. Wait a few minutes on first run
   5. Your browser will open automatically!
   
   To stop: Close the black window that opened
   ```

3. **Troubleshooting help:**
   - Send them the QUICKSTART.md file
   - Or link to DEPLOYMENT.md#troubleshooting

---

## Example 8: Development Workflow with Auto-Reload

**Scenario:** You're actively developing and want the server to restart automatically when you change code.

### Steps:

1. **Use development mode:**
   ```bash
   npm run dev
   ```
   
   Instead of using `start.bat` or `start.sh`

2. **Edit code:**
   - Make changes to any `.js` file
   - Save the file
   - Server automatically restarts
   - Refresh your browser to see changes

3. **Watch the console:**
   - See restart messages
   - Check for errors immediately

---

## Example 9: Checking Build Information

**Scenario:** You want to verify which commit is currently deployed to staging.

### Steps:

1. **Visit build-info endpoint:**
   ```
   https://[your-username].github.io/oldeden/build-info.json
   ```

2. **Check the details:**
   ```json
   {
     "buildDate": "2026-04-03T23:55:00Z",
     "gitCommit": "f654015abc...",
     "gitBranch": "staging",
     "gitAuthor": "your-username",
     "environment": "staging"
   }
   ```

3. **Verify it matches your latest push:**
   - Compare `gitCommit` with `git log`
   - Check `buildDate` to ensure it's recent

---

## Example 10: Full Production Deployment

**Scenario:** You're ready to deploy to production on a real server.

### Steps:

1. **Prepare server:**
   ```bash
   # SSH into your server
   ssh user@your-server.com
   
   # Install Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Deploy code:**
   ```bash
   # Clone repository
   git clone https://github.com/lindapot-art/oldeden.git
   cd oldeden
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production settings
   ```

3. **Start with PM2:**
   ```bash
   # Start the server
   pm2 start src/core/index.js --name oldeden
   
   # Save PM2 configuration
   pm2 save
   
   # Enable auto-start on server reboot
   pm2 startup
   # Follow the command it shows you
   ```

4. **Set up reverse proxy (optional but recommended):**
   ```bash
   # Install nginx
   sudo apt-get install nginx
   
   # Configure nginx to proxy to Node.js
   sudo nano /etc/nginx/sites-available/oldeden
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name oldeden.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/oldeden /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Access your production site:**
   - Visit your domain (e.g., `http://oldeden.com`)
   - Set up SSL with Let's Encrypt (recommended)

---

## Need More Help?

- **Quick Start:** See [QUICKSTART.md](QUICKSTART.md)
- **Full Deployment Guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Main Documentation:** See [README.md](README.md)
- **Issues:** Open an issue on GitHub

---

*Happy deploying! 🚀*
