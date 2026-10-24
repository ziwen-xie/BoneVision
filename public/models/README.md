# 3D Models

The foot skeleton is **generated procedurally in code**, not loaded from this directory.
See `src/models/footSkeleton.ts`.

## Why procedural

- Synchronized highlighting needs 19 separately addressable meshes with exact names
  matching the `meshId` values in `public/config/foot-mapping.json`. Freely available
  anatomical models are usually merged into one or two meshes.
- The geometry is original work, so there is no third-party IP or licensing to clear.
- The whole model is ~17.5k triangles with no asset to download at runtime.

## Body-level navigation is 2D, not 3D

The body region picker (`src/components/BodyRegionPicker.tsx`, geometry in
`src/models/bodySilhouette.ts`) is a flat, inline SVG silhouette. There is no whole-body
skeleton mesh, by choice.

Its job is region selection - "which part of the body is this X-ray of?" - not teaching
anatomy. Nobody learns from a navigation affordance, so a whole-body model would buy
nothing the silhouette does not already deliver while costing a large asset download
before the user has selected anything, plus a licence to clear and per-bone mesh naming to
maintain. Detailed anatomy belongs in the viewer, where a single body part is already
loaded and the geometry is actually being studied.

The silhouette's shape fidelity is deliberately loose. Regions only have to be
unambiguous and comfortably clickable; the only region that currently loads anything is
the foot, so the picker's real work is showing honestly how much of the body is mapped.

## Source identified for future per-bone geometry

If real whole-body or per-bone geometry is ever needed, use **BodyParts3D** from the
Database Center for Life Science (DBCLS).

- Adult male whole-body reference, segmented per anatomical structure, with structures
  cross-referenced to FMA (Foundational Model of Anatomy) concept IDs. The FMA mapping is
  the reason to prefer it: it gives a stable vocabulary to match `meshId` values against
  instead of hand-naming meshes.
- **Licence: CC BY 4.0**, confirmed at
  <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>.
- **Watch out:** the comment headers inside the distributed OBJ files still carry legacy
  "CC BY-SA 2.1 Japan" text. The current official licence page supersedes it. This trips
  people up regularly - check the licence page, not the file headers.
- Required attribution, verbatim:

  > BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0
  > International

- Archives, from <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>:
  - `isa_BP3D_4.0_obj_99.zip` (136 MB) - the is-a hierarchy
  - `partof_BP3D_4.0_obj_99.zip` (62 MB) - the part-of hierarchy
- Citation: Mitsuhashi et al. (2009), *Nucleic Acids Research*,
  [doi:10.1093/nar/gkn613](https://doi.org/10.1093/nar/gkn613).

### Rejected: Z-Anatomy

Z-Anatomy is licensed CC BY-SA 4.0. The ShareAlike term is viral: it would impose
ShareAlike obligations on anything derived from the assets, which constrains how
BoneVision's own geometry and any downstream remixes could be licensed. BodyParts3D's
plain CC BY 4.0 carries the same attribution duty without that knock-on, so it wins on
licensing alone.

## If a future body part uses a GLB

Drop the file here and follow these rules:

- Format: GLB (binary GLTF), Draco compressed
- One named mesh per bone, matching `meshId` in that body part's mapping config
- Materials must accept standard PBR properties (the highlight code writes `emissive`)
- Target under 100k triangles total, under 10k per bone
- Model centered at the origin
- Verify licensing permits educational use, and record the source here
