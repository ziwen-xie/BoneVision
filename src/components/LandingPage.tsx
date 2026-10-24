/**
 * LandingPage
 *
 * The front door at `#/`. Its whole job is to tell a first-time visitor what
 * BoneVision is and put them into the viewer in the right mode, so every claim
 * on it is one the implementation actually delivers - an inflated promise on a
 * healthcare tool costs more trust than a modest one earns.
 *
 * Mode, not just navigation
 * -------------------------
 * The two calls to action differ in more than destination: "Try the demo" needs
 * the sample radiograph loaded, "Upload your X-ray" needs the demo content
 * cleared so the drop zone is what appears. Both go through the store's
 * `setMode`, which already owns that choreography (`initializeDemo` one way,
 * `prepareUpload` the other), rather than reimplementing it here. They are
 * `<button>`s because they change application state before navigating - a link
 * that promised a shareable URL could not carry the mode, since the mode lives
 * in the store and not in the fragment.
 *
 * A third entry point sits in the coverage section: BodyRegionPicker, mounted
 * as the proof behind the coverage claim. Selecting the feet loads the bone map
 * and lands in the viewer - see `openRegionInViewer` for why that path has to
 * settle the mode as well, and the comment above the picker for why it is on a
 * white full-width surface rather than inside the tinted two-column grid.
 *
 * Nothing is fetched by rendering this page. The demo radiograph is 836KB, so
 * it waits for a call to action; the picker likewise fetches only inside its
 * click handler, so mounting it did not cost that property. There is a test
 * holding both halves of this still.
 *
 * Layout
 * ------
 * Single column by default, fanning out at `md` (768px) per requirement 8.1/8.2.
 * Type scale steps up at `sm`/`lg` so the hero does not overflow a 320px
 * viewport, which `body { min-width: 320px }` sets as the floor.
 *
 * Contrast
 * --------
 * Ratios below are computed from the hex values in tailwind.config.js against
 * the surface each one is actually painted on, for WCAG AA (4.5:1 normal text,
 * 3:1 for large text - everything here clears the stricter bar):
 *   neutral-900 on white .............. 17.93:1   headings
 *   neutral-800 on white .............. 15.13:1   body copy
 *   neutral-700 on white .............. 10.37:1   secondary copy
 *   neutral-600 on white ............... 7.81:1   footer, eyebrow labels
 *   neutral-900 on neutral-50 ......... 17.18:1   alternating section bands
 *   neutral-800 on neutral-50 ......... 14.50:1
 *   neutral-700 on neutral-50 .......... 9.93:1
 *   neutral-600 on neutral-50 .......... 7.49:1
 *   neutral-800 on primary-50 ......... 13.34:1   hero gradient (lightest stop)
 *   neutral-700 on primary-50 ........... 9.14:1
 *   primary-700 on white .............. 10.27:1   brand wordmark, link text
 *   primary-700 on primary-50 ........... 9.05:1
 *   white on primary-600 ................ 6.75:1   primary CTA
 *   white on primary-700 ............... 10.27:1   primary CTA on hover
 *   primary-700 on primary-50 ........... 9.05:1   secondary CTA on hover
 *   white on primary-800 ............... 15.17:1   closing CTA band
 *   primary-100 on primary-800 ........ 10.32:1   closing CTA band subcopy
 *   primary-800 on white ............... 15.17:1   inverted CTA in that band
 *   primary-800 on primary-50 .......... 13.37:1   inverted CTA on hover
 *   primary-600 on white ................ 6.75:1   footer link on hover
 *   success-800 on success-50 ........... 7.29:1   privacy card
 *   accent-800 on accent-50 ............. 8.15:1   coverage callout
 *   secondary-900 on secondary-50 ....... 8.87:1   scope callout heading
 *   secondary-800 on secondary-50 ....... 7.09:1   scope callout body
 * neutral-500 (4.74:1 on white) is avoided throughout: it clears AA only just,
 * and not at all once a tint sits under it. Body text stops at neutral-600.
 *
 * The region picker's card is white, which is the surface its own contrast
 * table was computed against, so the ratios in BodyRegionPicker hold as
 * published rather than needing to be recomputed for a tint.
 *
 * _Requirements: 9.1, 9.4, 9.5, 7.6, 1.1, 1.7, 6.5, 15.4, 8.1, 8.2, 8.7, 13.1,
 * 13.2, 13.3, 13.4_
 *
 * 1.7 is here because selecting the feet loads the foot bone map; 1.6, the
 * prompt to name the body part, stays with BodyPartSelector in the upload flow,
 * which this picker does not replace.
 */

