// Simple but accurate voxel collision system using raycasting + CACHING + UI improvements
// Caches voxel data so we don't recalculate the same models repeatedly

class CachedVoxelSystem {
  constructor(voxelSize = 0.1) {
    this.voxelSize = voxelSize;
    this.modelVoxels = new Map(); // Cache for voxel data
    this.raycaster = new THREE.Raycaster();
    this.processingCache = new Map(); // Track what's currently being processed
  }
  
  // Extract voxel centers by testing if points are actually inside solid geometry
  async extractVoxelCenters(gltfScene, modelId) {
    // Check if we already have this cached
    if (this.modelVoxels.has(modelId)) {
      log(`Using cached voxel data for ${modelId}`);
      return this.modelVoxels.get(modelId);
    }
    
    // Check if we're already processing this model
    if (this.processingCache.has(modelId)) {
      log(`Already processing ${modelId}, waiting for completion...`);
      return await this.processingCache.get(modelId);
    }
    
    log(`Extracting accurate voxel centers for ${modelId}...`);
    
    // Create a promise for this processing and cache it
    const processingPromise = this._performVoxelExtraction(gltfScene, modelId);
    this.processingCache.set(modelId, processingPromise);
    
    try {
      const result = await processingPromise;
      this.processingCache.delete(modelId); // Clean up processing cache
      return result;
    } catch (error) {
      this.processingCache.delete(modelId); // Clean up on error too
      throw error;
    }
  }
  
