# 🎮 Old Eden - Quick Reference Card

## 🚀 How to Run Locally

| Platform | Command | Notes |
|----------|---------|-------|
| **Windows** | Double-click `start.bat` | Self-executable, handles everything |
| **Linux/Mac** | `./start.sh` | May need `chmod +x start.sh` first |
| **Manual** | `npm install && npm start` | Traditional method |

**Access:** http://localhost:3000

---

## 🌐 How to Deploy for Online Testing (Private Repo)

### One-Time Setup:
1. Go to repo **Settings** → **Pages**
2. Set Source to **"GitHub Actions"**
3. Set Workflow permissions to **"Read and write"** (Settings → Actions → General)

### Deploy Methods:

| Method | Steps | When to Use |
|--------|-------|-------------|
| **Auto Deploy** | Push to `staging` or `develop` branch | Regular updates |
| **Manual Deploy** | Actions → Deploy Staging → Run workflow | On-demand testing |
| **PR Preview** | Create PR to staging/develop | Feature testing |

**Staging URL:** `https://[your-username].github.io/oldeden/`

---

## 📚 Documentation Files

| File | Purpose | Read When... |
|------|---------|--------------|
| **QUICKSTART.md** | Instant start guide | You want to run it NOW |
| **DEPLOYMENT.md** | Full deployment guide | Setting up staging/production |
| **EXAMPLES.md** | 10 step-by-step scenarios | Learning workflows |
| **TROUBLESHOOTING.md** | Common issues & fixes | Something doesn't work |
| **README.md** | Project overview | Understanding the game |

---

## ⚙️ Configuration

### Environment File (.env)

```env
PORT=3000                    # Server port
NODE_ENV=development         # Environment
MONGODB_URI=...             # Optional for testing
REDIS_URL=...               # Optional for testing
```

**Note:** MongoDB and Redis are **optional** for basic local testing!

---

## 🔧 Common Commands

```bash
npm install        # Install dependencies
npm start          # Start server
npm run dev        # Start with auto-reload
npm test           # Run tests
npm run lint       # Check code style
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Node.js not installed" | Download from https://nodejs.org/ |
| "npm not recognized" | Restart computer after Node.js install |
| Port 3000 in use | Change `PORT=3000` to `PORT=8080` in `.env` |
| Permission denied | Run `chmod +x start.sh` |
| GitHub Pages 404 | Settings → Pages → Source: "GitHub Actions" |
| Staging not deploying | Settings → Actions → Permissions: "Read and write" |

---

## 📋 Requirements

- **Node.js:** 20.0.0 or higher
- **Disk Space:** ~500 MB
- **Internet:** Required for first-time setup
- **Browser:** Chrome, Firefox, Edge, Safari

---

## 🎯 Recommended Workflow

1. **Local Development:**
   - Use `start.bat` or `start.sh` for testing
   - Use `npm run dev` for active development

2. **Staging Testing:**
   - Push to `develop` branch
   - Test at staging URL
   - Share with team

3. **Production Release:**
   - Merge to `main` branch
   - Deploy to production server
   - Monitor logs

---

## 🔗 Important URLs

- **Local:** http://localhost:3000
- **Staging:** https://[username].github.io/oldeden/
- **Build Info:** https://[username].github.io/oldeden/build-info.json
- **Node.js:** https://nodejs.org/
- **Repository:** https://github.com/lindapot-art/oldeden

---

## 💡 Pro Tips

- **First Run:** Takes 2-3 minutes to install dependencies
- **Subsequent Runs:** Start instantly (2-3 seconds)
- **Auto-Reload:** Use `npm run dev` when developing
- **Staging:** Perfect for testing with non-technical users
- **Private:** Staging works even with private repositories!

---

**Need more help?** See the documentation files above! ⬆️