import useBoneVisionStore from '../stores/useBoneVisionStore';
import { navigateToRoute } from '../hooks/useHashRoute';
import BodyRegionPicker from './BodyRegionPicker';
import BoneMark from './BoneMark';

/**
 * Shared icon wrapper. Every icon here is decorative - the heading beside it
 * carries the meaning - so `aria-hidden` is applied once, in one place, instead
 * of being remembered per glyph.
 */
function CardIcon({ path, className }: { path: string; className: string }) {
  return (
    <span
      className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
        focusable="false"
      >
        <path d={path} />
      </svg>
    </span>
  );
}

/** Paths kept out of the JSX so the section markup stays readable. */
const ICON = {
  /** Two overlapping frames: the 2D view and the 3D view, linked. */
  sync: 'M4 5h7v7H4zM13 12h7v7h-7zM11 9h2M9 11v2',
  /** Speech bubble: plain-language explanation. */
  speech: 'M21 12a8 8 0 1 1-3.1-6.3M21 5v4h-4M7 11h8M7 15h5',
  /** Shield: local-only processing. */
  shield: 'M12 3l7 3v5c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6zM9 12l2 2 4-4',
  /** Scatter of distinct parts: individually mapped bones. */
  bones: 'M5 7h4M5 7v4M15 17h4M19 13v4M9 15l6-6M8 16l-2 2M16 8l2-2',
} as const;

const CAPABILITIES = [
  {
    title: 'Highlighting that runs both ways',
    body: 'Hover a bone on the radiograph and it lights up on the 3D model, in the same colour. Hover the model and the region on the X-ray lights up. Click, and the model turns to face it.',
    icon: ICON.sync,
    iconClass: 'bg-primary-50 text-primary-700',
  },
  {
    title: 'Explanations without the jargon',
    body: 'What each bone does, what commonly goes wrong with it, and how clearly it reads on this kind of X-ray. Written for someone with no medical background.',
    icon: ICON.speech,
    iconClass: 'bg-secondary-50 text-secondary-900',
  },
  {
    title: 'Private by design',
    body: 'Your image is read and drawn entirely inside your browser. Never uploaded to a server, never written to storage, gone the moment you close the tab.',
    icon: ICON.shield,
    iconClass: 'bg-success-50 text-success-800',
  },
  {
    title: '19 bones, individually explorable',
    body: 'The demo radiograph is traced bone by bone: every tarsal, metatarsal and phalanx is its own region with its own explanation, not one flat overlay.',
    icon: ICON.bones,
    iconClass: 'bg-accent-50 text-accent-800',
  },
];

/**
 * The flow, as a marketing beat rather than a manual: one line each, three
 * across, so a visitor can see the whole path at a glance. The real
 * instructions live in the viewer, where they are actionable.
 */
const STEPS = [
  {
    title: 'Open the demo, or your own image',
    body: 'The demo is already loaded. Or drop in a JPEG or PNG.',
  },
  {
    title: 'Confirm the body part',
    body: 'That loads the matching bone map.',
  },
  {
    title: 'Hover, then click',
    body: 'Hover to read a bone, click to turn the model toward it.',
  },
];

