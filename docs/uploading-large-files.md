# Uploading Large GLB Files to Old Eden

## The Problem

GitHub has a 25MB file size limit for files uploaded through the web interface. Large 3D models (GLB, GLTF, FBX) often exceed this limit.

## The Solution: Git LFS

This repository is configured to use **Git Large File Storage (LFS)** to handle large files automatically.

## Quick Start

### Option 1: Upload via GitHub Web UI (Easiest)

1. Go to https://github.com/lindapot-art/oldeden/tree/main/public/3d/glb
2. Click "Add file" → "Upload files"
3. Drag and drop your `.glb` files
4. Commit the changes

**Git LFS handles the upload automatically** - no 25MB errors!

### Option 2: Upload via Git CLI

```bash
# 1. Make sure Git LFS is installed
git lfs install

# 2. Clone the repository (if you haven't already)
git clone https://github.com/lindapot-art/oldeden.git
cd oldeden

# 3. Copy your GLB files to the appropriate directory
cp /path/to/your/models/*.glb public/3d/glb/

# 4. Add and commit the files
git add public/3d/glb/*.glb
git commit -m "Add 3D model files"

# 5. Push to GitHub
git push origin main
```

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

This error means Git LFS is not tracking your file. Make sure:

1. Git LFS is installed: `git lfs install`
2. The file extension is tracked in `.gitattributes`:
   ```
   *.glb filter=lfs diff=lfs merge=lfs -text
   *.gltf filter=lfs diff=lfs merge=lfs -text
   *.fbx filter=lfs diff=lfs merge=lfs -text
   ```
3. Add the file again: `git add yourfile.glb`

### "Or No file chosenYowza, that's a big file..."

This concatenated error message indicates a UI issue with the file upload form. It should show:
- "No file chosen" (when no file is selected)
- "Yowza, that's a big file. Try again with a file smaller than 25MB." (when file is too large)

**Solutions:**
1. Use Git LFS (see above) - this bypasses the 25MB GitHub web UI limit
2. Use the Git CLI instead of the web interface
3. Optimize the model using the ML service before uploading

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

## Automated Workflow

For bulk uploads, you can use the provided scripts:

```bash
# Upload all GLB files from a directory
./upload-glbs.sh /path/to/your/models/*.glb

# Or manually
cd ~/glbs-repo
cp /path/to/your/*.glb .
git add *.glb
git commit -m "Add 3D assets"
git push
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

- **Use Git LFS** for files over 25MB (already configured in this repo)
- **Server limit**: 150 MB default, configurable up to 500 MB+
- **Optimize large files** using the ML service before uploading
- **Generate LODs** for better game performance
- **Check `.gitattributes`** to verify LFS tracking

For questions, see the [main README](../README.md) or open an issue.
