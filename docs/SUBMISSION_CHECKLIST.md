# Hackachusetts submission go/no-go checklist

Project: **SkeletonMap**

Track: **Healthcare & Biotech**

## Blocking TODOs

- [ ] Replace `[TODO BEFORE SUBMISSION: TEAM REPRESENTATIVE]` with the representative’s name.
- [ ] Fill the actual team entries, up to four people, and delete every unused slot:
  - `[TODO BEFORE SUBMISSION: TEAM MEMBER 1 — NAME AND ROLE]`
  - `[TODO BEFORE SUBMISSION: TEAM MEMBER 2 — NAME AND ROLE]`
  - `[TODO BEFORE SUBMISSION: TEAM MEMBER 3 — NAME AND ROLE]`
  - `[TODO BEFORE SUBMISSION: TEAM MEMBER 4 — NAME AND ROLE]`

## Team and form

- [ ] Team has no more than four members.
- [ ] Representative and Healthcare & Biotech track are selected in the official form.
- [ ] Project name is SkeletonMap and all submission content is in English.
- [ ] Short/full descriptions and Kiro write-up are pasted from `SUBMISSION_FORM_COPY.md` without truncation.
- [ ] No `[TODO BEFORE SUBMISSION: ...]` placeholder remains.

## Public deliverables

- [ ] Live site opens without authentication: <https://ziwen-xie.github.io/SkeletonMap/>.
- [ ] Direct viewer opens: <https://ziwen-xie.github.io/SkeletonMap/#/viewer>.
- [ ] Repository is public: <https://github.com/ziwen-xie/SkeletonMap>.
- [ ] Repository includes source, assets, README/setup instructions, and the committed root `.kiro/` directory.
- [ ] The latest commit is pushed before the official deadline and the Pages deployment has finished.
- [ ] The app remains free and public through judging.

## Video

- [x] Public demo video URL is set to <https://youtu.be/P1APBPukqIg>; the watch and oEmbed endpoints returned HTTP 200 without authentication.
- [ ] Runtime is below three minutes; target 2:48.
- [ ] Footage visibly demonstrates the working app, both highlight directions, camera interaction, upload/privacy, limitations, and Kiro spec files.
- [ ] Recording is 1080p with readable text and no notifications or private data.
- [ ] Video contains no copyrighted music, unlicensed material, or unauthorized third-party marks.

## Accuracy and rights

- [ ] Scope says one hand-labelled adult right-foot dorsoplantar radiograph.
- [ ] Claims say uploaded images are not analyzed and static mappings are approximate.
- [ ] DICOM is described as not implemented; procedural geometry is described as stylized, not clinical-grade.
- [ ] No diagnosis, fracture detection, image assessment, treatment, accuracy, award, or unsupported impact claim appears.
- [ ] Mikael Häggström/Wikimedia Commons/CC0 1.0 radiograph credit is present.
- [ ] Open-source dependencies retain their license notices.

## Final freeze

- [ ] Run `npm test`, `npm run type-check`, `npm run lint`, and `npm run build` on the final commit.
- [ ] Test the demo and upload route once on the deployed build in a current WebGL desktop browser.
- [ ] Confirm all final URLs point to `SkeletonMap` with matching capitalization.
- [ ] Submit before the deadline, then make no changes after the permitted development period.
