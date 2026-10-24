# Hackachusetts submission package — SkeletonMap

Submission materials for the **Healthcare & Biotech** track. Supporting project documentation: [README](README.md) · [copy/paste form fields](docs/SUBMISSION_FORM_COPY.md) · [video script](docs/VIDEO_SCRIPT.md) · [final checklist](docs/SUBMISSION_CHECKLIST.md)

## Submission at a glance

| Field | Submission |
| --- | --- |
| Title | SkeletonMap |
| Track | Healthcare & Biotech |
| Tagline | Connect a labelled X-ray to the bones it represents. |
| Live app | <https://ziwen-xie.github.io/SkeletonMap/> |
| Direct demo | <https://ziwen-xie.github.io/SkeletonMap/#/viewer> |
| Public repository | <https://github.com/ziwen-xie/SkeletonMap> |
| Demo video | [TODO BEFORE SUBMISSION: ADD PUBLIC VIDEO URL] |
| Team representative | [TODO BEFORE SUBMISSION: TEAM REPRESENTATIVE] |
| Team member 1 | [TODO BEFORE SUBMISSION: TEAM MEMBER 1 — NAME AND ROLE] |
| Team member 2 | [TODO BEFORE SUBMISSION: TEAM MEMBER 2 — NAME AND ROLE] |
| Team member 3 | [TODO BEFORE SUBMISSION: TEAM MEMBER 3 — NAME AND ROLE] |
| Team member 4 | [TODO BEFORE SUBMISSION: TEAM MEMBER 4 — NAME AND ROLE] |

Replace the representative and actual team-member values before submission. Delete every unused team-member row; the team may contain no more than four people.

## Short description

SkeletonMap is an educational web app that connects a labelled foot radiograph with an interactive 3D skeleton. Hover a mapped X-ray region and the corresponding bone highlights in the same color; click to focus the camera and read a plain-language explanation. The current demo covers 19 foot regions and supports camera orbit, zoom, pan, keyboard interaction, and local JPEG/PNG uploads. Uploaded images stay in browser memory and are not analyzed. It is designed for patients, students, and clinicians explaining anatomy, not for diagnosis, fracture detection, image assessment, or treatment advice.

## Full description

X-rays flatten three-dimensional anatomy into overlapping grayscale shapes. That makes them hard to interpret for someone who has not spent years learning radiographic anatomy, and it can leave a patient struggling to connect a clinician’s explanation with the image in front of them. SkeletonMap explores a focused health-literacy response: place a labelled radiograph beside a manipulable skeleton and keep both views connected.

The current experience begins on a plain-language landing page. A visitor can open the foot demo immediately or choose a local JPEG or PNG. In the demo, moving over any of 19 hand-mapped regions on an adult right-foot dorsoplantar radiograph highlights the corresponding procedural 3D bone in the same color. The educational panel follows the interaction with the bone’s name, role, common conditions, and projection-specific notes where overlap could otherwise mislead. Hovering a 3D bone sends the highlight back to the radiograph. Clicking focuses the camera; orbit, zoom, and pan help relate the flat view to spatial structure.

For patients, this can provide vocabulary and orientation before or during a conversation with a qualified professional. Students can use the linked views to rehearse anatomy. Clinicians and educators can use it as a visual explanation aid without presenting it as an interpretation tool.

Privacy and accessibility shape the implementation rather than appearing as add-ons. Uploaded pixels are decoded locally, held in memory, and never sent to an application server. The interface provides responsive layouts, semantic structure, visible focus states, keyboard-reachable controls, screen-reader labels, and a WebGL fallback. The demo identifies its source image in the product.

The prototype is intentionally narrow. It does not infer landmarks or adapt its polygons to a new patient image. A realistic path beyond the foot would require responsibly licensed anatomical assets and genuinely annotated biological imaging, with separate mapping configurations and exact mesh contracts for each body region. Any future image-analysis work would need representative data, clinical collaboration, prospective validation, and a safety model appropriate to its intended use; it is not implied by this educational prototype.

## Implemented features

- **Nineteen mapped foot regions.** The demo radiograph has 19 hand-authored polygons tied to 19 separately addressable 3D meshes.
- **Bidirectional, same-color highlighting.** Hovering either view updates shared state, the corresponding X-ray polygon and bone use the configured color, and the educational panel follows.
- **3D navigation and focus.** A click focuses the camera on a bone; users can orbit, zoom, and pan with constrained controls.
- **Plain-language educational panel.** Each mapped region includes a name, function, and common conditions, plus cautious projection notes for the talus and calcaneus.
- **JPEG/PNG upload flow.** The upload screen validates type, size, and orientation-agnostic 4K dimensions before asking for the body region. DICOM is identified but cannot be decoded in this version.
- **Local browser processing.** Uploaded image data is decoded in the browser, remains in memory, and is neither sent to a backend nor written to persistent browser storage.
- **Responsive and keyboard-aware interface.** The layout adapts across screen sizes; interactive regions and controls expose focus treatment and assistive labels.
- **Visible demo attribution.** Demo mode marks the radiograph as demonstration content and displays its title, creator, source, and CC0 status.