const AUDIENCES = [
  {
    title: 'Patients',
    body: 'You have had an X-ray and the explanation went by too fast. Start from the image in front of you and work out what you are actually looking at.',
  },
  {
    title: 'Students',
    body: 'Learning radiographic anatomy means holding a 2D projection and a 3D structure in mind at the same time. Here they are side by side, linked.',
  },
  {
    title: 'Clinicians',
    body: 'Explaining a finding takes minutes you do not have. Point at the bone on the film and let the 3D view carry the spatial half of the explanation.',
  },
];

export default function LandingPage() {
  const setMode = useBoneVisionStore((state) => state.setMode);

  /**
   * Demo path. `setMode('demo')` reloads the sample radiograph and bone map if
   * the user has been through upload mode; if the store is already in demo mode
   * it is a deliberate no-op and the viewer's own mount effect does the loading.
   * Either way nothing is fetched until this click, which is the point of
   * keeping the demo load off the landing route.
   */
  const openDemo = () => {
    setMode('demo');
    navigateToRoute('viewer');
  };

  /**
   * Upload path. `setMode('upload')` runs `prepareUpload`, which clears the demo
   * image and its polygons, so the viewer opens on the drop zone instead of a
   * stranger's foot.
   */
  const openUpload = () => {
    setMode('upload');
    navigateToRoute('viewer');
  };

  /**
   * Third entry point: the coverage silhouette. The picker has already loaded
   * the bone map through the store's `setBodyPart` by the time this fires, so
   * there is nothing to load here - only a mode to settle before navigating.
   *
   * It has to be settled, because the viewer's mount effect only auto-loads the
   * demo while `mode === 'demo'`. A visitor who clicked "Upload your X-ray"
   * earlier and came back to this page leaves the store in upload mode, and
   * navigating in that state would open the drop zone - the map the user just
   * picked would be invisible, having been chosen and then not shown.
   *
   * `setMode('demo')` is the fix and not `setMode('upload')`: upload mode runs
   * `prepareUpload`, which clears `bodyPart` and `mappingConfig` and would
   * therefore throw away the load that just happened. Demo mode is also the
   * only state in which the split view has a radiograph to draw the map on.
   *
   * In the common case - a first visit, where `mode` is already `'demo'` - this
   * is a documented no-op, and the viewer's mount effect does the fetching as
   * it always has. Coming from upload mode it starts `initializeDemo` here
   * instead; that sets `mode` synchronously before its first await, so the
   * mount effect finds demo mode a moment later and `initializeDemo` collapses
   * the second call into the in-flight one rather than fetching twice.
   */
  const openRegionInViewer = () => {
    setMode('demo');
    navigateToRoute('viewer');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/95 backdrop-blur">
        {/*
          Wraps rather than squeezes: at 320px the mark, the wordmark and the
          viewer link together just exceed the content box, so the link drops to
          its own line instead of the wordmark truncating.
        */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 sm:px-6">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-50">
            <BoneMark />
          </span>
          <p className="font-display text-lg font-bold leading-tight text-primary-700">
            BoneVision
          </p>
          {/*
            A plain anchor, not a button: this one is pure navigation, so it
            stays middle-clickable and copyable. It lands in whatever mode the
            store is already in, which on a first visit is the demo.
          */}
          <a
            href="#/viewer"
            className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-primary-700 underline-offset-4 transition-colors duration-150 hover:bg-primary-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Open the viewer
          </a>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------------- Hero */}
        <section
          aria-labelledby="hero-heading"
          className="bg-gradient-to-b from-primary-50 via-white to-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="animate-fade-in max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 sm:text-sm">
                Educational X-ray reader
              </p>
              <h1
                id="hero-heading"
                className="font-display mt-4 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl lg:leading-[1.1]"
              >
                Understand what your X-ray is showing you
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-neutral-800 sm:text-xl">
                BoneVision puts a radiograph next to an interactive 3D skeleton
                and keeps the two in step.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
                Hover a bone on the image, watch it light up on the model, and
                read in plain language what it does. No anatomy background
                needed.
              </p>

              {/* Stacked and full-width on phones; side by side from `sm` up. */}
              <div className="animate-slide-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-medical-lg transition-colors duration-150 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                >
                  Try the demo
                </button>
                <button
                  type="button"
                  onClick={openUpload}
                  className="inline-flex items-center justify-center rounded-lg border border-primary-200 bg-white px-6 py-3.5 text-base font-semibold text-primary-700 shadow-medical transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                >
                  Upload your X-ray
                </button>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                No account, no install, nothing leaves your browser. The demo is
                a real foot radiograph with 19 bones mapped.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- Capabilities */}
        <section
          aria-labelledby="capabilities-heading"
          className="border-t border-neutral-200 bg-neutral-50"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="capabilities-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              What it actually does
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-700">
              Four things, done properly, rather than a long list done
              approximately.
            </p>

            <ul className="mt-10 grid gap-6 md:grid-cols-2">
              {CAPABILITIES.map((capability) => (
                <li
                  key={capability.title}
                  className="rounded-xl border border-neutral-200 bg-white p-6 shadow-medical sm:p-7"
                >
                  <CardIcon
                    path={capability.icon}
                    className={capability.iconClass}
                  />
                  <h3 className="font-display text-lg font-semibold leading-snug text-neutral-900">
                    {capability.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-neutral-800">
                    {capability.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------------- How it works */}
        <section
          aria-labelledby="how-heading"
          className="border-t border-neutral-200 bg-white"
        >
          {/*
            Shorter band than the sections around it: this is a three-beat strip
            proving the flow is short, so it gets less vertical room, a smaller
            type scale, and one line per step.
          */}
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <h2
              id="how-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              How it works
            </h2>

            {/* An ordered list because the order is the content. */}
            <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5"
                >
                  <span
                    className="font-display flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold leading-snug text-neutral-900">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ Audience */}
        <section
          aria-labelledby="audience-heading"
          className="border-t border-neutral-200 bg-neutral-50"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="audience-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              Who it is for
            </h2>

            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {AUDIENCES.map((audience) => (
                <li
                  key={audience.title}
                  className="rounded-xl border border-neutral-200 bg-white p-6 shadow-medical sm:p-7"
                >
                  <h3 className="font-display text-lg font-semibold leading-snug text-neutral-900">
                    {audience.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-neutral-800">
                    {audience.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------- Scope and coverage */}
        <section
          aria-labelledby="scope-heading"
          className="border-t border-neutral-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="scope-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              What it is, and what it is not
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-700">
              Both of these matter more than the feature list, so they are here
              and not in the small print.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {/*
                Coverage. One mapped radiograph is the honest number, and saying
                so up front is cheaper than a visitor discovering it after
                uploading a chest film.

                This card used to carry the extent of the coverage in prose too
                - that the foot is the only mapped body part, and that the
                body-part step admits it. The silhouette below now shows exactly
                that, labelled region by region, so the sentence came out rather
                than standing two blocks away from a picture of the same fact.
                What is left here is what the picker does not say: which
                radiograph the demo actually is, and how finely it is traced.
              */}
              <section
                aria-labelledby="coverage-heading"
                className="rounded-xl border border-accent-200 bg-accent-50 p-6 sm:p-7"
              >
                <h3
                  id="coverage-heading"
                  className="font-display text-lg font-semibold leading-snug text-accent-800"
                >
                  Mapped so far: one foot
                </h3>
                <p className="mt-2 text-base leading-relaxed text-accent-800">
                  The demo is a normal right foot in dorsoplantar projection,
                  with 19 bones traced individually against the image. The
                  silhouette below shows how much of the body that covers.
                </p>
              </section>

              {/*
                Scope statement. Wording deliberately tracks the standing
                disclaimer in EducationalPanel so a visitor meets the same
                boundary twice, phrased the same way, rather than a softer
                version in marketing and a firmer one in the product.
              */}
              <section
                aria-labelledby="disclaimer-heading"
                className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 sm:p-7"
              >
                <h3
                  id="disclaimer-heading"
                  className="font-display text-lg font-semibold leading-snug text-secondary-900"
                >
                  A learning tool, not a diagnosis
                </h3>
                <p className="mt-2 text-base leading-relaxed text-secondary-800">
                  BoneVision describes healthy anatomy in general. It does not
                  read your image, does not look for fractures, and says nothing
                  about your own health. If you have questions about an X-ray, an
                  injury, or symptoms, talk them through with your doctor or
                  another clinician.
                </p>
              </section>
            </div>

            {/*
              The coverage claim, shown instead of asserted. Nine labelled
              regions with one of them live is a far more honest answer to "does
              this cover my X-ray?" than a sentence claiming the same thing, and
              it doubles as a third way into the viewer.

              Deliberately outside the two-column grid above, for width. The
              picker's SVG is `max-w-[18rem]` and self-centering, and its
              caption needs room beside it, so it asked for at least 20rem of
              column. A cell of that `md:grid-cols-2` grid gives 18.25rem at the
              768px breakpoint (720px of content, less the 24px gap, halved,
              less 56px of card padding), which is under the floor. Full width
              gives 41.5rem there, and the inner wrapper below caps the picker
              at 28rem so a 1152px viewport does not leave it floating in a
              near-empty band. The cap only binds above 400px; narrower than
              that the SVG scales down on its own `w-full`.

              White surface, also deliberately. The picker's contrast table is
              computed against white, and its focus ring is a white halo under a
              dark stroke - on a dark band the halo vanishes into the backdrop
              and the indicator loses the one stroke carrying it over the
              region's own dark fill. So: `bg-white`, not the `primary-800` of
              the band below, and not the tinted `accent-50` of the coverage
              card it belongs with.
            */}
            <section
              aria-labelledby="map-reach-heading"
              className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-medical sm:p-7"
            >
              <h3
                id="map-reach-heading"
                className="font-display text-lg font-semibold leading-snug text-neutral-900"
              >
                Where the map reaches today
              </h3>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-neutral-800">
                The silhouette shows which parts of the body are mapped today
                and which are still to come. Pick the feet to load their bone
                map and go straight to the viewer.
              </p>

              <BodyRegionPicker
                onRegionSelected={openRegionInViewer}
                className="mx-auto mt-8 w-full max-w-md"
              />
            </section>
          </div>
        </section>

        {/* -------------------------------------------------------- Closing calls */}
        <section aria-labelledby="closing-heading" className="bg-primary-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="closing-heading"
              className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Have a look at the demo
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-100">
              It opens on a real radiograph with every bone already mapped, so
              there is nothing to set up. Bring your own image whenever you are
              ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={openDemo}
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-primary-800 transition-colors duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
              >
                Try the demo
              </button>
              <button
                type="button"
                onClick={openUpload}
                className="inline-flex items-center justify-center rounded-lg border border-primary-200 px-6 py-3.5 text-base font-semibold text-white transition-colors duration-150 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
              >
                Upload your X-ray
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex items-center gap-3">
            <BoneMark className="h-5 w-5 text-primary-600" />
            <p className="font-display text-base font-semibold text-primary-700">
              BoneVision
            </p>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600">
            Educational use only, and not a medical device. Images are processed
            in your browser and are not transmitted anywhere. The sample
            radiograph is &ldquo;X-ray of normal right foot by dorsoplantar
            projection&rdquo; by Mikael Häggström, public domain under CC0 1.0
            via{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:X-ray_of_normal_right_foot_by_dorsoplantar_projection.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-primary-700 underline underline-offset-2 transition-colors duration-150 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
            >
              Wikimedia Commons
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
