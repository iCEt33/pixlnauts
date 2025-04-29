// Function to check collisions between accessories
const checkAccessoryCollisions = (newModelData, newCategory) => {
  if (!collisionCheckEnabled) return { hasCollision: false };
  
  // Get a list of currently loaded accessories (except for the category we're changing)
  const loadedAccessories = [];
  for (const category in loadedModels.accessories) {
    if (category !== newCategory && loadedModels.accessories[category]) {
      loadedAccessories.push({
        model: loadedModels.accessories[category],
        category: category
      });
    }
  }
  
  // If no other accessories are loaded, there can't be a collision
  if (loadedAccessories.length === 0) return { hasCollision: false };
  
  // If this is a "None" selection, there won't be a collision
  if (!newModelData || !newModelData.filename) return { hasCollision: false };
  
  // Generate request ID for this collision check
  const collisionCheckId = Date.now() + Math.random();
  
  // Store as latest collision check for this category
  loadedModels.latestRequests[`collision-${newCategory}`] = collisionCheckId;
  
  // Load the new model without displaying it to check for collisions
  return new Promise((resolve) => {
    // Construct path
    const fullPath = `models/${newModelData.filename}`;
    
    // Create a temporary loader
    const tempLoader = new THREE.GLTFLoader();
    
    // Load the model temporarily to check collisions
    tempLoader.load(
      fullPath,
      (gltf) => {
        try {
          // Check if this is still the latest collision request for this category
          if (loadedModels.latestRequests[`collision-${newCategory}`] !== collisionCheckId) {
            log(`Ignoring outdated collision check for ${newModelData.displayName} (ID: ${collisionCheckId})`);
            resolve({ hasCollision: false }); // Resolve with no collision to allow the latest request to determine
            return;
          }
        
          const tempModel = gltf.scene.clone();
          tempModel.scale.set(0.1, 0.1, 0.1); // Match the same scale as the real model
          
          // Create a group to hold our temporary model for collision checking
          const tempGroup = new THREE.Group();
          tempGroup.add(tempModel);
          tempGroup.updateMatrixWorld(true);
          
          // Collect meshes from the new model
          const newModelMeshes = [];
          tempModel.traverse(child => {
            if (child.isMesh && child.geometry) {
              newModelMeshes.push(child);
            }
          });
          
          // Debug info
          log(`Found ${newModelMeshes.length} meshes in new model`);
          
          // No meshes found? Fallback to bounding box with a smaller size
          if (newModelMeshes.length === 0) {
            resolve({ hasCollision: false });
            scene.remove(tempGroup);
            return;
          }
          
          // Check collision with each loaded accessory
          let collisionDetected = false;
          let collidingWith = '';
          
          for (const accessory of loadedAccessories) {
            // Force matrix update for existing model
            accessory.model.updateMatrixWorld(true);
            
            // Collect meshes from existing model
            const existingMeshes = [];
            accessory.model.traverse(child => {
              if (child.isMesh && child.geometry) {
                existingMeshes.push(child);
              }
            });
            
            // Debug info
            log(`Found ${existingMeshes.length} meshes in existing ${accessory.category} model`);
            
            // No meshes in existing model? Skip it
            if (existingMeshes.length === 0) continue;
            
            // We'll sample points from one model and check if they're inside the other
            // This is more efficient than full mesh-to-mesh collision
            
            // First, get bounding boxes for quick culling
            const newBoundingBox = new THREE.Box3().setFromObject(tempModel);
            const existingBoundingBox = new THREE.Box3().setFromObject(accessory.model);
            
            // If bounding boxes don't intersect, we can quickly say no collision
            if (!newBoundingBox.intersectsBox(existingBoundingBox)) {
              continue;
            }
            
            // Bounding boxes intersect, so we need to do more detailed checking
            
            // Create raycasters for collision detection
            const raycaster = new THREE.Raycaster();
            
            // Sample each mesh from new model against each mesh from existing model
            for (const newMesh of newModelMeshes) {
              // Skip if collision already detected
              if (collisionDetected) break;
              
              // For accurate testing, work with the geometry in its final position
              const newGeometry = newMesh.geometry.clone();
              
              // We need to apply the world matrix transformations to get vertices in world space
              const worldMatrix = newMesh.matrixWorld;
              newGeometry.applyMatrix4(worldMatrix);
              
              // Get vertices from the new model geometry
              // We'll sample a subset of vertices to keep performance reasonable
              const newVertices = [];
              const positionAttribute = newGeometry.getAttribute('position');
              
              // Get a reasonable number of vertices to test (max 100)
              const totalVertices = positionAttribute.count;
              const stride = Math.max(1, Math.floor(totalVertices / 100));
              
              // Sample vertices at regular intervals
              for (let i = 0; i < totalVertices; i += stride) {
                const vertex = new THREE.Vector3(
                  positionAttribute.getX(i),
                  positionAttribute.getY(i),
                  positionAttribute.getZ(i)
                );
                newVertices.push(vertex);
              }
              
              // For each vertex, check if it's close to any mesh in the existing model
              for (const vertex of newVertices) {
                // Skip if collision already detected
                if (collisionDetected) break;
                
                for (const existingMesh of existingMeshes) {
                  // Skip if collision already detected
                  if (collisionDetected) break;
                  
                  // Create a sphere at this vertex position
                  const sphereRadius = 0.02; // Small radius for proximity detection
                  
                  // Use raycasting from 6 directions to check for proximity
                  const directions = [
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(-1, 0, 0),
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, -1, 0),
                    new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(0, 0, -1)
                  ];
                  
                  for (const direction of directions) {
                    // Skip if collision already detected
                    if (collisionDetected) break;
                    
                    // Cast a ray from the vertex in this direction
                    raycaster.set(vertex, direction.normalize());
                    
                    // Intersect with the existing mesh
                    const intersects = raycaster.intersectObject(existingMesh, false);
                    
                    // If we hit something within our proximity sphere, it's a collision
                    if (intersects.length > 0 && intersects[0].distance < sphereRadius) {
                      // Get the display name of what this item is colliding with
                      const categoryKey = accessory.category;
                      const categoryIndex = currentSelections[`accessories-${categoryKey}`];
                      const collidingItemName = modelDefinitions.accessories[categoryKey][categoryIndex].displayName;
                      
                      collisionDetected = true;
                      collidingWith = collidingItemName;
                      
                      log(`Collision detected: ${newModelData.displayName} collides with ${collidingItemName}`);
                      break;
                    }
                  }
                }
              }
            }
          }
          
          // Clean up
          scene.remove(tempGroup);
          
          // Return result
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
          // If there was an error, assume no collision to prevent blocking the UI
          log(`Error during collision check: ${error.message}`);
          scene.remove(tempGroup);
          resolve({ hasCollision: false });
        }
      },
      undefined,
      (error) => {
        // If load failed, assume no collision to prevent blocking the UI
        log(`Error loading model for collision check: ${error.message}`);
        resolve({ hasCollision: false });
      }
    );
  });
};

