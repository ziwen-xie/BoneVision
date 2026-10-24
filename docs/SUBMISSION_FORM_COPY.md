# SkeletonMap — submission form copy

Copy each quoted field independently. This is a self-contained Hackachusetts submission for the **Healthcare & Biotech** track.

## Project name

> SkeletonMap

## Tagline

> Connect a labelled X-ray to the bones it represents.

## Track

> Healthcare & Biotech

## Short description

> SkeletonMap is an educational web app that connects a labelled foot radiograph with an interactive 3D skeleton. Hover a mapped X-ray region and the corresponding bone highlights in the same color; click to focus the camera and read a plain-language explanation. The current demo covers 19 foot regions and supports camera orbit, zoom, pan, keyboard interaction, and local JPEG/PNG uploads. Uploaded images stay in browser memory and are not analyzed. It is designed for patients, students, and clinicians explaining anatomy, not for diagnosis, fracture detection, image assessment, or treatment advice.

## Full description

> X-rays flatten three-dimensional anatomy into overlapping grayscale shapes. That makes them hard to interpret for someone without radiographic training and can leave a patient struggling to connect a clinician’s explanation with the image. SkeletonMap explores a focused health-literacy response by placing a labelled radiograph beside a manipulable skeleton and keeping both views connected.
>
> A visitor can open the foot demo immediately or choose a local JPEG or PNG. Moving over any of 19 hand-mapped regions on an adult right-foot dorsoplantar radiograph highlights the corresponding procedural 3D bone in the same color. The educational panel follows with the bone’s name, role, common conditions, and projection-specific notes where overlap could mislead. Hovering a 3D bone sends the highlight back to the radiograph. Clicking focuses the camera, while orbit, zoom, and pan help relate the flat image to spatial structure.
>
> Patients can gain vocabulary and orientation for a conversation with a qualified professional. Students can rehearse anatomy across two representations. Clinicians and educators can use the linked views as a visual explanation aid without presenting the app as an interpretation tool.
>
> Uploaded pixels are decoded locally, held in memory, and never sent to an application server. The responsive interface includes semantic structure, visible focus states, keyboard-reachable controls, screen-reader labels, and a WebGL fallback. Demo mode identifies the source radiograph in the product.
>
> This prototype is intentionally narrow. Uploaded films are not analyzed by machine learning, and its static polygons do not adapt to a new patient, crop, pose, or projection. DICOM is not implemented, and the procedural geometry is not clinical-grade. A realistic route to more body regions would require responsibly licensed anatomy and genuinely annotated biological imaging. Any future image analysis would need clinical collaboration, representative data, validation, and a safety model appropriate to its intended use.

## Features and functionality

> - 19 hand-mapped foot regions linked to 19 separately interactive procedural meshes.
> - Bidirectional highlighting: X-ray to 3D and 3D back to X-ray, using the same configured color.
> - Bone click-to-focus plus orbit, zoom, and pan controls.
> - Plain-language educational content with names, functions, common conditions, and cautious projection notes.
> - Local JPEG/PNG upload, file validation, body-region selection, and a clear privacy notice. DICOM decoding is not implemented.
> - Responsive layouts, keyboard-reachable mapped regions and controls, visible focus states, assistive labels, and a WebGL fallback.
> - Visible in-product attribution for the demonstration radiograph.
> - Educational scope only: no diagnosis, fracture detection, image assessment, clinical decision support, or treatment advice.

## Potential value

> SkeletonMap addresses a concrete healthcare communication problem without claiming to replace professional image interpretation. Judges can evaluate the core idea directly in the working app: pointing at one representation immediately identifies the same structure in another and supplies understandable context. Local-only upload handling avoids an unnecessary server path for medical images, while accessible interaction broadens who can use the explanation. The data-driven mapping format offers a feasible way to add body regions one at a time, provided future mappings, assets, and content are responsibly sourced and reviewed. Explicit limitations keep the educational value aligned with what the prototype actually does.

