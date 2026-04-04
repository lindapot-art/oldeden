#!/bin/bash
# GLB Optimization Script for Old Eden
# Optimizes large GLB files using gltf-transform for game-ready usage

set -e

GLBS_DIR="/home/runner/work/oldeden/oldeden/glbs"
OPTIMIZED_DIR="/home/runner/work/oldeden/oldeden/public/models"
mkdir -p "$OPTIMIZED_DIR"

echo "🔧 Old Eden GLB Optimizer"
echo "========================="
echo ""

# Function to optimize a single GLB file
optimize_glb() {
    local input_file="$1"
    local output_name="$2"
    local output_file="$OPTIMIZED_DIR/${output_name}.glb"
    
    echo "Processing: $(basename "$input_file")"
    local size_before=$(du -h "$input_file" | cut -f1)
    echo "  Size before: $size_before"
    
    # Use gltf-transform to optimize
    # - draco: Compress geometry
    # - dedup: Remove duplicate data
    # - prune: Remove unused resources
    # - quantize: Reduce precision (14 bits for positions, 12 for normals/UVs)
    # - weld: Merge duplicate vertices
    # - simplify: Reduce polygon count (target 50% reduction for large meshes)
    npx gltf-transform optimize "$input_file" "$output_file" \
        --compress draco \
        --vertex-layout interleaved \
        --simplify-ratio 0.5 \
        --simplify-error 0.001 2>/dev/null || {
        
        # Fallback if simplify fails - just basic optimization
        echo "  (Simplify failed, using basic optimization)"
        npx gltf-transform optimize "$input_file" "$output_file" \
            --compress draco \
            --vertex-layout interleaved 2>/dev/null
    }
    
    local size_after=$(du -h "$output_file" | cut -f1)
    echo "  Size after:  $size_after"
    echo "  Output: $output_name.glb"
    echo ""
}

echo "Identifying and organizing GLB files..."
echo ""

# Railgun weapons
if [ -f "$GLBS_DIR/Meshy_AI_massive_raildgun_with_0403042757_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_raildgun_with_0403042757_texture.glb" "railgun_weapon"
fi

if [ -f "$GLBS_DIR/Meshy_AI_massive_raildgun_part_0403043159_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_raildgun_part_0403043159_texture.glb" "railgun_heavy"
fi

# Space stations (for Garrisons habitat)
if [ -f "$GLBS_DIR/Meshy_AI_massive_cyborg_spaces_0403072909_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_cyborg_spaces_0403072909_texture.glb" "garrisons_habitat"
fi

if [ -f "$GLBS_DIR/Meshy_AI_massive_spacestation__0403071656_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_spacestation__0403071656_texture.glb" "spacestation_01"
fi

if [ -f "$GLBS_DIR/Meshy_AI_massive_spacestation__0403072424_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_spacestation__0403072424_texture.glb" "spacestation_02"
fi

# Spaceships (Garrisons fleet)
if [ -f "$GLBS_DIR/Meshy_AI_Iron_Sentinel_0403042612_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_Iron_Sentinel_0403042612_texture.glb" "ship_sentinel"
fi

# Check for duplicate
if [ -f "$GLBS_DIR/Meshy_AI_Iron_Sentinel_0403042612_texture (1).glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_Iron_Sentinel_0403042612_texture (1).glb" "ship_sentinel_variant"
fi

if [ -f "$GLBS_DIR/Meshy_AI_spaceship_titan_clas_0403042537_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_spaceship_titan_clas_0403042537_texture.glb" "ship_titan"
fi

if [ -f "$GLBS_DIR/Meshy_AI_spaceship_titan_clas_0403042822_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_spaceship_titan_clas_0403042822_texture.glb" "ship_titan_variant"
fi

# Freighter/cargo ships
if [ -f "$GLBS_DIR/Meshy_AI_massive_freigh_spaces_0403072955_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_massive_freigh_spaces_0403072955_texture.glb" "ship_freighter"
fi

# Emergency/escape pods
if [ -f "$GLBS_DIR/Meshy_AI_emergency_evacuation__0403073458_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_emergency_evacuation__0403073458_texture.glb" "pod_evacuation_01"
fi

if [ -f "$GLBS_DIR/Meshy_AI_emergency_evacuation__0403074419_texture.glb" ]; then
    optimize_glb "$GLBS_DIR/Meshy_AI_emergency_evacuation__0403074419_texture.glb" "pod_evacuation_02"
fi

echo "✅ GLB optimization complete!"
echo ""
echo "Optimized models saved to: $OPTIMIZED_DIR"
echo ""
echo "Model Mapping:"
echo "  - garrisons_habitat.glb    → Garrisons space station (cyborg design)"
echo "  - ship_sentinel.glb        → Iron Sentinel class (Garrisons fighter)"
echo "  - ship_titan.glb           → Titan class (Garrisons heavy cruiser)"
echo "  - ship_freighter.glb       → Freighter class (cargo vessel)"
echo "  - railgun_weapon.glb       → Ship-mounted railgun"
echo "  - spacestation_01/02.glb   → Generic space stations"
echo "  - pod_evacuation_01/02.glb → Escape pods"
echo ""
