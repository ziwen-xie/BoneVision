# 3D Models

The foot skeleton is **generated procedurally in code**, not loaded from this directory.
See `src/models/footSkeleton.ts`.

## Why procedural

- Synchronized highlighting needs 19 separately addressable meshes with exact names
  matching the `meshId` values in `public/config/foot-mapping.json`. Freely available
  anatomical models are usually merged into one or two meshes.
- The geometry is original work, so there is no third-party IP or licensing to clear.
- The whole model is ~17.5k triangles with no asset to download at runtime.

## If a future body part uses a GLB

Drop the file here and follow these rules:

- Format: GLB (binary GLTF), Draco compressed
- One named mesh per bone, matching `meshId` in that body part's mapping config
- Materials must accept standard PBR properties (the highlight code writes `emissive`)
- Target under 100k triangles total, under 10k per bone
- Model centered at the origin
- Verify licensing permits educational use, and record the source here
