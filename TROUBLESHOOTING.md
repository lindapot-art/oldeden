# 🔧 Troubleshooting Guide

Quick solutions to common issues when running Old Eden.

---

## 🪟 Windows Issues

### Issue: "Node.js is not installed"

**Solution:**
1. Download Node.js from https://nodejs.org/
2. Install the LTS version (recommended for most users)
3. **Important:** Restart your computer after installation
4. Try running `start.bat` again

**Verify installation:**
```cmd
node --version
npm --version
```

Should show version numbers like `v20.11.0` and `10.2.4`

---

### Issue: "npm is not recognized as a command"

**Solution:**
1. Close all Command Prompt windows
2. Restart your computer (this updates PATH environment variable)
3. Open a new Command Prompt
4. Try running `start.bat` again

**If still not working:**
1. Search Windows for "Environment Variables"
2. Check if `C:\Program Files\nodejs\` is in your PATH
3. If not, add it manually
4. Restart computer

---

### Issue: Dependencies fail to install

**Error message:** `npm ERR! code ENOTFOUND` or network errors

**Solution:**
1. Check your internet connection
2. If behind a corporate proxy, configure npm proxy:
   ```cmd
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   ```
3. Try with administrator privileges (right-click `start.bat` → Run as Administrator)
4. Clear npm cache:
   ```cmd
   npm cache clean --force
   ```
5. Delete `node_modules` folder and try again

---

### Issue: Port 3000 already in use

**Error message:** `Error: listen EADDRINUSE :::3000`

**Solution:**
1. Edit `.env` file (it's in the repository root)
2. Change `PORT=3000` to `PORT=8080` (or any other port)
3. Save the file
4. Run `start.bat` again
5. Access game at `http://localhost:8080`

**Or find what's using port 3000:**
```cmd
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F
```

---

## 🐧 Linux/Mac Issues

### Issue: Permission denied when running start.sh

**Error message:** `bash: ./start.sh: Permission denied`

**Solution:**
```bash
chmod +x start.sh
./start.sh
```

---

### Issue: Node.js not found

**Solution for Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Solution for macOS:**
```bash
# Using Homebrew (install from https://brew.sh if you don't have it)
brew install node@20
```

**Verify installation:**
```bash
node --version
npm --version
```

---

### Issue: Dependencies fail with permission errors

**Error message:** `EACCES: permission denied`

**Solution (DO NOT use sudo npm install):**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Try again
./start.sh
```

---

## 🌐 Staging Deployment Issues

### Issue: GitHub Pages shows 404

**Solution:**
1. Go to repository Settings → Pages
2. Ensure Source is set to "GitHub Actions" (not "Deploy from branch")
3. Check Actions tab to see if deployment succeeded
4. Wait 2-5 minutes after deployment completes
5. Try accessing with `/` at the end: `https://username.github.io/oldeden/`

---

### Issue: Workflow fails with "Permission denied"

**Solution:**
1. Go to Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"
5. Click Save
6. Re-run the failed workflow

---

### Issue: Staging deployment doesn't trigger

**Solution:**
1. Check `.github/workflows/deploy-staging.yml` exists
2. Verify you pushed to `staging` or `develop` branch
3. Check Actions tab for any workflow runs
4. Manually trigger: Actions → Deploy Staging Environment → Run workflow

---

### Issue: "Resource not accessible by integration"

**Solution:**
1. This happens with private repos and GitHub Pages
2. Go to Settings → Pages
3. Make sure it's enabled and source is "GitHub Actions"
4. In Settings → Actions → General:
   - Workflow permissions: "Read and write permissions"
   - Allow GitHub Actions to create and approve pull requests: ✓
5. Re-run the workflow

---

## 🎮 Game Runtime Issues

### Issue: Server starts but browser shows "Cannot connect"

**Solution:**
1. Check the console output - did server start successfully?
2. Verify the port in console matches URL (e.g., both show `:3000`)
3. Try `http://localhost:3000` instead of `127.0.0.1:3000`
4. Check firewall isn't blocking Node.js
5. Try a different browser

---

### Issue: "MongoDB connection failed"

**Error message:** `MongoNetworkError: connect ECONNREFUSED`

**Solution:**
1. MongoDB is optional for basic testing
2. If you need it:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   
   # macOS
   brew install mongodb-community
   brew services start mongodb-community
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```
3. Or edit `.env` and comment out `MONGODB_URI`

---

### Issue: "Redis connection failed"

**Error message:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
1. Redis is optional for basic testing
2. If you need it:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # macOS
   brew install redis
   brew services start redis
   
   # Windows
   # Use WSL or download from https://redis.io/download
   ```
3. Or edit `.env` and comment out `REDIS_URL`

---

### Issue: Black screen in browser

**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Try a different browser (Chrome/Firefox/Edge)
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try incognito/private mode
6. Check if WebGL is enabled: visit https://get.webgl.org/

---

## 🔍 Debugging Tips

### Enable verbose logging

Edit `.env`:
```env
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### Check what's running

**Windows:**
```cmd
netstat -ano | findstr LISTENING
```

**Linux/Mac:**
```bash
lsof -i -P -n | grep LISTEN
```

### View server logs

When using `start.bat` or `start.sh`, logs appear in the console.

For PM2 (production):
```bash
pm2 logs oldeden
pm2 logs oldeden --lines 100
```

### Test if Node.js can run the game

```bash
# Skip the launcher, run directly
cd /path/to/oldeden
npm install
node src/core/index.js
```

If this works but launcher doesn't, the issue is with the launcher script.

---

## 📞 Still Having Issues?

1. **Check existing issues:** https://github.com/lindapot-art/oldeden/issues
2. **Create a new issue:**
   - Include error messages
   - Include your OS and Node.js version
   - Include steps to reproduce
3. **Community help:**
   - Describe what you've already tried
   - Share relevant error logs
   - Be specific about when the error occurs

---

## 🛠️ Common Error Codes Reference

| Error Code | Meaning | Common Solution |
|------------|---------|-----------------|
| `EADDRINUSE` | Port already in use | Change PORT in .env |
| `ECONNREFUSED` | Service not running | Start MongoDB/Redis or comment out in .env |
| `ENOTFOUND` | Network/DNS issue | Check internet connection |
| `EACCES` | Permission denied | Don't use sudo, fix npm permissions |
| `MODULE_NOT_FOUND` | Missing dependency | Delete node_modules, run npm install |
| `ERR_INVALID_URL` | Invalid configuration | Check .env file format |

---

## 📚 Additional Resources

- **Quick Start:** [QUICKSTART.md](QUICKSTART.md)
- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Usage Examples:** [EXAMPLES.md](EXAMPLES.md)
- **Main README:** [README.md](README.md)

---

*Most issues are solved by ensuring Node.js 20+ is installed and restarting your computer after installation!*
