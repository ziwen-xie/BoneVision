# SkeletonMap demo video script

**Target runtime: 2:48. Hard stop: 2:50.** This plan leaves at least ten seconds before the three-minute limit. Keep the pace conversational and let the functioning app occupy almost the entire frame.

## Before recording

1. Open these tabs in order: live landing page, direct viewer, upload view if preloading it helps, then the public GitHub repository at `.kiro/specs/bone-vision/`.
2. Use a current desktop browser with WebGL enabled. Reload the direct viewer once so assets are cached.
3. Set the browser width so the X-ray and 3D viewer sit side by side. Use a readable browser zoom; do not shrink text to fit more on screen.
4. Practice locating the first metatarsal polygon and a large 3D bone before recording.
5. Keep a harmless JPEG or PNG under 10MB ready for the upload shot. Do not use a real person’s sensitive medical image.

## Timed shot and narration plan

### 0:00–0:12 — The problem

**Shot:** Start on the landing-page hero with the product name and radiograph visible.

**Say:** “An X-ray compresses a three-dimensional body into one flat image. If you haven’t trained in radiology, it can be hard to connect a name in an explanation with the bone you’re actually looking at.”

### 0:12–0:25 — Landing page and purpose

**Shot:** Scroll just enough to show the core explanation, then return to the **Try the demo** button.

**Say:** “SkeletonMap is an educational bridge between those views. It pairs a labelled radiograph with an interactive skeleton and explains the anatomy in everyday language.”

### 0:25–0:39 — Enter the working demo

**Shot:** Click **Try the demo**. Pause on the split viewer so all three areas—the X-ray, 3D foot, and educational panel—are readable.

**Say:** “There’s no login. The current demo focuses on one adult right-foot dorsoplantar X-ray, with nineteen regions mapped by hand to nineteen separately interactive meshes.”

### 0:39–1:03 — X-ray to 3D highlight and panel

**Shot:** Hover the first metatarsal polygon on the X-ray. Hold steady for several seconds. Point out the matching 3D color and changed educational panel without covering them with the cursor.

**Say:** “Here’s the first metatarsal. Hovering its X-ray region updates shared state immediately. The same configured color appears on the corresponding 3D bone, and the panel follows with its name, what it does, and common problems. Nothing here is diagnosing this film.”

### 1:03–1:22 — 3D back to X-ray

**Shot:** Move away, then hover a clear bone in the 3D model. Hold while its X-ray polygon appears. If useful, hover one more bone slowly.

**Say:** “The link works in the other direction too. When I point at a bone in 3D, SkeletonMap finds the matching ID and sends the highlight back to the radiograph. Both views use the same mapping file rather than separate labels.”

### 1:22–1:45 — Focus and camera controls

**Shot:** Click the hovered bone. Let the focus animation finish. Drag to orbit, scroll to zoom, then briefly right-click-drag to pan.

**Say:** “Clicking selects the bone and moves the camera toward its registered bounds. I can still rotate to understand its position, zoom for a closer look, or pan across the model. The geometry is an original, stylized teaching model—not scan-derived or clinical-grade anatomy.”

### 1:45–2:03 — Upload and privacy

**Shot:** Switch to upload mode. Show the privacy notice and supported formats. Briefly select the prepared JPEG or PNG; show the body-region choice, but do not spend time waiting for a full exploration.

**Say:** “A user can also choose a JPEG or PNG. Decoding happens in the browser, the image stays in memory, and there’s no upload server. The current foot polygons are static, so another image is not analyzed or precisely registered. DICOM decoding is not implemented yet.”

### 2:03–2:19 — Safety boundary

**Shot:** Return to demo mode and briefly frame the standing educational disclaimer or demo attribution marker.

**Say:** “That boundary matters: SkeletonMap does not detect fractures, assess images, recommend treatment, or provide a diagnosis. It is a visual explanation aid for patients, students, clinicians, and educators.”

### 2:19–2:39 — GitHub and Kiro’s role

**Shot:** Switch to the public GitHub repository. Open `.kiro/specs/bone-vision/` and show `requirements.md`, `design.md`, `tasks.md`, and `tasks.meta.json` in the file list. Open one briefly if time permits.

**Say:** “Kiro IDE was the primary environment. We worked requirements-first: acceptance criteria became interfaces and correctness properties, then a dependency-aware task graph. Bounded agents implemented individual tasks and validation caught real issues—from portrait X-ray coordinates and mesh-name mismatches to Pages paths, licensing, and the final rebrand. The historical folder name is kept for task history.”

### 2:39–2:48 — Future direction and close

**Shot:** Return to the landing page. Keep the final frame on the SkeletonMap name and live URL.

**Say:** “Next, we’d learn mappings from responsibly annotated biological images, and only explore unusual-region detection with clinical validation. Try it at ziwen-xie.github.io/SkeletonMap.”

## Recording checklist

- [ ] Final cut is 2:30–2:50 and never reaches 3:00; judges may stop playback at exactly 3:00.
- [ ] Record at 1080p with crisp text and a readable browser zoom.
- [ ] Functioning app footage dominates; do not replace interaction with slides.
- [ ] Hide desktop notifications, bookmarks containing private data, unrelated tabs, account avatars, and autofill suggestions.
- [ ] Use no copyrighted music, unlicensed stock overlays, or third-party marks.
- [ ] Upload to a public host allowed by the Hackachusetts rules.
- [ ] Verify the final URL in an incognito/private window with no login.
- [ ] Confirm the title, description, and spoken claims say SkeletonMap and Healthcare & Biotech.
- [x] Added the public demo video URL, <https://youtu.be/P1APBPukqIg>, to the submission documents.

## If the 3D model looks small

Before recording, enter the demo, let auto-framing finish, and zoom in until the foot and hover colors read clearly while the X-ray remains visible. Rehearse the click target at that zoom. Do not describe the procedural model as medically accurate, clinical-grade, scan-derived, or suitable for image interpretation; call it a stylized spatial teaching model.
