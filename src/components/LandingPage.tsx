/**
 * LandingPage
 *
 * The front door at `#/`. Its whole job is to tell a first-time visitor what
 * SkeletonMap is and put them into the viewer in the right mode, so every claim
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
 * Nothing is fetched by rendering this page. The demo radiograph is 836KB, so
 * it waits for a call to action. There is a test holding that still, and it
 * clicks through afterwards so the absence cannot pass for a dead spy.
 *
 *
 * Layout
 * ------
 * Single column by default, fanning out at `md` (768px) per requirement 8.1/8.2.
 * Type scale steps up at `sm`/`lg` so the hero does not overflow a 320px
 * viewport, which `body { min-width: 320px }` sets as the floor.
 *
 * Figures
 * -------
 * Two photographic frames, both derived from the CC0 radiograph the demo
 * itself loads and both in the hero: the forefoot crop, and the whole foot
 * beside it. They are content, not decoration - a visitor deciding whether
 * this tool is for them wants to see the kind of image it reads - so each has
 * descriptive alt text and none of them is `aria-hidden`. No illustration is
 * authored by hand here; a drawn approximation of a radiograph would be both
 * uglier and less honest than the real thing.
 *
 * Their `src` goes through `import.meta.env.BASE_URL` rather than a leading
 * slash. Pages serves this app from `/SkeletonMap/`, so `/landing/x.webp` is a
 * 404 there while resolving fine in dev - the failure only shows up after
 * deploy, which it has done once already on this project.
 *
 * `width`/`height` are set on both so the browser reserves the right box before
 * the bytes land; the Tailwind `h-auto w-full` keeps that box responsive
 * instead of pinning it to the intrinsic size. Neither is `loading="lazy"`:
 * both sit above the fold now, and deferring an image the page opens on buys
 * nothing. `decoding="async"` stays on both, since WebP decoded off the main
 * thread cannot hold up the headline.
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
 *   accent-800 on accent-50 ............. 8.15:1   capability icon
 *   secondary-900 on secondary-50 ....... 8.87:1   capability icon
 * neutral-500 (4.74:1 on white) is avoided throughout: it clears AA only just,
 * and not at all once a tint sits under it. Body text stops at neutral-600.
 *
 * _Requirements: 9.1, 9.4, 9.5, 7.6, 1.1, 6.5, 15.4, 8.1, 8.2, 8.7, 13.1,
 * 13.2, 13.3, 13.4_
 */