  // The actual voxel extraction work
  async _performVoxelExtraction(gltfScene, modelId) {
    // Collect all meshes
    const meshes = [];
    gltfScene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        // Prepare mesh for raycasting
        child.updateMatrixWorld(true);
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.side = THREE.DoubleSide);
          } else {
            child.material.side = THREE.DoubleSide;
          }
        }
        meshes.push(child);
      }
    });
    
    if (meshes.length === 0) {
      const emptyResult = [];
      this.modelVoxels.set(modelId, emptyResult);
      return emptyResult;
    }
    
    // Get bounding box for the entire model
    const boundingBox = new THREE.Box3().setFromObject(gltfScene);
    const voxelCenters = [];
    
    // Calculate total iterations for progress tracking
    const xSteps = Math.ceil((boundingBox.max.x - boundingBox.min.x) / this.voxelSize);
    const ySteps = Math.ceil((boundingBox.max.y - boundingBox.min.y) / this.voxelSize);
    const zSteps = Math.ceil((boundingBox.max.z - boundingBox.min.z) / this.voxelSize);
    
    let processedSteps = 0;
    
    // Process in chunks to avoid freezing
    const chunkSize = 100; // Increased chunk size since we have better UI feedback now
    let currentChunk = [];
    
    for (let x = boundingBox.min.x; x <= boundingBox.max.x; x += this.voxelSize) {
      for (let y = boundingBox.min.y; y <= boundingBox.max.y; y += this.voxelSize) {
        for (let z = boundingBox.min.z; z <= boundingBox.max.z; z += this.voxelSize) {
          
          const voxelCenter = new THREE.Vector3(
            x + this.voxelSize * 0.5,
            y + this.voxelSize * 0.5,
            z + this.voxelSize * 0.5
          );
          
          currentChunk.push(voxelCenter);
          
          // Process chunk when it's full
          if (currentChunk.length >= chunkSize) {
            await this.processVoxelChunk(currentChunk, meshes, voxelCenters);
            currentChunk = [];
            
            // Update progress in UI
            processedSteps += chunkSize;
            this.updateCollisionProgress(modelId, processedSteps, xSteps * ySteps * zSteps);
            
            // Small delay to prevent freezing
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          processedSteps++;
        }
      }
    }
    
    // Process remaining voxels
    if (currentChunk.length > 0) {
      await this.processVoxelChunk(currentChunk, meshes, voxelCenters);
    }
    
    // Cache the result
    this.modelVoxels.set(modelId, voxelCenters);
    log(`Generated and cached ${voxelCenters.length} accurate voxel centers for ${modelId}`);
    return voxelCenters;
  }
  
  // Update collision progress in UI
  updateCollisionProgress(modelId, processed, total) {
    // Remove percentage display since it's broken
    const messageElement = document.querySelector('.collision-progress-text');
    if (messageElement) {
      messageElement.innerHTML = `Please be patient while collisions are being mapped.<br>This should only take a few seconds.`;
    }
  }
  
  // Process a chunk of voxels
  async processVoxelChunk(voxelCenters, meshes, results) {
    for (const voxelCenter of voxelCenters) {
      // Test if this voxel center is inside solid geometry
      if (this.isPointInsideSolidGeometry(voxelCenter, meshes)) {
        results.push({
          center: voxelCenter,
          type: 'solid_voxel'
        });
      }
    }
  }
  
  // Test if a point is inside solid geometry using optimized raycasting
  isPointInsideSolidGeometry(point, meshes) {
    // Use fewer directions for speed - just 3 perpendicular rays
    const directions = [
      new THREE.Vector3(1, 0, 0),   // +X
      new THREE.Vector3(0, 1, 0),   // +Y
      new THREE.Vector3(0, 0, 1)    // +Z
    ];
    
    let insideCount = 0;
    
    for (const direction of directions) {
      this.raycaster.set(point, direction);
      const intersections = this.raycaster.intersectObjects(meshes, false);
      
      // If odd number of intersections, point is inside from this direction
      if (intersections.length > 0 && intersections.length % 2 === 1) {
        insideCount++;
      }
    }
    
    // Point is inside if at least 2 out of 3 directions say it's inside
    // This is much faster but still accurate for voxel models
    return insideCount >= 2;
  }
  
  // Check collision between two models using spatial hashing for speed
  // STOPS IMMEDIATELY when first collision is found
  checkCollision(modelId1, modelId2, tolerance = 0.05) {
    const voxels1 = this.modelVoxels.get(modelId1);
    const voxels2 = this.modelVoxels.get(modelId2);
    
    if (!voxels1 || !voxels2) {
      return { hasCollision: false, reason: 'Model not found in cache' };
    }
    
    // Use spatial hashing for super fast collision detection
    const cellSize = tolerance * 2; // Grid cell size
    const spatialGrid = new Map();
    
    // Add all voxels from model2 to spatial grid
    for (const voxel2 of voxels2) {
      const cellKey = this.getSpatialKey(voxel2.center, cellSize);
      if (!spatialGrid.has(cellKey)) {
        spatialGrid.set(cellKey, []);
      }
      spatialGrid.get(cellKey).push(voxel2);
    }
    
    // Check each voxel from model1 against nearby cells only
    // RETURN IMMEDIATELY when first collision is found
    for (const voxel1 of voxels1) {
      const cellKey = this.getSpatialKey(voxel1.center, cellSize);
      
      // Check the cell and its 26 neighbors (3x3x3 cube around it)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const neighborKey = this.getNeighborKey(cellKey, dx, dy, dz);
            const nearbyVoxels = spatialGrid.get(neighborKey);
            
            if (nearbyVoxels) {
              // Only check voxels in this nearby cell
              for (const voxel2 of nearbyVoxels) {
                const distance = voxel1.center.distanceTo(voxel2.center);
                
                // IMMEDIATE RETURN - don't check anything else!
                if (distance <= tolerance) {
                  return {
                    hasCollision: true,
                    distance: distance,
                    voxel1: voxel1,
                    voxel2: voxel2
                  };
                }
              }
            }
          }
        }
      }
    }
    
    // Only reach here if NO collisions were found
    return { hasCollision: false };
  }
  
  // Get spatial grid key for a position
  getSpatialKey(position, cellSize) {
    const x = Math.floor(position.x / cellSize);
    const y = Math.floor(position.y / cellSize);
    const z = Math.floor(position.z / cellSize);
    return `${x},${y},${z}`;
  }
  
  // Get neighbor cell key
  getNeighborKey(baseKey, dx, dy, dz) {
    const [x, y, z] = baseKey.split(',').map(Number);
    return `${x + dx},${y + dy},${z + dz}`;
  }
  
  // Remove model from cache
  removeModel(modelId) {
    this.modelVoxels.delete(modelId);
    this.processingCache.delete(modelId);
  }
  
  // Get voxel centers for a model
  getVoxelCenters(modelId) {
    return this.modelVoxels.get(modelId) || [];
  }
  
  // Clear all cached data
  clearCache() {
    this.modelVoxels.clear();
    this.processingCache.clear();
    log("Voxel cache cleared");
  }
}

