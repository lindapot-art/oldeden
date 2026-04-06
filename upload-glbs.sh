#!/bin/bash

# Quick upload script for GLB files to glbs repository
# Usage: ./upload-glbs.sh /path/to/your/glb/files/*.glb

set -e

GLBS_DIR="$HOME/glbs-repo"

if [ ! -d "$GLBS_DIR" ]; then
    echo "❌ glbs repository not found!"
    echo "Run ./setup-glbs-lfs.sh first"
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "Usage: $0 <glb-files>"
    echo "Example: $0 /path/to/models/*.glb"
    echo "Example: $0 model1.glb model2.glb"
    exit 1
fi

cd "$GLBS_DIR"

echo "📦 Copying files to glbs repository..."
cp "$@" .

echo "📝 Adding files to git..."
git add *.glb *.gltf *.fbx 2>/dev/null || true

if git diff --staged --quiet; then
    echo "✅ No new files to commit"
else
    FILE_COUNT=$(git diff --staged --name-only | wc -l)
    echo "💾 Committing $FILE_COUNT file(s)..."
    git commit -m "Add GLB assets: $(date +%Y-%m-%d)"
    
    echo "🚀 Pushing to GitHub (this may take a while for large files)..."
    git push origin main
    
    echo "✅ Upload complete!"
fi

echo ""
echo "🌐 View your files at: https://github.com/lindapot-art/glbs"
