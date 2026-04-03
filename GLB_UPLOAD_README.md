# GLB Asset Management Scripts

These scripts solve the GitHub 25MB file size limit by setting up Git LFS (Large File Storage).

## One-Time Setup

Run this once to configure your glbs repository:

```bash
./setup-glbs-lfs.sh
```

This will:
- Install Git LFS if needed
- Clone/update your glbs repository
- Configure it to handle large files (no more 25MB errors!)

## Upload Files

After setup, upload GLB files anytime:

```bash
# Upload all GLB files from a directory
./upload-glbs.sh /path/to/your/models/*.glb

# Upload specific files
./upload-glbs.sh model1.glb model2.glb model3.glb
```

## Manual Method

If you prefer doing it manually:

```bash
cd ~/glbs-repo
cp /path/to/your/*.glb .
git add *.glb
git commit -m "Add assets"
git push
```

Git LFS handles the large files automatically - no more file size errors!

## Troubleshooting

### "git-lfs not found"
- **macOS**: `brew install git-lfs`
- **Ubuntu/Debian**: `sudo apt-get install git-lfs`
- **Windows**: Download from https://git-lfs.github.com/

### "Authentication failed"
Make sure you're logged into GitHub:
```bash
gh auth login
```
or use SSH keys instead of HTTPS.

### Files still too large?
Make sure Git LFS is tracking your files:
```bash
cd ~/glbs-repo
git lfs track "*.glb"
git add .gitattributes
git commit -m "Track GLB with LFS"
```
