# GLB Asset Management Scripts

These scripts solve the GitHub 25MB **web UI** file size limit by using Git CLI with Git LFS (Large File Storage).

**Important:** GitHub's web upload interface at https://github.com/lindapot-art/glbs/upload has a hard 25MB limit that cannot be bypassed. Files larger than 25MB must be uploaded using Git CLI.

## One-Time Setup

Run this once to configure your glbs repository:

```bash
./setup-glbs-lfs.sh
```

This will:
- Install Git LFS if needed
- Clone the `lindapot-art/glbs` repository to `~/glbs-repo`
- Configure it to track large files with Git LFS (bypassing the 25MB web UI limit!)

## Upload Files

After setup, upload GLB files anytime:

```bash
# Upload all GLB files from a directory
./upload-glbs.sh /path/to/your/models/*.glb

# Upload specific files
./upload-glbs.sh model1.glb model2.glb model3.glb
```

The script will copy files to the repository, commit them, and push to GitHub. Git LFS handles large files automatically.

## Manual Method

If you prefer doing it manually:

```bash
cd ~/glbs-repo
cp /path/to/your/*.glb .
git add *.glb
git commit -m "Add assets"
git push origin main
```

Git LFS handles the large files automatically - no more 25MB web UI errors!

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
Double-check that Git LFS is tracking your files:
```bash
cd ~/glbs-repo
git lfs track "*.glb"
git lfs track "*.gltf"
git lfs track "*.fbx"
git add .gitattributes
git commit -m "Track 3D assets with LFS"
git push origin main
```

### Can't upload via GitHub web UI?
**This is expected!** GitHub's web interface at https://github.com/lindapot-art/glbs/upload has a hard 25MB limit. You **must** use Git CLI (the scripts above) to upload files larger than 25MB.
