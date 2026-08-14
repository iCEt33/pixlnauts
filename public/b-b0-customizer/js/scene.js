// Model-viewer based scene initialization
// This replaces the Three.js scene setup with model-viewer

let modelViewer; // Reference to the model-viewer element
let currentGLB = null; // Store the current combined GLB
// Note: performanceMode is declared in utils.js

// ---- CAMERA FRAMING ---------------------------------------------------
// These numbers used to be copy-pasted into four files. They live here now.
//
// camera-target was on 'auto', which tracks the bounding-box centre -- put a
// hat on and the whole robot slid DOWN to stay centred. Pinned, the body
// sits in the same place regardless of what is on its head. Measured from a
// build with no head accessory.
const CAMERA_TARGET = '-1m 19.3m 0.05m';
const CAMERA_FOV    = '40deg';

// Snapshot and mint always shoot from base-model distance, so every picture
// in the collection is framed identically. Hats above ~3.67 units run off
// the top on purpose -- the buyer sees the whole thing in the 3D renderer.
const CAPTURE_RADIUS = 6.5;

// The builder pulls back as the build gets taller, so you can see the hat
// you are shopping for. Every part measured so far stands on the same floor
// (bottom = 18.0), so height alone is enough to know how tall a build is.
// If a part ever changes that, switch this to key off the bounding-box top.
const VIEW_RADIUS_NEAR = 6.5;   // at HEIGHT_BASE
const VIEW_RADIUS_FAR  = 8.5;   // at HEIGHT_TALL and beyond
const HEIGHT_BASE = 2.6;
const HEIGHT_TALL = 3.4;

const viewRadiusFor = (height) => {
  const t = Math.min(1, Math.max(0, (height - HEIGHT_BASE) / (HEIGHT_TALL - HEIGHT_BASE)));
  return VIEW_RADIUS_NEAR + t * (VIEW_RADIUS_FAR - VIEW_RADIUS_NEAR);
};

let viewRadius = VIEW_RADIUS_NEAR;   // recomputed on every model load

// Note this keeps whatever theta/phi the user has orbited to -- only the
// distance moves. Snapping the rotation back on every part swap would be
// maddening when you are turning a robot around to look at it.
const applyViewFraming = () => {
  const o = modelViewer.getCameraOrbit();
  modelViewer.cameraTarget = CAMERA_TARGET;
  modelViewer.cameraOrbit  = `${o.theta}rad ${o.phi}rad ${viewRadius.toFixed(2)}m`;
  modelViewer.fieldOfView  = CAMERA_FOV;
};

// Applied before a capture, undone after. Without the undo, the first
// snapshot leaves a tall robot stuck at base framing -- hat cut off in the
// live view -- for the rest of the session.
//
// Also absorbs the interaction-prompt suppression that snapshot.js and
// mint-adapter.js each used to do for themselves. The prompt's "wiggle"
// ROTATES the model to hint that it can be dragged, and it fires after ~3s
// of no interaction -- exactly when someone is reading the price panel.
const applyCaptureFraming = () => {
  const o = modelViewer.getCameraOrbit();
  const saved = {
    rotating: modelViewer.hasAttribute('auto-rotate'),
    prompt:   modelViewer.getAttribute('interaction-prompt'),
    theta: o.theta,
    phi:   o.phi,
  };
  if (saved.rotating) modelViewer.removeAttribute('auto-rotate');
  modelViewer.setAttribute('interaction-prompt', 'none');
  modelViewer.resetTurntableRotation();
  modelViewer.cameraTarget = CAMERA_TARGET;
  modelViewer.cameraOrbit  = `-28deg 90deg ${CAPTURE_RADIUS}m`;
  modelViewer.fieldOfView  = CAMERA_FOV;
  // camera-target is DAMPED: setTarget() only sets a goal, and
  // getCameraTarget() reports that goal immediately -- so no settle loop can
  // tell whether it is still gliding. Jump instead of easing and the race is
  // gone. NOTE the jump is deferred through Lit + a microtask, so callers
  // must still await waitForCameraToSettle (which uses rAF) before shooting.
  modelViewer.jumpCameraToGoal();
  return saved;
};