## Current scope and safety

SkeletonMap currently uses **one hand-labelled adult right-foot dorsoplantar radiograph**. An uploaded image is displayed locally, but it is not registered to anatomical landmarks or analyzed by machine learning; the same static foot polygons are reused, so their alignment on another patient, projection, crop, or pose is approximate.

DICOM decoding is not implemented. The 3D foot is stylized procedural geometry built for spatial orientation and interaction, not a scan-derived or clinical-grade anatomical model. SkeletonMap provides no diagnosis, fracture detection, abnormality detection, image assessment, clinical decision support, or treatment advice. Questions about a real image, injury, symptoms, or care belong with a qualified clinician.

## Potential value

SkeletonMap is relevant to healthcare because it tackles a specific communication problem without pretending to replace professional interpretation. Its value can be judged directly in the working interaction: a user points at one representation and immediately sees the corresponding structure in another, with understandable supporting text.

The prototype also demonstrates responsible technical choices. Local-only upload handling reduces unnecessary exposure of medical images. Accessibility is part of the interaction design. Explicit limitations keep the educational claim aligned with what the software actually does. The mapping format separates content from rendering, so additional body regions could be added deliberately rather than by rewriting the interface. That is a feasible route to broader anatomy education, provided future mappings, assets, and content are sourced and reviewed appropriately.

## Implementation and design

SkeletonMap uses React 19 and TypeScript, React Three Fiber with Drei and Three.js for the 3D scene, Zustand for shared interaction state, react-dropzone for local file selection, Tailwind CSS for the visual system, Vite for development and production builds, and Vitest with Testing Library for automated checks.

The central mapping contract is exact: each object in `public/config/foot-mapping.json` carries a stable bone `id`, polygon, educational content, highlight color, and `meshId`. `buildFootSkeleton()` produces one mesh with each of these 19 names:

`Distal_Phalanx_1`, `Proximal_Phalanx_1`, `Sesamoid_Bones`, `Metatarsal_1`, `Metatarsal_2`, `Metatarsal_3`, `Metatarsal_4`, `Metatarsal_5`, `Toe_2_Phalanges`, `Toe_3_Phalanges`, `Toe_4_Phalanges`, `Toe_5_Phalanges`, `Medial_Cuneiform`, `Intermediate_Cuneiform`, `Lateral_Cuneiform`, `Cuboid`, `Navicular`, `Talus`, and `Calcaneus`.

The model component joins `meshId` to application-level bone IDs once. Both viewers then write the same Zustand hover and selection fields, which keeps highlights and panel content synchronized without duplicating interaction state. Camera bounds are registered per bone for focusing and combined for initial framing.

Uploaded files have no server path. Browser APIs decode JPEG/PNG data into memory; the application neither uploads those bytes nor persists them. GitHub Pages uses a project-relative Vite base, runtime asset requests derive from `import.meta.env.BASE_URL`, and `#/viewer` provides a static-host-safe deep link.

The procedural foot geometry and the scan/map icon are original project work, avoiding third-party model and brand licensing risks. The radiograph is a CC0 image with visible credit. Deployment from `main` runs type checking, lint, tests, and a production build before GitHub Pages receives the artifact.

## How Kiro was used

Kiro IDE was the primary development environment. Work followed a requirements-first, spec-driven process stored in the committed root `.kiro/` directory:

- `.kiro/specs/bone-vision/requirements.md`
- `.kiro/specs/bone-vision/design.md`
- `.kiro/specs/bone-vision/tasks.md`
- `.kiro/specs/bone-vision/tasks.meta.json`

`bone-vision` is the historical working-title slug retained so the task history remains intact; the product and submission name are SkeletonMap.

The process moved from acceptance criteria to design. Interfaces, data flow, errors, accessibility behavior, privacy boundaries, and correctness properties were written down before implementation. The plan then translated that design into a dependency-aware task graph. Bounded task agents handled specific slices instead of receiving an open-ended “build the app” prompt. Each slice was compared with its requirement references and validated with the relevant tests, type checks, lint rules, or production build.

