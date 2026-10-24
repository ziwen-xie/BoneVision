# SkeletonMap final demo video script

- **Final runtime:** 90.200 seconds (1:30.2)
- **Published video:** <https://youtu.be/P1APBPukqIg>
- **Video format:** 1920×1080, H.264 High profile, progressive, 30 fps
- **Audio:** The published captioned master is intentionally silent, has no audio stream or music, and uses burned-in captions. Narration is optional.

## Final edit structure

The delivered video uses the following verified edit rather than the earlier long-form recording plan:

- **00:00.000–00:04.000 (final timeline):** SkeletonMap opener.
- **Source 00:00.000–00:40.800:** Landing-page introduction, purpose, workflow, audience, privacy, and demo call to action.
- **Source 00:40.800–00:42.800:** Removed loading/static hold.
- **Source 00:42.800–01:16.500:** Working demo footage with the full browser frame, X-ray/3D layout, model rotation, synchronized highlighting, and educational panel updates.
- **Source 01:16.500–01:17.600:** Removed transition/dead interval.
- **Source 01:17.600–01:25.300:** Upload/return flow and final landing-page context.
- **Source 01:25.300–01:29.967:** Removed repeated static tail.
- **01:26.200–01:30.200 (final timeline):** Closer with the live site and repository URLs.

## Exact burned-in captions and optional narration

These ten cues are the exact text and timing in `SkeletonMap_Demo_Final.srt`. If a narrated alternate is produced, read this wording verbatim and use the cue times as pacing targets. Leave the first four seconds and final four seconds unvoiced.

```srt
1
00:00:04,200 --> 00:00:11,600
SkeletonMap is an educational X-ray reader that connects a radiograph
with an interactive three-dimensional skeleton.

2
00:00:11,600 --> 00:00:20,500
It helps patients, students, and clinicians move from a flat image
to an understandable view of anatomy.

3
00:00:20,500 --> 00:00:28,900
The workflow is simple: open the demo or choose an image,
confirm the body part, then explore the structures on screen.

4
00:00:28,900 --> 00:00:37,300
Uploaded images are processed locally in the browser,
so sensitive files are not sent to an external service.

5
00:00:37,300 --> 00:00:44,600
The current prototype focuses on foot anatomy
and makes its educational, not diagnostic, purpose explicit.

6
00:00:44,600 --> 00:00:51,900
In demo mode, a foot X-ray, a manipulable bone model,
and plain-language guidance appear together.

7
00:00:51,900 --> 00:01:01,100
Hovering over a structure highlights the same bone in both views
and updates the learning panel with its role and common injuries.

8
00:01:01,100 --> 00:01:09,600
This synchronized response links two-dimensional radiography
with three-dimensional position, making spatial relationships easier to see.

9
00:01:09,600 --> 00:01:17,700
The model can be rotated and examined from different angles,
while individual bones remain clearly selectable.

10
00:01:17,700 --> 00:01:25,800
Users can also switch to upload mode, choose an X-ray,
and keep the entire exploration on their own device.
```

## Upload and recording checks

If source footage or optional narration is recorded again:

1. Use a current desktop browser with WebGL enabled and preload the viewer so the model is ready.
2. Keep the X-ray, 3D viewer, and educational panel readable in the browser frame.
3. Use only a harmless JPEG or PNG under 10MB for the upload shot; do not use a real person’s sensitive medical image.
4. Preserve the local-processing and educational-not-diagnostic boundaries shown in the captions. Uploaded images are not analyzed or precisely registered, and DICOM decoding is not implemented.
5. Hide notifications, private tabs, bookmarks, account avatars, and autofill suggestions.
6. Use no copyrighted music, unlicensed stock overlays, or unauthorized third-party marks. No music is needed.

## Publication checks

- [x] Captioned master is 90.200 seconds, 1920×1080, H.264, progressive, 30 fps, and silent.
- [x] Ten monotonic caption cues parse successfully; the last cue ends at 01:25.800.
- [x] The master decoded from beginning to end without reported errors and uses MP4 faststart.
- [x] Browser footage is proportionally scaled without cropping; tabs, address bar, and browser frame remain visible.
- [ ] Review the complete published video once for readable text, hidden private data, and accurate claims.
- [ ] Verify <https://youtu.be/P1APBPukqIg> in an incognito/private window with no login.
