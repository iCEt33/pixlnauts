// js/dpr-fix.js
//
// Must load BEFORE model-viewer.
//
// THE PROBLEM:
// On mobile the React app gives this iframe a 880px-wide box and shrinks it
// with transform: scale(). A CSS transform does NOT change devicePixelRatio,
// so model-viewer still believes it is on a 3x screen and sizes its drawing
// buffer as (element CSS width x 3). Measured on a Pixel-class phone:
//
//   ELEMENT   504x504 css
//   CANVAS    1500x1500  (2.25 MP)
//
// but the element only occupies ~233 CSS px once the transform is applied,
// which is ~700 device pixels. So it renders 2.25 megapixels to display about
// 0.49 — roughly 4.5x the necessary work, every frame. A flagship absorbs it.
// A mid-range phone would not.
//
// THE FIX:
// Report the ratio the element is actually displayed at:
//
//   effective = realDpr x (visual width / layout width)
//
// getBoundingClientRect() on the iframe element returns its POST-transform
// size in the parent's CSS pixels, and clientWidth inside here is the layout
// width the parent assigned (880). Their ratio is the scale factor.
//
// WHY A LIVE GETTER RATHER THAN A ONE-OFF ASSIGNMENT:
// model-viewer's updateRendererSize() calls resolveDpr() every frame and
// re-sizes when the value changes. So this self-corrects: if the parent's
// ResizeObserver hasn't applied the transform yet, or the container is still
// mid-transition, or the phone is rotated, the next frame picks up the new
// number. No load-order race to get right.
//
// Only applies inside an iframe. At the top level the browser already folds
// the viewport scale into devicePixelRatio for us.

(() => {
  if (window.self === window.top) return;

  let frame;
  try {
    frame = window.frameElement;   // throws if the parent is cross-origin
  } catch {
    return;
  }
  if (!frame) return;

  // Capture the real value before the getter shadows it.
  const realDpr = window.devicePixelRatio;
  window.__realDevicePixelRatio = realDpr;   // so diag.js can still show it

  const effectiveDpr = () => {
    const layoutWidth = document.documentElement.clientWidth || window.innerWidth;
    const visualWidth = frame.getBoundingClientRect().width;

    // Before layout settles either can be 0. Fall back rather than divide.
    if (!layoutWidth || !visualWidth) return realDpr;

    const scale = visualWidth / layoutWidth;

    // Clamp: never ask for more than the real ratio, and keep a floor so a
    // measurement taken mid-transition can't collapse the canvas to a smear.
    return Math.max(0.75, Math.min(realDpr, realDpr * scale));
  };

  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    get: effectiveDpr
  });
})();