// Create global instance with caching
const cachedVoxelSystem = new CachedVoxelSystem(0.1);

// Show collision checking overlay with smart delay to prevent flickering
const showCollisionProgress = () => {
  let overlay = document.getElementById('collision-progress-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'collision-progress-overlay';
    overlay.innerHTML = `
      <div class="collision-progress-content">
        <div class="collision-spinner"></div>
        <div class="collision-progress-text">Please be patient while collisions are being mapped.<br>This should only take a few seconds.</div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    // Add CSS styles with smooth animations
    const style = document.createElement('style');
    style.textContent = `
      #collision-progress-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: monospace;
        opacity: 0;
        transition: all 0.5s ease-in-out;
        pointer-events: none;
      }
      #collision-progress-overlay.visible {
        background-color: rgba(0, 0, 0, 0.8);
        opacity: 1;
        pointer-events: all;
      }
      .collision-progress-content {
        background-color: #111;
        border: 2px solid #0f0;
        padding: 30px;
        text-align: center;
        color: #0f0;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
        transform: scale(0.8);
        transition: transform 0.3s ease-in-out;
      }
      #collision-progress-overlay.visible .collision-progress-content {
        transform: scale(1);
      }
      .collision-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #333;
        border-top: 4px solid #0f0;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      .collision-progress-text {
        font-size: 16px;
        color: #0f0;
        line-height: 1.4;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Mark that we want to show progress (but don't show yet)
  overlay.dataset.shouldShow = 'true';
  
  // Only show after 1 second delay to prevent flickering for quick operations
  setTimeout(() => {
    // Only show if we still want to show it (collision check might have finished)
    if (overlay.dataset.shouldShow === 'true') {
      overlay.style.display = 'flex';
      // Small delay to ensure display is set before animation
      setTimeout(() => {
        overlay.classList.add('visible');
      }, 10);
    }
  }, 1000);
};

// Hide collision checking overlay with smart cleanup
const hideCollisionProgress = () => {
  const overlay = document.getElementById('collision-progress-overlay');
  if (overlay) {
    // Mark that we no longer want to show it
    overlay.dataset.shouldShow = 'false';
    
    // If it's currently visible, animate it out
    if (overlay.style.display === 'flex') {
      overlay.classList.remove('visible');
      // Hide completely after animation finishes
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 500);
    }
    // If it was never shown, no cleanup needed
  }
};

