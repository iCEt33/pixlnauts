// Global variables that will be shared across modules
let scene, camera, renderer, controls;
let loadingManager, gltfLoader;
let performanceMode = false;
let reflectionEnabled = true;
let ambientLight, mainLight, fillLight, backLight, rimLight;

// Reflection elements
let reflectionCamera;
let modelContainer;
let groundMaterial;
let cubeCamera;
let cubeRenderTarget;
let mirrorGroup = null;

// Post-processing
let composer;
let bloomPass;

// Keep track of loaded models by category
const loadedModels = {
  body: null,
  face: null,
  screen: null,
  specs: null,
  accessories: {
    clothes: null,
    face: null,
    head: null
  },
  // Add a new object to track the latest load request for each category
  latestRequests: {}
};

// Keep track of current selections
const currentSelections = {
  body: 0,
  face: 0,
  screen: 0,
  specs: 0,
  "accessories-clothes": 0,
  "accessories-face": 0,
  "accessories-head": 0
};

// Function to fully reset all models to default selections
const resetAllModels = () => {
  // Reset all selection indices to their defaults
  currentSelections.body = 0;
  currentSelections.face = 0;
  currentSelections.screen = 0;
  currentSelections.specs = 0;
  currentSelections["accessories-clothes"] = 0;
  currentSelections["accessories-face"] = 0;
  currentSelections["accessories-head"] = 0;
  
  // Update all carousels to reflect the default selections
  updateAllCarousels();
  
  // Reset selection styles to clear any collision indicators
  resetSelectionStyles();
  
  // IMPORTANT: First properly remove ALL accessories from the scene
  // This ensures they are actually removed from the 3D scene
  if (loadedModels.accessories.clothes) {
    modelContainer.remove(loadedModels.accessories.clothes);
    loadedModels.accessories.clothes = null;
    log(`Removed clothes accessory during reset`);
  }
  
  if (loadedModels.accessories.face) {
    modelContainer.remove(loadedModels.accessories.face);
    loadedModels.accessories.face = null;
    log(`Removed face accessory during reset`);
  }
  
  if (loadedModels.accessories.head) {
    modelContainer.remove(loadedModels.accessories.head);
    loadedModels.accessories.head = null;
    log(`Removed head accessory during reset`);
  }
  
  // Reset all latest request tracking
  loadedModels.latestRequests = {};
  
  // Load the default models
  loadDefaultModels();
  
  // Update prices
  updatePrices();
  
  log("All models reset to defaults");
};

// Function to reset styling on selection UI elements
const resetSelectionStyles = () => {
  // Reset all carousel current elements to remove any special styling classes
  document.querySelectorAll('.carousel-current').forEach(element => {
    // Remove any collision or loading indicators
    element.classList.remove('collision');
    element.classList.remove('loading');
    
    // Reset active status based on whether item is 'none' or not
    const category = element.getAttribute('data-category');
    if (category) {
      // For accessory categories, first item (index 0) is always 'none'
      if (category.includes('accessories-')) {
        // First item is 'none', so not active
        element.classList.remove('active');
      } else {
        // For main categories, all items are valid so show as active
        element.classList.add('active');
      }
    }
  });
  
  // Reset collision tracking
  for (const key in collidingAccessories) {
    collidingAccessories[key] = false;
  }
  
  // Hide any collision warnings
  hideCollisionWarning();
  
  log("Selection styles reset to defaults");
};

// Keep track of accessory collisions
let collisionCheckEnabled = true;
let currentCollision = null;

// Track colliding accessories
const collidingAccessories = {
  'clothes': false,
  'face': false,
  'head': false
};

// Loading queue to manage multiple simultaneous loads
let loadingQueue = 0;

// Debug logger function
const log = (message) => {
  const debugPanel = document.getElementById('debug-panel');
  const logEntry = document.createElement('div');
  logEntry.textContent = message;
  debugPanel.appendChild(logEntry);
  debugPanel.scrollTop = debugPanel.scrollHeight;
  
  // Also log to console for easier debugging
  console.log(message);
};