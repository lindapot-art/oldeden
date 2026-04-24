"""Convert FBX to GLB using trimesh, with texture embedding."""
import sys
import os
import struct
import json
import base64
from pathlib import Path

try:
    from PIL import Image
    import io
except ImportError:
    print("ERROR: Pillow not installed")
    sys.exit(1)

try:
    import trimesh
except ImportError:
    print("ERROR: trimesh not installed")
    sys.exit(1)

FBX_PATH = r"d:\antiruscist\oldeden\glbs\space shuttle cockpit 3d model\space+shuttle+cockpit+3d+model.fbx"
TEXTURE_PATH = r"d:\antiruscist\oldeden\glbs\space shuttle cockpit 3d model\space+shuttle+cockpit+3d+model_basecolor.jpg"
OUTPUT_GLB = r"d:\antiruscist\oldeden\public\3d\glb\cockpit_shuttle.glb"
OUTPUT_OPT = r"d:\antiruscist\oldeden\public\3d\glb\optimized\cockpit_shuttle.glb"

def load_and_convert():
    print(f"Loading FBX: {FBX_PATH}")
    print(f"Texture: {TEXTURE_PATH}")
    
    # Try loading with trimesh
    try:
        scene = trimesh.load(FBX_PATH, force='scene')
        print(f"Loaded as scene with {len(scene.geometry)} geometries")
    except Exception as e:
        print(f"Scene load failed: {e}")
        try:
            mesh = trimesh.load(FBX_PATH, force='mesh')
            scene = trimesh.Scene(geometry={'cockpit': mesh})
            print(f"Loaded as mesh: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
        except Exception as e2:
            print(f"Mesh load also failed: {e2}")
            print("trimesh cannot parse this FBX. Trying manual GLB construction...")
            return manual_glb_from_fbx()
    
    # Apply texture if we have geometry
    if os.path.exists(TEXTURE_PATH):
        print("Applying basecolor texture...")
        img = Image.open(TEXTURE_PATH)
        print(f"  Texture size: {img.size}")
        
        for name, geom in scene.geometry.items():
            if hasattr(geom, 'visual'):
                try:
                    # Create a PBR material with the texture
                    material = trimesh.visual.material.PBRMaterial(
                        baseColorTexture=img,
                        metallicFactor=0.0,
                        roughnessFactor=0.8
                    )
                    if hasattr(geom.visual, 'uv') and geom.visual.uv is not None:
                        geom.visual = trimesh.visual.TextureVisuals(
                            uv=geom.visual.uv,
                            material=material
                        )
                        print(f"  Applied texture to '{name}' with {len(geom.visual.uv)} UV coords")
                    else:
                        print(f"  '{name}' has no UVs, texture not applied")
                except Exception as tex_err:
                    print(f"  Texture apply error for '{name}': {tex_err}")
    
    # Export as GLB
    print(f"\nExporting to: {OUTPUT_GLB}")
    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
    glb_data = scene.export(file_type='glb')
    with open(OUTPUT_GLB, 'wb') as f:
        f.write(glb_data)
    size_mb = os.path.getsize(OUTPUT_GLB) / (1024 * 1024)
    print(f"  Written: {size_mb:.2f} MB")
    
    # Export optimized version (smaller texture)
    print(f"\nCreating optimized version: {OUTPUT_OPT}")
    os.makedirs(os.path.dirname(OUTPUT_OPT), exist_ok=True)
    
    if os.path.exists(TEXTURE_PATH):
        # Resize texture for optimized version
        img_opt = Image.open(TEXTURE_PATH)
        max_dim = 1024
        if max(img_opt.size) > max_dim:
            ratio = max_dim / max(img_opt.size)
            new_size = (int(img_opt.size[0] * ratio), int(img_opt.size[1] * ratio))
            img_opt = img_opt.resize(new_size, Image.LANCZOS)
            print(f"  Resized texture to {new_size}")
        
        for name, geom in scene.geometry.items():
            if hasattr(geom, 'visual') and hasattr(geom.visual, 'material'):
                try:
                    material = trimesh.visual.material.PBRMaterial(
                        baseColorTexture=img_opt,
                        metallicFactor=0.0,
                        roughnessFactor=0.8
                    )
                    if hasattr(geom.visual, 'uv') and geom.visual.uv is not None:
                        geom.visual = trimesh.visual.TextureVisuals(
                            uv=geom.visual.uv,
                            material=material
                        )
                except:
                    pass
    
    glb_opt_data = scene.export(file_type='glb')
    with open(OUTPUT_OPT, 'wb') as f:
        f.write(glb_opt_data)
    size_opt_mb = os.path.getsize(OUTPUT_OPT) / (1024 * 1024)
    print(f"  Written: {size_opt_mb:.2f} MB")
    
    return True


def manual_glb_from_fbx():
    """Fallback: try to read FBX binary and construct GLB manually - unlikely to work for complex FBX."""
    print("Manual GLB construction not implemented for complex FBX files.")
    print("Please install Blender or use an online converter.")
    return False


if __name__ == '__main__':
    success = load_and_convert()
    if success:
        print("\n=== CONVERSION COMPLETE ===")
        if os.path.exists(OUTPUT_GLB):
            print(f"  Regular: {OUTPUT_GLB} ({os.path.getsize(OUTPUT_GLB) / (1024*1024):.2f} MB)")
        if os.path.exists(OUTPUT_OPT):
            print(f"  Optimized: {OUTPUT_OPT} ({os.path.getsize(OUTPUT_OPT) / (1024*1024):.2f} MB)")
    else:
        print("\n=== CONVERSION FAILED ===")
        sys.exit(1)
