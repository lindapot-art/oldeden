# 3D Model Files (GLB)

This directory contains 3D model files in GLB format for the Old Eden project.

## Current Files

- `Meshy_AI_Iron_Sentinel_0403042612_texture.glb` - Iron Sentinel model (to be added)

## Adding GLB Files

### Option 1: Via GitHub Web UI

1. Navigate to this folder on GitHub: `https://github.com/lindapot-art/oldeden/tree/main/public/3d/glb`
2. Click the "Add file" button
3. Choose "Upload files"
4. Drag and drop your `.glb` files or click "choose your files"
5. Add a commit message (e.g., "Add 3D model files from photon-bounce.com")
6. Click "Commit changes"

### Option 2: Via Git CLI

```bash
# Navigate to your local repository
cd /path/to/oldeden

# Copy your GLB files to this directory
cp /path/to/your/files/*.glb public/3d/glb/

# Add the files to git
git add public/3d/glb/*.glb

# Commit the changes
git commit -m "Add 3D model files from photon-bounce.com"

# Push to GitHub
git push origin main
```

## Note on Git LFS

This repository is configured to use Git Large File Storage (LFS) for `.glb` files. 
This means:
- Large binary files won't bloat the repository history
- Files are stored efficiently on GitHub
- Git LFS must be installed locally if you're using Git CLI

If you don't have Git LFS installed:
```bash
# Install Git LFS (varies by OS)
# For Ubuntu/Debian:
sudo apt-get install git-lfs

# For macOS:
brew install git-lfs

# Initialize in your repository
git lfs install
```

## Source

Files from: `http://photon-bounce.com/ne/3d/glb/`