const restoreViewFraming = (saved) => {
  if (!saved) return;                 // capture framing never got applied
  modelViewer.cameraTarget = CAMERA_TARGET;
  modelViewer.cameraOrbit  = `${saved.theta}rad ${saved.phi}rad ${viewRadius.toFixed(2)}m`;
  modelViewer.fieldOfView  = CAMERA_FOV;
  // deliberately no jump -- easing back into the builder view looks better
  // than a hard cut, and nothing is being measured on the way out
  if (saved.rotating) modelViewer.setAttribute('auto-rotate', '');
  if (saved.prompt === null) modelViewer.removeAttribute('interaction-prompt');
  else modelViewer.setAttribute('interaction-prompt', saved.prompt);
};

// Initialize model-viewer
const initScene = () => {
  log("Initializing model-viewer...");
  
  modelViewer = document.getElementById('model-viewer');
  
  if (!modelViewer) {
    log("ERROR: model-viewer element not found!");
    return;
  }
  
  // Set up event listeners for model-viewer
  modelViewer.addEventListener('load', () => {
    log("Model-viewer loaded successfully");
    // getDimensions() is only valid once the model has loaded and framed.
    viewRadius = viewRadiusFor(modelViewer.getDimensions().y);
    applyViewFraming();
    hideLoadingOverlay();
  });
  
  modelViewer.addEventListener('error', (event) => {
    log(`Model-viewer error: ${event.detail}`);
    hideLoadingOverlay();
  });
  
  // Handle camera reset
  document.getElementById('camera-reset').addEventListener('click', () => {
    if (modelViewer) {
      modelViewer.resetTurntableRotation();
      // Resets to the CURRENT build's framing, not a hardcoded distance --
      // otherwise this button drags a tall robot back to clipped framing.
      modelViewer.cameraTarget = CAMERA_TARGET;
      modelViewer.cameraOrbit  = `-28deg 90deg ${viewRadius.toFixed(2)}m`;
      modelViewer.fieldOfView  = CAMERA_FOV;
      log('Camera reset to default position');
    }
  });
  
  // Handle auto-rotate toggle
  let autoRotateEnabled = false;
  const autoRotateToggle = document.getElementById('auto-rotate-toggle');
  
  autoRotateToggle.textContent = `Auto Rotate: OFF`;
  autoRotateToggle.classList.remove('active');
  
  autoRotateToggle.addEventListener('click', () => {
    autoRotateEnabled = !autoRotateEnabled;
    
    if (modelViewer) {
      if (autoRotateEnabled) {
        modelViewer.setAttribute('auto-rotate', '');
      } else {
        modelViewer.removeAttribute('auto-rotate');
      }
    }
    
    autoRotateToggle.textContent = `Auto Rotate: ${autoRotateEnabled ? 'ON' : 'OFF'}`;
    autoRotateToggle.classList.toggle('active', autoRotateEnabled);
    
    log(`Auto-rotation ${autoRotateEnabled ? 'enabled' : 'disabled'}`);
  });
  
  log("Model-viewer initialized successfully");
};

// Toggle performance mode
const togglePerformanceMode = () => {
  performanceMode = !performanceMode;
  
  const performanceToggle = document.getElementById('performance-toggle');
  performanceToggle.textContent = `Performance Mode: ${performanceMode ? 'ON' : 'OFF'}`;
  performanceToggle.classList.toggle('active', performanceMode);
  
  if (modelViewer) {
    if (performanceMode) {
      // Performance mode: disable shadows completely and reduce quality
      modelViewer.removeAttribute('shadow-intensity');
      modelViewer.environmentImage = null;
      log("Performance mode enabled - reduced quality");
    } else {
      // High quality mode: enable shadows and lighting
      modelViewer.setAttribute('shadow-intensity', '1');
      modelViewer.environmentImage = 'neutral';
      log("High quality mode enabled - full quality");
    }
  }
};

// Show loading overlay
const showLoadingOverlay = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
};

// Hide loading overlay
const hideLoadingOverlay = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
};