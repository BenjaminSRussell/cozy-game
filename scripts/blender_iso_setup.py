import bpy
import math
import os

# ==============================================================================
# COZY HAVEN - ISOMETRIC RENDER SCRIPT
# ==============================================================================
# Usage:
# 1. Open your model in Blender.
# 2. Go to Scripting tab, Open this file, and Run Script.
# ==============================================================================

# --- SETTINGS ---
OUTPUT_DIR = "//renders/"  # Relative to blend file
RESOLUTION_X = 256
RESOLUTION_Y = 256
RENDER_DIRECTIONS = 8  # 1, 4, or 8
CAMERA_SCALE = 10.0    # Orthographic scale covers roughly 10m
ISO_ANGLE_X = 60.0     # 60 degrees for 2:1 pixel art ratio

def setup_render_settings():
    """Configures Eevee/Cycles settings for clean sprite rendering"""
    scene = bpy.context.scene
    scene.render.resolution_x = RESOLUTION_X
    scene.render.resolution_y = RESOLUTION_Y
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    print("Render settings configured.")

def setup_camera():
    """Creates/Updates the Isometric Camera Rig"""
    # 1. Create Center Pivot (what we rotate)
    if "CameraPivot" not in bpy.data.objects:
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
        pivot = bpy.context.active_object
        pivot.name = "CameraPivot"
    else:
        pivot = bpy.data.objects["CameraPivot"]

    # 2. Create Camera
    if "IsoCamera" not in bpy.data.objects:
        bpy.ops.object.camera_add()
        cam = bpy.context.active_object
        cam.name = "IsoCamera"
    else:
        cam = bpy.data.objects["IsoCamera"]

    # 3. Setup Camera Data
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = CAMERA_SCALE
    
    # 4. Position Camera properly for Isometric View
    # Parent camera to pivot to rotate it easily
    if cam.parent != pivot:
        cam.parent = pivot
    
    # Position: Back -20m, Up 20m (Arbitrary, Ortho ignores distance)
    # Rotation: X=60 (for 2:1 look), Y=0, Z=0 (relative to pivot)
    cam.location = (0, -20, 20)
    cam.rotation_euler = (math.radians(ISO_ANGLE_X), 0, 0)
    
    # Set as active
    bpy.context.scene.camera = cam
    return pivot

def render_directions(pivot):
    """Rotates the camera pivot and renders frames"""
    output_path = bpy.path.abspath(OUTPUT_DIR)
    if not os.path.exists(output_path):
        os.makedirs(output_path)
        
    angle_step = 360 / RENDER_DIRECTIONS
    dirs = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"] if RENDER_DIRECTIONS == 8 else ["S", "E", "N", "W"]
    
    print(f"Starting batch render for {RENDER_DIRECTIONS} directions...")
    
    for i in range(RENDER_DIRECTIONS):
        # Rotate Pivot (Z-axis)
        # Note: We rotate the pivot (and thus camera) around the object
        # Angle 0 = Camera at South?
        # Blender Default: -Y is Front. Camera at (0,-20,20) looks +Y (North).
        # So Frame 0 is seeing the "Front" (South Face) of the object. -> "SE"? 
        # Isometric naming conventions vary. Let's assume standard compass.
        # Camera at (0, -Y) looking +Y is looking NORTH. So we see the SOUTH face.
        
        # We rotate the pivot (+Z rotation = Counter Clockwise).
        # If pivot rotates +45, Camera moves right... looking at South-West face?
        
        angle = i * angle_step
        pivot.rotation_euler[2] = math.radians(angle)
        
        # Update Scene
        bpy.context.view_layer.update()
        
        dir_name = dirs[i % len(dirs)]
        filename = f"render_{dir_name}.png"
        
        bpy.context.scene.render.filepath = os.path.join(output_path, filename)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered [{dir_name}] at angle {angle}")

    # Reset
    pivot.rotation_euler[2] = 0
    print("Batch render complete!")

if __name__ == "__main__":
    setup_render_settings()
    pivot = setup_camera()
    render_directions(pivot)