That traceability produced concrete corrections:

- An early, fabricated 1920×1080 region frame was rejected. All polygons were retraced against the actual 1061×2431 portrait radiograph.
- The procedural model and mapping were checked as a 19/19 `meshId` contract so no labelled region silently pointed to a missing mesh.
- A landscape-only 4K validator rejected ordinary portrait films; the check was changed to long-edge/short-edge limits so portrait and landscape images are treated consistently.
- Absolute runtime asset paths that would fail under a GitHub Pages project prefix were replaced with paths derived from `import.meta.env.BASE_URL`.
- An `xrayNote`/`xrayStatus` data-contract mismatch was caught, separating static projection guidance from per-image findings.
- A proposed Adobe Stock/watermarked image was rejected and replaced with a CC0 radiograph whose source can be disclosed clearly.
- A naming conflict was identified before submission, leading to a complete SkeletonMap rebrand across the interface, repository metadata, routing, and deployment configuration.

This differs from unstructured vibe coding because nonvisual obligations stayed visible throughout the build. Privacy, accessibility, timing expectations, error behavior, deployment constraints, and licensing remained tied to requirements and tasks rather than being rediscovered at the end.

Current automated validation: 78 deterministic tests across 9 test files passed (`npm test`). The same repository also passes `npm run type-check`, `npm run lint`, and `npm run build`; the deployment workflow repeats type-check, lint, tests, and build before publishing.

For transparency, this version did **not** use Kiro CLI, Kiro Web, Kiro Crew, custom agent hooks, separate steering documents, an MCP server, or Kiro Powers. It also does not use a true property-based-testing library. Its automated coverage consists of deterministic unit, component, routing, and invariant tests. The root `.kiro/` directory is intentionally committed and is not ignored.

## Testing instructions for judges

No account or setup is required. The hosted app is free and public during judging. Use a current WebGL-capable desktop browser for the clearest 3D interaction.

1. Open <https://ziwen-xie.github.io/SkeletonMap/> and choose **Try the demo**. The direct route is <https://ziwen-xie.github.io/SkeletonMap/#/viewer>.
2. On the X-ray, hover the **first metatarsal**. Confirm that its polygon and the corresponding 3D bone share a color and that the educational panel changes.
3. Hover a bone in the 3D view and confirm the highlight travels back to the X-ray.
4. Click a bone to focus it. Drag to orbit, scroll to zoom, and right-click-drag to pan.
5. Use Tab to reach controls and mapped X-ray regions; activate a focused region with Enter or Space and confirm the focus indicator remains visible.
6. Switch to upload mode and choose a local JPEG or PNG under 10MB. Read the privacy notice, select **Foot**, and note that the file remains local. Do not use sensitive medical data for judging.
7. Switch back to demo mode and confirm the labelled sample returns.

To run locally with Node.js 22:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. For repository validation:

```bash
npm test
npm run type-check
npm run lint
npm run build
```

## Original work and third-party materials

The application code, procedural foot model, body-region silhouette, and SkeletonMap scan/map icon are original project work.

The demo and landing-page image derivatives come from **“X-ray of normal right foot by dorsoplantar projection” by Mikael Häggström**, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:X-ray_of_normal_right_foot_by_dorsoplantar_projection.jpg), released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The product displays this attribution even though CC0 does not require it.

Open-source dependencies remain subject to their own licenses. The submission video should contain no unlicensed music, stock overlays, logos, or other third-party marks.

## Roadmap

- Learn anatomical mapping from real, responsibly sourced and annotated biological imaging rather than stretching one static map across unrelated films.
- Explore identification of unusual image regions only as future work with clinical partners, representative data, validation, and an appropriate safety and regulatory plan.

## Pre-submission checklist

- [ ] Team contains no more than four people; unused team slots are deleted.
- [ ] A team representative is identified.
- [ ] Healthcare & Biotech is selected as the track.
- [ ] All submission text and the video are in English.
- [ ] Public GitHub repository and live test link open without authentication.
- [ ] Repository includes all source, assets, setup instructions, and the root `.kiro/` project history.
- [ ] Public demo video is under three minutes, hosted on an allowed platform, and visibly shows the functioning app.
- [ ] Video and repository contain no unlicensed material or unauthorized third-party marks.
- [ ] Final public video URL replaces every video placeholder.
- [ ] App remains free and publicly available through the judging period.
- [ ] Final commit is pushed before the official deadline and the Pages deployment completes.
- [ ] No project or submission changes are made after the permitted development period.
- [ ] Every `[TODO BEFORE SUBMISSION: ...]` placeholder is replaced or its unused row is deleted.
