#!/bin/bash

# Automated Git LFS setup script for glbs repository
# This solves the 25MB file size limit issue

set -e

GLBS_REPO_URL="https://github.com/lindapot-art/glbs.git"
GLBS_DIR="$HOME/glbs-repo"

echo "🚀 Setting up Git LFS for your glbs repository..."
echo ""

# Check if git-lfs is installed
if ! command -v git-lfs &> /dev/null; then
    echo "📦 Installing Git LFS..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y git-lfs
        elif command -v yum &> /dev/null; then
            sudo yum install -y git-lfs
        elif command -v brew &> /dev/null; then
            brew install git-lfs
        else
            echo "❌ Please install git-lfs manually: https://git-lfs.github.com/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install git-lfs
        else
            echo "❌ Please install Homebrew first, then run: brew install git-lfs"
            exit 1
        fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "❌ On Windows, download Git LFS from: https://git-lfs.github.com/"
        exit 1
    fi
    
    git lfs install
    echo "✅ Git LFS installed!"
else
    echo "✅ Git LFS already installed"
    git lfs install
fi

echo ""
echo "📂 Setting up glbs repository..."

# Clone or update the repository
if [ -d "$GLBS_DIR" ]; then
    echo "Directory exists, updating..."
    cd "$GLBS_DIR"
    git pull
else
    echo "Cloning repository..."
    git clone "$GLBS_REPO_URL" "$GLBS_DIR"
    cd "$GLBS_DIR"
fi

# Configure Git LFS to track large files
echo ""
echo "🔧 Configuring Git LFS to track .glb, .gltf, and .fbx files..."

git lfs track "*.glb"
git lfs track "*.gltf"
git lfs track "*.fbx"
git lfs track "*.bin"
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.jpeg"

# Ensure .gitattributes is committed
if [ -f ".gitattributes" ]; then
    git add .gitattributes
    if git diff --staged --quiet; then
        echo "✅ .gitattributes already configured"
    else
        git commit -m "Configure Git LFS for large asset files"
        git push
        echo "✅ Git LFS configuration committed"
    fi
else
    echo "⚠️  No .gitattributes file found - creating one"
    git add .gitattributes
    git commit -m "Configure Git LFS for large asset files"
    git push
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy your .glb files to: $GLBS_DIR"
echo "   2. Run these commands:"
echo ""
echo "      cd $GLBS_DIR"
echo "      git add *.glb"
echo "      git commit -m \"Add GLB assets\""
echo "      git push"
echo ""
echo "💡 Git LFS will now handle files over 25MB automatically!"
echo ""