## Kiro usage write-up

> Kiro IDE was the primary development environment. SkeletonMap followed a requirements-first workflow in the committed root `.kiro/` directory. The files `.kiro/specs/bone-vision/requirements.md`, `design.md`, `tasks.md`, and `tasks.meta.json` preserve acceptance criteria, interfaces, correctness properties, a dependency-aware task graph, and execution history. `bone-vision` is the historical working-title slug retained for that history.
>
> The workflow moved from acceptance criteria to design and then to bounded implementation tasks. Delegated task agents worked on specific slices, followed by targeted tests, type checks, linting, and production builds. This surfaced concrete corrections: polygons were retraced from an invented 1920×1080 frame onto the real 1061×2431 portrait radiograph; the 19/19 `meshId` contract was checked; portrait 4K validation was fixed; Pages asset paths moved to `import.meta.env.BASE_URL`; an `xrayNote`/`xrayStatus` mismatch was resolved; a watermarked Adobe Stock candidate was rejected for a CC0 radiograph; and a naming conflict was caught before submission, prompting the complete SkeletonMap rebrand.
>
> Compared with open-ended vibe coding, the spec kept privacy, accessibility, timing, error behavior, deployment, and licensing visible throughout implementation. Current automated validation is 78 deterministic tests across 9 test files passed (`npm test`), with additional passing type-check, lint, and production-build gates. The GitHub Pages workflow repeats all four gates before deployment.
>
> For transparency, this version did not use Kiro CLI, Kiro Web, Kiro Crew, custom agent hooks, separate steering documents, an MCP server, Kiro Powers, or a true property-based-testing library. It uses deterministic unit, component, routing, and invariant tests. The root `.kiro/` directory is intentionally committed and not ignored.

## Testing instructions

> No login is required. The hosted app is free and public during judging. In a current WebGL-capable desktop browser, open the live site and choose **Try the demo**. Hover the first metatarsal on the X-ray; its 3D bone should use the same color and the educational panel should update. Hover a 3D bone to send the highlight back to the X-ray. Click a bone to focus it, then orbit, zoom, and pan. Use Tab to reach controls and X-ray regions and Enter or Space to activate a focused region. Open upload mode, choose a non-sensitive JPEG or PNG under 10MB, read the local-processing notice, and select Foot. Then switch back to demo mode. For local testing with Node.js 22: run `npm ci`, `npm run dev`, and open `http://localhost:3000`. Validation commands are `npm test`, `npm run type-check`, `npm run lint`, and `npm run build`.

## Live URL

> <https://ziwen-xie.github.io/SkeletonMap/>

## Direct demo URL

> <https://ziwen-xie.github.io/SkeletonMap/#/viewer>

## Public repository URL

> <https://github.com/ziwen-xie/SkeletonMap>

## Demo video URL

> [TODO BEFORE SUBMISSION: ADD PUBLIC VIDEO URL]

## Team representative

> [TODO BEFORE SUBMISSION: TEAM REPRESENTATIVE]

## Team members

> [TODO BEFORE SUBMISSION: TEAM MEMBER 1 — NAME AND ROLE]
>
> [TODO BEFORE SUBMISSION: TEAM MEMBER 2 — NAME AND ROLE]
>
> [TODO BEFORE SUBMISSION: TEAM MEMBER 3 — NAME AND ROLE]
>
> [TODO BEFORE SUBMISSION: TEAM MEMBER 4 — NAME AND ROLE]

Delete unused team-member entries. The team may contain no more than four people.

## Asset credit

> The application code, procedural foot model, body-region silhouette, and SkeletonMap scan/map icon are original project work. The demo and landing-page image derivatives come from “X-ray of normal right foot by dorsoplantar projection” by Mikael Häggström, via Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:X-ray_of_normal_right_foot_by_dorsoplantar_projection.jpg>. The source is released under CC0 1.0: <https://creativecommons.org/publicdomain/zero/1.0/>. Open-source dependencies remain under their own licenses.