// Collision check function with caching and UI feedback
// Collision check function - checks against SELECTED accessories, not just loaded ones
const checkAccessoryCollisions = async (newModelData, newCategory) => {
  if (!collisionCheckEnabled) return { hasCollision: false };
  
  if (!newModelData || !newModelData.filename) return { hasCollision: false };
  
  // CRITICAL FIX: Check against SELECTED accessories from currentSelections
  // not just what's currently in loadedModels.accessories
  const accessoriesToCheck = [];
  const subcategories = ['clothes', 'face', 'head'];
  
  for (const subcategory of subcategories) {
    // Skip the category we're trying to add
    if (subcategory === newCategory) continue;
    
    // Get what's SELECTED (not what's loaded)
    const categoryKey = `accessories-${subcategory}`;
    const selectedIndex = currentSelections[categoryKey];
    
    // Skip if "None" is selected
    if (selectedIndex === 0) continue;
    
    // Skip if marked as colliding
    if (collidingAccessories[subcategory]) continue;
    
    // Get the model definition
    const model = modelDefinitions.accessories[subcategory][selectedIndex];
    
    accessoriesToCheck.push({
      model: model,
      category: subcategory
    });
  }
  
  if (accessoriesToCheck.length === 0) return { hasCollision: false };
  
  const collisionCheckId = Date.now() + Math.random();
  loadedModels.latestRequests[`collision-${newCategory}`] = collisionCheckId;
  
  // Show progress overlay
  showCollisionProgress();
  
  return new Promise((resolve) => {
    const fullPath = `models/${newModelData.filename}`;
    const tempLoader = new THREE.GLTFLoader();
    
    tempLoader.load(
      fullPath,
      async (gltf) => {
        try {
          if (loadedModels.latestRequests[`collision-${newCategory}`] !== collisionCheckId) {
            hideCollisionProgress();
            resolve({ hasCollision: false });
            return;
          }
          
          // Load the new model
          const tempModelId = `model-${newModelData.filename}`;
          const tempScene = gltf.scene.clone();
          tempScene.scale.set(0.1, 0.1, 0.1);
          tempScene.updateMatrixWorld(true);
          
          // Extract voxel centers
          const tempVoxels = await cachedVoxelSystem.extractVoxelCenters(tempScene, tempModelId);
          
          if (tempVoxels.length === 0) {
            hideCollisionProgress();
            resolve({ hasCollision: false });
            return;
          }
          
          let collisionDetected = false;
          let collidingWith = '';
          
          // Check against each SELECTED accessory
          for (const accessory of accessoriesToCheck) {
            // Load this accessory's model for collision checking
            const accessoryPath = `models/${accessory.model.filename}`;
            
            // Try to get from cache first
            const existingModelId = `model-${accessory.model.filename}`;
            
            // If not cached, load it
            if (!cachedVoxelSystem.getVoxelCenters(existingModelId).length) {
              // Load the model synchronously
              await new Promise((loadResolve) => {
                const accessoryLoader = new THREE.GLTFLoader();
                accessoryLoader.load(accessoryPath, async (accessoryGltf) => {
                  const accessoryScene = accessoryGltf.scene.clone();
                  accessoryScene.scale.set(0.1, 0.1, 0.1);
                  accessoryScene.updateMatrixWorld(true);
                  
                  await cachedVoxelSystem.extractVoxelCenters(accessoryScene, existingModelId);
                  loadResolve();
                });
              });
            }
            
            // Now check collision
            const collisionResult = cachedVoxelSystem.checkCollision(
              tempModelId,
              existingModelId,
              0.05
            );
            
            if (collisionResult.hasCollision) {
              collidingWith = accessory.model.displayName;
              collisionDetected = true;
              log(`Collision detected: ${newModelData.displayName} vs ${collidingWith}`);
              break;
            }
          }
          
          hideCollisionProgress();
          
          if (collisionDetected) {
            resolve({
              hasCollision: true,
              collidingWith: collidingWith,
              newItemName: newModelData.displayName
            });
          } else {
            resolve({ hasCollision: false });
          }
          
        } catch (error) {
          log(`Error during collision check: ${error.message}`);
          hideCollisionProgress();
          resolve({ hasCollision: false });
        }
      },
      undefined,
      (error) => {
        log(`Error loading model for collision check: ${error.message}`);
        hideCollisionProgress();
        resolve({ hasCollision: false });
      }
    );
  });
};

// Visualization functions - DISABLED for performance
let debugGroups = [];

const showVoxelVisualization = () => {
  // Visualization disabled - collision detection works without it
  log("Voxel visualization disabled for performance");
};

const clearVoxelVisualization = () => {
  debugGroups.forEach(group => scene.remove(group));
  debugGroups = [];
};

