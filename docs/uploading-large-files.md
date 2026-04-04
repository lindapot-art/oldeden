# Uploading Large GLB Files to Old Eden

## The Problem

GitHub has a **hard 25MB file size limit** for files uploaded through the web interface (https://github.com/lindapot-art/glbs/upload). This limit **cannot be bypassed**, even with Git LFS configured. Large 3D models (GLB, GLTF, FBX) often exceed this limit.

## The Solution: Git CLI with Git LFS

To upload files larger than 25MB, you **must use the Git command-line interface (CLI)**. The GitHub web UI cannot handle large files, even with Git LFS enabled.

## Quick Start

### ⚠️ GitHub Web UI (Only for files < 25MB)

**WARNING:** This method only works for files smaller than 25MB. For larger files, use Option 2 below.

1. Go to https://github.com/lindapot-art/glbs/upload
2. Click "Add file" → "Upload files"
3. Drag and drop your `.glb` files (must be < 25MB)
4. Commit the changes

**If you get a "file too large" error, you must use the Git CLI method below.**

### ✅ Git CLI Method (Required for files > 25MB)

This is the **only way** to upload files larger than 25MB to GitHub.

#### First-Time Setup

```bash
# 1. Make sure Git LFS is installed
git lfs install

# 2. Clone the glbs repository
git clone https://github.com/lindapot-art/glbs.git
cd glbs

# 3. Verify Git LFS is tracking large files
cat .gitattributes
# Should show: *.glb filter=lfs diff=lfs merge=lfs -text
```

#### Upload Files

```bash
# 1. Copy your GLB files to the repository
cp /path/to/your/models/*.glb .

# 2. Add and commit the files
git add *.glb
git commit -m "Add 3D model files"

# 3. Push to GitHub (Git LFS handles the upload automatically)
git push origin main
```

**Git LFS will upload large files to GitHub's LFS storage, bypassing the 25MB web UI limit.**

## Installing Git LFS

If you don't have Git LFS installed:

### macOS
```bash
brew install git-lfs
git lfs install
```

### Ubuntu/Debian
```bash
sudo apt-get install git-lfs
git lfs install
```

### Windows
Download from https://git-lfs.github.com/ or use:
```bash
choco install git-lfs
git lfs install
```

## File Upload Limits

### Web Application Upload Limits

The Old Eden server has the following upload limits:

- **Default**: 150 MB (157,286,400 bytes)
- **Maximum GLB inspection**: 500 MB (500,000,000 bytes)
- **Configurable via**: `MAX_UPLOAD_SIZE` environment variable

To increase the limit:

```bash
# In your .env file
MAX_UPLOAD_SIZE=524288000  # 500 MB
```

### Git LFS Limits

Git LFS handles files of any size, but there are practical limits:

- **GitHub Free**: 1 GB storage, 1 GB bandwidth/month
- **GitHub Pro**: 2 GB storage, 2 GB bandwidth/month
- **GitHub Team/Enterprise**: More storage available

For very large files (>100MB), consider:
1. Using the ML service to optimize/compress the model first
2. Generating LOD (Level of Detail) variants
3. Removing unused textures or materials

## Using the ML Service to Optimize Large Files

If you have a large GLB file that you want to upload, you can use the ML service to optimize it first:

```javascript
import { GlbMLProcessor } from './src/ai/GlbMLProcessor.js';

const processor = new GlbMLProcessor();

// Optimize a large model
const result = await processor.optimizeModel('/path/to/large-model.glb', {
  targetPolyCount: 50000,  // Reduce to 50k polygons
  qualityThreshold: 0.95   // Maintain 95% visual quality
});

console.log(`Reduced from ${result.originalPolyCount} to ${result.optimizedPolyCount} polygons`);
console.log(`File saved to: ${result.outputPath}`);
```

Or generate LOD variants:

```javascript
// Generate multiple quality levels
const lods = await processor.generateLODs('/path/to/model.glb', {
  lodLevels: [0.5, 0.25, 0.1]  // 50%, 25%, 10% of original
});

// Upload the LOD variants instead of the original
```

## Troubleshooting

### "This exceeds GitHub's file size limit of 25.00 MB"

This error appears when trying to upload large files via the **GitHub web UI** at https://github.com/lindapot-art/glbs/upload.

**Solutions:**

1. **Use the Git CLI method above** (the only way to upload files > 25MB)
2. If using Git CLI and still seeing this error:
   - Make sure Git LFS is installed: `git lfs install`
   - Verify the file extension is tracked in `.gitattributes`:
     ```bash
     cat .gitattributes
     # Should show:
     # *.glb filter=lfs diff=lfs merge=lfs -text
     # *.gltf filter=lfs diff=lfs merge=lfs -text
     # *.fbx filter=lfs diff=lfs merge=lfs -text
     ```
   - If not tracked, add tracking: `git lfs track "*.glb"`
   - Commit .gitattributes: `git add .gitattributes && git commit -m "Track GLB with LFS"`
   - Add the file again: `git add yourfile.glb`

### "Yowza, that's a big file. Try again with a file smaller than 25MB."

This error appears on the GitHub web UI at https://github.com/lindapot-art/glbs/upload when you try to upload a file larger than 25MB.

**This is a hard GitHub limit that cannot be bypassed via the web interface.**

**Solutions:**
1. **Use the Git CLI method** (see above) - this is the only way to upload files > 25MB
2. **OR** Optimize the model using the ML service to reduce file size below 25MB:
   ```javascript
   import { GlbMLProcessor } from './src/ai/GlbMLProcessor.js';
   const processor = new GlbMLProcessor();
   const result = await processor.optimizeModel('/path/to/large-model.glb', {
     targetPolyCount: 50000,
     qualityThreshold: 0.95
   });
   ```

### "Error: File too large. Maximum size is 157286400 bytes."

This is the server-side upload limit (150 MB default). To increase:

1. Update `.env`:
   ```env
   MAX_UPLOAD_SIZE=524288000  # 500 MB
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

### Checking Git LFS Status

To see which files are tracked by LFS:

```bash
git lfs ls-files
```

To see LFS tracking rules:

```bash
cat .gitattributes
```

## Best Practices

1. **Optimize before uploading**: Use the ML service to reduce file size while maintaining quality
2. **Generate LODs**: Create multiple detail levels for better performance
3. **Remove unused data**: Clean up unused textures, materials, animations
4. **Use GLB over GLTF**: GLB is a binary format and typically smaller
5. **Compress textures**: Use compressed texture formats (KTX2, Basis)

## File Naming Conventions

When uploading GLB files, use descriptive names:

- ✅ Good: `vanguard-fighter-low-poly.glb`
- ✅ Good: `space-station-module-01.glb`
- ❌ Bad: `model.glb`
- ❌ Bad: `untitled-1.glb`

## Automated Upload Scripts

For easier uploads, we provide helper scripts:

### First-Time Setup Script

```bash
./setup-glbs-lfs.sh
```

This will:
- Install Git LFS if needed
- Clone the `lindapot-art/glbs` repository to `~/glbs-repo`
- Configure Git LFS to track large files automatically

### Quick Upload Script

After setup, upload files anytime:

```bash
# Upload all GLB files from a directory
./upload-glbs.sh /path/to/your/models/*.glb

# Upload specific files
./upload-glbs.sh model1.glb model2.glb model3.glb
```

This script will:
1. Copy files to the glbs repository
2. Add and commit them
3. Push to GitHub (Git LFS handles large files automatically)

### Manual Upload (Without Scripts)

```bash
cd ~/glbs-repo
cp /path/to/your/*.glb .
git add *.glb
git commit -m "Add 3D assets"
git push origin main
```

## API Upload Example

To upload via the REST API:

```javascript
const formData = new FormData();
formData.append('models', fileInput.files[0]);

const response = await fetch('/api/assets/models', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Uploaded:', result.uploaded);
```

## Summary

**Key Points:**
- **GitHub web UI** (https://github.com/lindapot-art/glbs/upload) has a **hard 25MB limit**
- Files > 25MB **must be uploaded via Git CLI** with Git LFS
- Use the provided scripts (`setup-glbs-lfs.sh` and `upload-glbs.sh`) for easier uploads
- **Server limit** for Old Eden app: 150 MB default, configurable up to 500 MB+
- **Optimize large files** using the ML service before uploading
- **Generate LODs** for better game performance

**Quick Reference:**
```bash
# One-time setup
./setup-glbs-lfs.sh

# Upload files
./upload-glbs.sh /path/to/*.glb
```

For questions, see the [GLB Upload README](../GLB_UPLOAD_README.md) or open an issue.