// Function to show collision warning
const showCollisionWarning = (collisionInfo) => {
  const warningElement = document.getElementById('collision-warning');
  const messageElement = document.getElementById('collision-message');
  
  if (collisionInfo.hasCollision) {
    // Update message with specific items that are colliding
    messageElement.textContent = `Item "${collisionInfo.newItemName}" collides with "${collisionInfo.collidingWith}". Please choose something else.`;
    
    // Show the warning
    warningElement.style.display = 'flex';
    
    // Store current collision
    currentCollision = collisionInfo;
    
    // Automatically hide after 5 seconds
    setTimeout(() => {
      if (currentCollision === collisionInfo) {
        hideCollisionWarning();
      }
    }, 5000);
    
    return true;
  } else {
    hideCollisionWarning();
    return false;
  }
};

// Function to hide collision warning
const hideCollisionWarning = () => {
  const warningElement = document.getElementById('collision-warning');
  warningElement.style.display = 'none';
  currentCollision = null;
};

// Function to add collision toggle button
const addCollisionToggle = () => {
  const buttonsGroup = document.querySelector('.buttons-group');
  const collisionToggle = document.createElement('button');
  collisionToggle.id = 'collision-toggle';
  collisionToggle.className = 'toggle-button active';
  collisionToggle.textContent = 'Collision Check: ON';
  
  // Add to buttons group
  buttonsGroup.appendChild(collisionToggle);
  
  // Add event listener
  collisionToggle.addEventListener('click', () => {
    collisionCheckEnabled = !collisionCheckEnabled;
    collisionToggle.textContent = `Collision Check: ${collisionCheckEnabled ? 'ON' : 'OFF'}`;
    collisionToggle.classList.toggle('active', collisionCheckEnabled);
    
    // Hide any existing warning when disabled
    if (!collisionCheckEnabled) {
      hideCollisionWarning();
    }
    
    log(`Collision checking ${collisionCheckEnabled ? 'enabled' : 'disabled'}`);
  });
};

// Function to recheck all accessories for collisions when something changes
const recheckAllAccessories = async () => {
  if (!collisionCheckEnabled) return;
  
  log("Rechecking all accessories for collisions");
  
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
      modelContainer.remove(loadedModels.accessories[subcategory]);
      loadedModels.accessories[subcategory] = null;
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
  hideCollisionWarning();
};