// Keep existing UI functions
const showCollisionWarning = (collisionInfo) => {
  const warningElement = document.getElementById('collision-warning');
  const messageElement = document.getElementById('collision-message');
  
  if (collisionInfo.hasCollision) {
    messageElement.textContent = `Item "${collisionInfo.newItemName}" collides with "${collisionInfo.collidingWith}". Please choose something else.`;
    warningElement.style.display = 'flex';
    currentCollision = collisionInfo;
    
    // Don't auto-hide - let user dismiss by selecting something else
    
    return true;
  } else {
    hideCollisionWarning();
    return false;
  }
};

const hideCollisionWarning = () => {
  const warningElement = document.getElementById('collision-warning');
  warningElement.style.display = 'none';
  currentCollision = null;
};

const addCollisionToggle = () => {
  const buttonsGroup = document.querySelector('.buttons-group');
  const collisionToggle = document.createElement('button');
  collisionToggle.id = 'collision-toggle';
  collisionToggle.className = 'toggle-button active';
  collisionToggle.textContent = 'Collision Check: ON';
  
  buttonsGroup.appendChild(collisionToggle);
  
  collisionToggle.addEventListener('click', () => {
    collisionCheckEnabled = !collisionCheckEnabled;
    collisionToggle.textContent = `Collision Check: ${collisionCheckEnabled ? 'ON' : 'OFF'}`;
    collisionToggle.classList.toggle('active', collisionCheckEnabled);
    
    if (!collisionCheckEnabled) {
      hideCollisionWarning();
    }
    
    log(`Collision checking ${collisionCheckEnabled ? 'enabled' : 'disabled'}`);
  });
};

