// Model-viewer based scene initialization
// This replaces the Three.js scene setup with model-viewer

let modelViewer; // Reference to the model-viewer element
let currentGLB = null; // Store the current combined GLB
// Note: performanceMode is declared in utils.js

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
      // Match the original Three.js camera position
      modelViewer.cameraOrbit = '-2.5rad 75deg 6.5m';
      modelViewer.fieldOfView = '40deg';
      log('Camera reset to default position');
    }
  });
  
  // Handle auto-rotate toggle
  let autoRotateEnabled = true;
  const autoRotateToggle = document.getElementById('auto-rotate-toggle');
  
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
  
  // Handle performance mode toggle
  const performanceToggle = document.getElementById('performance-toggle');
  
  performanceToggle.addEventListener('click', () => {
    togglePerformanceMode();
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
      // Performance mode: disable shadows and reduce quality
      modelViewer.shadowIntensity = 0;
      modelViewer.environmentImage = null;
      log("Performance mode enabled - reduced quality");
    } else {
      // High quality mode: enable shadows and lighting
      modelViewer.shadowIntensity = 1;
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