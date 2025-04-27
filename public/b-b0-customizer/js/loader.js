// Load model by category
const loadModel = (model, category, subcategory = null) => {
  // If it's a "None" selection or no filename, just remove the model and return
  if (!model || !model.filename) {
    if (subcategory) {
      if (loadedModels.accessories[subcategory]) {
        modelContainer.remove(loadedModels.accessories[subcategory]);
        loadedModels.accessories[subcategory] = null;
        log(`Removed ${subcategory} accessory`);
      }
    } else if (loadedModels[category]) {
      modelContainer.remove(loadedModels[category]);
      loadedModels[category] = null;
      log(`Removed ${category} model`);
    }
    return;
  }
  
  // Show loading overlay
  document.getElementById('loading-overlay').style.display = 'flex';
  loadingQueue++;
  
  // Remove current model from this category if any
  if (subcategory) {
    if (loadedModels.accessories[subcategory]) {
      modelContainer.remove(loadedModels.accessories[subcategory]);
      loadedModels.accessories[subcategory] = null;
    }
  } else {
    if (loadedModels[category]) {
      modelContainer.remove(loadedModels[category]);
      loadedModels[category] = null;
    }
  }
  
  // Construct complete path
  const fullPath = `models/${model.filename}`;
  log(`Loading ${category}${subcategory ? ' (' + subcategory + ')' : ''} model: ${fullPath}`);
  
  // Load new model
  gltfLoader.load(
    fullPath,
    (gltf) => {
      try {
        const modelObj = gltf.scene;
        
        // Apply standard settings and scale down the model
        modelObj.scale.set(0.1, 0.1, 0.1); // Scale down by factor of 10
        
        // Track if we found any transparent materials
        let transparentMaterialsFound = false;
        
        modelObj.traverse((node) => {
          if (node.isMesh) {
            // Apply shadow settings based on performance mode
            node.castShadow = !performanceMode;
            node.receiveShadow = !performanceMode;
            
            // Handle materials
            if (node.material) {
              const processMaterial = (mat) => {
                // Check if this material has transparency properties
                const hasTransparencyProperties = 
                  mat.transparent === true || 
                  (mat.opacity !== undefined && mat.opacity < 1) ||
                  (mat.alphaTest !== undefined && mat.alphaTest > 0) ||
                  (mat.alphaToCoverage !== undefined && mat.alphaToCoverage) ||
                  (mat.map && mat.map.image && mat.map.image.transparent);
                
                // If it's a screen component, apply special settings including glow
                if (model.filename.includes('screen_')) {
                  mat.transparent = true;
                  mat.alphaTest = 0.01;
                  mat.depthWrite = false;
                  mat.needsUpdate = true;
                  
                  // Add emissive properties for screens
                  mat.emissive = new THREE.Color(0x333333);
                  mat.emissiveIntensity = performanceMode ? 0.3 : 0.5;
                  
                  transparentMaterialsFound = true;
                }
                // Otherwise, if it has transparency properties, apply proper transparency settings
                else if (hasTransparencyProperties) {
                  mat.transparent = true;
                  mat.alphaTest = 0.01;
                  mat.depthWrite = false;
                  mat.needsUpdate = true;
                  
                  transparentMaterialsFound = true;
                }
              };
              
              // Process either a single material or an array of materials
              if (Array.isArray(node.material)) {
                node.material.forEach(processMaterial);
              } else {
                processMaterial(node.material);
              }
            }
          }
        });
        
        // Log transparency detection result
        if (transparentMaterialsFound) {
          log(`Transparent materials detected in ${model.filename} and properly configured`);
        }
        
        // Add to model container instead of directly to scene
        modelContainer.add(modelObj);
        
        // Store the loaded model
        if (subcategory) {
          loadedModels.accessories[subcategory] = modelObj;
        } else {
          loadedModels[category] = modelObj;
        }
        
        // Store model data for reference
        modelObj.userData.modelData = model;
        
        loadingQueue--;
        if (loadingQueue <= 0) {
          document.getElementById('loading-overlay').style.display = 'none';
          loadingQueue = 0;
        }
        
        log(`Model ${model.filename} loaded successfully`);
      } catch (error) {
        loadingQueue--;
        if (loadingQueue <= 0) {
          document.getElementById('loading-overlay').style.display = 'none';
          loadingQueue = 0;
        }
        log(`Error processing model: ${error.message}`);
      }
    },
    (xhr) => {
      const progress = Math.round((xhr.loaded / xhr.total) * 100);
      document.querySelector('.loading-text').textContent = `Loading ${model.filename}... ${progress}%`;
    },
    (error) => {
      loadingQueue--;
      if (loadingQueue <= 0) {
        document.getElementById('loading-overlay').style.display = 'none';
        loadingQueue = 0;
      }
      log(`Error loading model: ${error.message}`);
      
      // Update UI to show error state
      const currentElem = document.querySelector(`.carousel-current[data-category="${category}${subcategory ? '-' + subcategory : ''}"]`);
      if (currentElem) {
        currentElem.textContent = `Error: ${model.displayName}`;
        currentElem.style.color = '#f00';
      }
    }
  );
};