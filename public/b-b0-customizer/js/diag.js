// js/diag.js
//
// Renderer diagnostics, off by default. Add ?diag to the URL to switch on.
//
// WHY: "it's laggy" is not something you can act on. This turns it into
// numbers someone can screenshot and send you. It costs nothing when the flag
// isn't present — the whole file exits on line one.
//
// The single most useful number here is CANVAS. model-viewer sizes its
// drawing buffer as (CSS size x device pixel ratio), and doubling that ratio
// quadruples the work. A 500px element at ratio 3 is 1500x1500 = 2.25M pixels
// every frame; the same element at ratio 1.1 is 550x550 = 0.3M. Same model,
// same phone, seven times the cost.
//
// Works from the parent URL too: pixlnauts.com/?diag reaches in here, because
// the customizer iframe is same-origin.

(() => {
  const hasFlag = (w) => {
    try { return new URLSearchParams(w.location.search).has('diag'); }
    catch { return false; }
  };
  if (!hasFlag(window) && !hasFlag(window.top)) return;

  // ---- GPU identity, from a throwaway context so we don't disturb the real
  // one. Some browsers mask this for fingerprinting reasons; that's fine, the
  // masking itself is a useful signal.
  function gpuInfo() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return { version: 'none', renderer: 'no WebGL context' };
      const version = c.getContext('webgl2') ? 'WebGL2' : 'WebGL1';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      return { version, renderer: String(renderer || 'unknown') };
    } catch (e) {
      return { version: 'error', renderer: e.message };
    }
  }

  const box = document.createElement('div');
  box.id = 'bb0-diag';
  box.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'z-index:99999',
    'background:rgba(0,0,0,0.88)', 'color:#0f0', 'border:1px solid #0f0',
    'font:11px/1.5 monospace', 'padding:6px 8px', 'white-space:pre',
    'pointer-events:auto', 'max-width:60vw'
  ].join(';');
  document.body.appendChild(box);

  const close = document.createElement('span');
  close.textContent = ' [x]';
  close.style.cssText = 'color:#f44;cursor:pointer';
  close.onclick = () => box.remove();

  const lines = document.createElement('span');
  box.appendChild(lines);
  box.appendChild(close);

  const gpu = gpuInfo();

  // ---- frame timing. rAF only fires while something is actually being
  // drawn, so a low number here with a still model means idle, not slow.
  // Spin the model to get a meaningful reading.
  let frames = 0, fps = 0, last = performance.now();
  const tick = (now) => {
    frames++;
    if (now - last >= 1000) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  function report() {
    const mv = document.getElementById('model-viewer');
    const canvas = mv && mv.shadowRoot
      ? mv.shadowRoot.querySelector('canvas')
      : null;

    const cssW = mv ? Math.round(mv.getBoundingClientRect().width) : 0;
    const cssH = mv ? Math.round(mv.getBoundingClientRect().height) : 0;
    const bufW = canvas ? canvas.width : 0;
    const bufH = canvas ? canvas.height : 0;
    const megapixels = ((bufW * bufH) / 1e6).toFixed(2);

    // The ratio model-viewer actually got, which is not always
    // window.devicePixelRatio once a page is scaled or embedded.
    const effective = cssW ? (bufW / cssW).toFixed(2) : '?';

    const embedded = window.self !== window.top;

    lines.textContent = [
      `FPS       ${fps}`,
      `CANVAS    ${bufW}x${bufH}  (${megapixels} MP)`,
      `ELEMENT   ${cssW}x${cssH} css`,
      `DPR       ${window.devicePixelRatio}  effective ${effective}`,
      `VIEWPORT  ${window.innerWidth}x${window.innerHeight} css`,
      `SCREEN    ${screen.width}x${screen.height}`,
      `FRAME     ${embedded ? 'in iframe' : 'top level'}`,
      `GL        ${gpu.version}`,
      `GPU       ${gpu.renderer}`,
      `TABLE     ${typeof collisionTable !== 'undefined' && collisionTable.ready
        ? collisionTable.meta.pairs + ' pairs'
        : 'not loaded'}`
    ].join('\n');
  }

  report();
  setInterval(report, 500);
})();