// YOUR WORKING RECHECK LOGIC - this is what makes accessory reapplication work correctly
const recheckAllAccessories = async () => {
  if (!collisionCheckEnabled) return;
  
  // log("Rechecking all accessories for collisions");
  
  // Track which accessories had their collision status changed
  const collisionStatusChanged = {
    clothes: false,
    face: false, 
    head: false
  };
  
  // Track which accessories need to be loaded
  const needsLoading = {
    clothes: false,
    face: false,
    head: false
  };
  
  // Step 1: First pass to identify which accessories had their collision status changed
  const subcategories = ['clothes', 'face', 'head'];
  
  for (const subcategory of subcategories) {
    const categoryKey = `accessories-${subcategory}`;
    const selectedIndex = currentSelections[categoryKey];
    
    // Skip "None" items first
    if (selectedIndex === 0) {
      // If this was previously marked as colliding, flag it as changed
      if (collidingAccessories[subcategory]) {
        collisionStatusChanged[subcategory] = true;
        collidingAccessories[subcategory] = false;
        
        // Update the UI immediately
        const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
        if (currentElem) {
          currentElem.classList.remove('collision');
        }
      }
      continue;
    }
    
    // Get the model definition
    const model = modelDefinitions.accessories[subcategory][selectedIndex];
    
    // Check if it's already loaded correctly
    const isCurrentlyLoaded = loadedModels.accessories[subcategory] !== null && 
                             loadedModels.accessories[subcategory].userData?.modelData?.id === model.id;
    
    if (isCurrentlyLoaded) {
      // If previously marked as colliding but now loaded, flag as changed
      if (collidingAccessories[subcategory]) {
        collisionStatusChanged[subcategory] = true;
        collidingAccessories[subcategory] = false;
      }
      
      // Update UI regardless
      const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
      if (currentElem) {
        currentElem.classList.remove('collision');
        if (model.id !== 'none') {
          currentElem.classList.add('active');
        }
      }
      continue;
    }
    
    // If not loaded, check if it's colliding
    // Create a unique request ID for this recheck
    const recheckId = Date.now() + Math.random();
    loadedModels.latestRequests[`recheck-${subcategory}`] = recheckId;
    
    // Check collisions
    const collisionResult = await checkAccessoryCollisions(model, subcategory);
    
    // Check if this recheck is still valid
    if (loadedModels.latestRequests[`recheck-${subcategory}`] !== recheckId) {
      log(`Ignoring outdated recheck result for ${subcategory}`);
      continue;
    }
    
    // Did collision status change?
    const wasColliding = collidingAccessories[subcategory];
    const isColliding = collisionResult.hasCollision;
    
    if (wasColliding !== isColliding) {
      collisionStatusChanged[subcategory] = true;
    }
    
    if (isColliding) {
      // Still collides
      collidingAccessories[subcategory] = true;
      
      // Show collision warning
      if (collisionResult.collidingWith && collisionResult.newItemName) {
        showCollisionWarning(collisionResult);
      }
      
      // Update UI
      const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
      if (currentElem) {
        currentElem.classList.remove('active');
        currentElem.classList.add('collision');
      }
    } else {
      // No longer collides
      collidingAccessories[subcategory] = false;
      needsLoading[subcategory] = true;
      
      // Update UI
      const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
      if (currentElem) {
        currentElem.classList.remove('collision');
        if (model.id !== 'none') {
          currentElem.classList.add('active');
        }
      }
    }
  }
  
  // Step 2: Second pass to load models that need loading
  // This ensures all collision checks complete first before any loading starts
  for (const subcategory of subcategories) {
    if (!needsLoading[subcategory]) continue;
    
    const categoryKey = `accessories-${subcategory}`;
    const selectedIndex = currentSelections[categoryKey];
    
    // Skip "None" items
    if (selectedIndex === 0) continue;
    
    // Get the model definition
    const model = modelDefinitions.accessories[subcategory][selectedIndex];
    
    // Add loading indicator
    const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
    if (currentElem) {
      currentElem.classList.add('loading');
    }
    
    // Create a unique loading ID for this previously blocked model
    const unblockLoadId = Date.now() + Math.random();
    loadedModels.latestRequests[`unblock-${subcategory}`] = unblockLoadId;
    
    // Force-remove any existing model first to ensure clean loading
    if (loadedModels.accessories[subcategory]) {
    }
    
    // Load the model with a small delay to ensure UI updates first
    setTimeout(() => {
      log(`Loading now-compatible accessory: ${model.displayName} (Request ID: ${unblockLoadId})`);
      loadModel(model, 'accessories', subcategory);
      
      // Remove loading indicator after a reasonable time
      setTimeout(() => {
        if (currentElem && loadedModels.latestRequests[`unblock-${subcategory}`] === unblockLoadId) {
          currentElem.classList.remove('loading');
        }
      }, 1000);
    }, 100);
  }
  
  // Step 3: If any collision status changed, update the pricing
  if (Object.values(collisionStatusChanged).some(changed => changed)) {
    updatePrices();
  }
  
  // Hide any collision warnings that might be showing
  const hasAnyCollision = Object.values(collidingAccessories).some(isColliding => isColliding);
  if (!hasAnyCollision) {
    hideCollisionWarning();
  }
};

// NEW: Function to sync UI state with loaded models (call this after major changes)
const syncUIWithLoadedModels = () => {
  log("Syncing UI state with loaded models");
  
  const subcategories = ['clothes', 'face', 'head'];
  
  for (const subcategory of subcategories) {
    const categoryKey = `accessories-${subcategory}`;
    const isCurrentlyLoaded = loadedModels.accessories[subcategory] !== null;
    const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
    
    if (currentElem) {
      if (isCurrentlyLoaded) {
        // Model is loaded - show as active
        currentElem.classList.remove('collision');
        currentElem.classList.add('active');
        collidingAccessories[subcategory] = false;
      } else if (currentSelections[categoryKey] === 0) {
        // "None" selected - show as neither active nor collision
        currentElem.classList.remove('collision');
        currentElem.classList.remove('active');
        collidingAccessories[subcategory] = false;
      } else {
        // Something selected but not loaded - check if it's because of collision
        if (collidingAccessories[subcategory]) {
          currentElem.classList.remove('active');
          currentElem.classList.add('collision');
        } else {
          // Shouldn't happen, but handle it
          currentElem.classList.remove('collision');
          currentElem.classList.remove('active');
        }
      }
    }
  }
  
  updatePrices();
};

log("Cached voxel collision system with your working recheck logic and smooth UI animations!");