import useSkeletonMapStore from '../stores/useSkeletonMapStore';
import { navigateToRoute } from '../hooks/useHashRoute';
import SkeletonMapMark from './SkeletonMapMark';

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
    title: 'Hover one side, both light up',
    body: 'Point at a bone on the radiograph and the matching bone on the 3D model takes the same colour. It works model-to-image as well. Click, and the model turns to face what you picked.',
    icon: ICON.sync,
    iconClass: 'bg-primary-50 text-primary-700',
  },
  {
    title: 'What each bone is for',
    body: 'Each region comes with a short write-up of what the bone does and the injuries it tends to collect. The language assumes no medical training.',
    icon: ICON.speech,
    iconClass: 'bg-secondary-50 text-secondary-900',
  },
  {
    title: 'Your image stays with you',
    body: 'Your file is decoded and drawn inside the browser, and it never leaves. Close the tab and it is gone.',
    icon: ICON.shield,
    iconClass: 'bg-success-50 text-success-800',
  },
  {
    title: 'Bones individually explorable',
    body: 'The demo radiograph is traced region by region - 19 of them, reaching from the heel bone to the tip of the big toe. Each has its own outline and its own entry in the panel.',
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

/**
 * Three audiences, deliberately written to three different shapes: a second
 * person opener, a subject-first one, and a short closer. They used to run to
 * the same two-sentence template, which read like filled-in boilerplate once
 * you saw all three in a row.
 */
const AUDIENCES = [
  {
    title: 'Patients',
    body: 'You came home with a grey picture and the name of a bone you half remember. Find it on the image, then look at what sits around it.',
  },
  {
    title: 'Students',
    body: 'Radiographic anatomy asks you to hold a flat projection and a solid shape in mind at once. Seeing the two linked on screen does some of that work for you.',
  },
  {
    title: 'Clinicians',
    body: 'An explanation you can point at goes faster. Show the bone on the film and let the model carry the spatial half.',
  },
];

/**
 * Roadmap, and labelled as one everywhere it is rendered. Neither entry is
 * implemented, so each carries its own stage word and the copy stays out of the
 * present tense - a visitor who skims this section must not come away thinking
 * the tool already inspects an image. The second entry is the regulated one:
 * software that marks findings on a radiograph is a medical device, which is
 * what the caveat under the grid exists to say before anyone assumes otherwise.
 *
 * Two entries, not three. The page has enough trios on it already, and padding
 * a roadmap to fill a row is how a plan turns into a promise.
 */
const ROADMAP = [
  {
    stage: 'Planned',
    title: 'Train on real biological data',
  },
  {
    stage: 'Further out',
    title: 'Point out the parts of an X-ray that look unusual',
  },
];

export default function LandingPage() {
  const setMode = useSkeletonMapStore((state) => state.setMode);

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
            <SkeletonMapMark />
          </span>
          <p className="font-display text-lg font-bold leading-tight text-primary-700">
            SkeletonMap
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
            {/*
              Copy left, radiographs right from `md` up; stacked below that,
              with the images second so a phone still opens on the headline. The
              columns are 3fr/2fr because the frames only need enough room to
              read as radiographs, and the headline wants more than half the
              width.
            */}
            <div className="grid items-center gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-12 lg:gap-14">
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
                  SkeletonMap puts a radiograph next to an interactive 3D
                  skeleton and keeps the two in step.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
                  Hover a bone on the image and the same bone lights up on the
                  model, with a plain-language note on what it does.
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
              </div>

              {/*
                Both frames above the fold, so neither takes `loading="lazy"`:
                deferring the images the page opens on would hand the visitor an
                empty panel for a beat. `decoding="async"` is still worth
                having, since WebP decoded off the main thread cannot delay the
                headline.

                Side by side rather than stacked, and the whole foot narrower
                than the forefoot crop: at 393x900 against 646x700 the two end
                up close to the same rendered height that way, instead of one
                frame towering over the other. They share one row so the pair
                reads as a single figure beside the copy.
              */}
              <div className="animate-fade-in mx-auto flex w-full max-w-sm items-start gap-3 md:mx-0 md:max-w-none">
                <div className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-xray-dark p-3 shadow-medical-lg">
                  <img
                    src={`${import.meta.env.BASE_URL}landing/xray-forefoot.webp`}
                    alt="Radiograph of the front half of a right foot, seen from above: the five long metatarsal bones fan out from the midfoot towards the toe joints."
                    width={646}
                    height={700}
                    decoding="async"
                    className="h-auto w-full rounded-xl"
                  />
                </div>
                <div className="w-[32%] flex-none rounded-2xl border border-neutral-200 bg-xray-dark p-3 shadow-medical-lg">
                  <img
                    src={`${import.meta.env.BASE_URL}landing/xray-hero.webp`}
                    alt="Radiograph of a whole normal right foot, seen from above: toe bones along the top, the long metatarsals through the middle, and the heel bone at the bottom."
                    width={393}
                    height={900}
                    decoding="async"
                    className="h-auto w-full rounded-xl"
                  />
                </div>
              </div>
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
              What is SkeletonMap
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-700">
              An educational X-ray reader that runs entirely in the browser,
              built around one fully mapped radiograph.
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

        {/* ------------------------------------------------------------- Roadmap */}
        <section
          aria-labelledby="roadmap-heading"
          className="border-t border-neutral-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="roadmap-heading"
              className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl"
            >
              What&rsquo;s next
            </h2>

            <ul className="mt-10 grid gap-6 md:grid-cols-2">
              {ROADMAP.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-7"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                    {item.stage}
                  </p>
                  <h3 className="font-display mt-2 text-lg font-semibold leading-snug text-neutral-900">
                    {item.title}
                  </h3>
                </li>
              ))}
            </ul>

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
              It opens on a real radiograph with the bone map already loaded, so
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
            <SkeletonMapMark className="h-5 w-5 text-primary-600" />
            <p className="font-display text-base font-semibold text-primary-700">
              SkeletonMap
            </p>
          </div>
          {/*
            The credit has to cover the two radiographs on this page as well as
            the one inside the demo, since both are resized and cropped
            derivatives of the same CC0 original. CC0 asks for nothing, but a
            health-adjacent page that shows someone else's radiograph without
            saying whose is a bad look regardless of the licence.
          */}
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600">
            Educational use only, and not a medical device. Images are processed
            in your browser and are not transmitted anywhere. The radiographs
            shown here, and the one loaded by the demo, are resized or cropped
            versions of &ldquo;X-ray of normal right foot by dorsoplantar
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
