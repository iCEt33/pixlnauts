// Proper GLB merger using gltf-transform library
// This preserves all materials perfectly

let gltfTransform;
let gltfFunctions;
let isCurrentlyLoading = false; // Prevent multiple simultaneous loads

// Initialize loader and gltf-transform
const initLoader = async () => {
  try {
    // Import both core and functions packages
    gltfTransform = await import('https://esm.sh/@gltf-transform/core@4.2.1');
    gltfFunctions = await import('https://esm.sh/@gltf-transform/functions@4.2.1');
    
    // Import extensions package for KHR_materials_transmission
    const gltfExtensions = await import('https://esm.sh/@gltf-transform/extensions@4.2.1');
    
    // Store extensions for later use
    window.gltfExtensions = gltfExtensions;
    
    log("gltf-transform loaded successfully with material extensions");
    
  } catch (error) {
    log(`ERROR: Failed to load gltf-transform - ${error.message}`);
    console.error('Import error:', error);
  }
};

// Load and merge all selected models using gltf-transform
const loadAllModels = async () => {
  // If already loading, skip this request
  if (isCurrentlyLoading) {
    return;
  }
  
  isCurrentlyLoading = true;
  showLoadingOverlay();
  
  try {
    // CRITICAL FIX: Only clear collision copies for accessories that are marked as colliding
    // Don't clear collision copies for successfully loaded accessories - we need them for future checks
    if (collidingAccessories.clothes) loadedModels.accessories.clothes = null;
    if (collidingAccessories.face) loadedModels.accessories.face = null;
    if (collidingAccessories.head) loadedModels.accessories.head = null;
    
    // VERIFY ALL REQUIRED LIBRARIES ARE LOADED INCLUDING EXTENSIONS
    if (!gltfTransform || !gltfFunctions || !window.gltfExtensions) {
      log("ERROR: gltf-transform or extensions not loaded yet! Waiting...");
      hideLoadingOverlay();
      isCurrentlyLoading = false;
      return;
    }
    
    const modelsToLoad = [];
    
    for (const category in currentSelections) {
      const index = currentSelections[category];
      let model = null;
      
      if (category.startsWith('accessories-')) {
        const subcategory = category.split('-')[1];
        if (collidingAccessories[subcategory]) {
          continue;
        }
        model = modelDefinitions.accessories[subcategory][index];
      } else {
        model = modelDefinitions[category][index];
      }
      
      if (model && model.filename) {
        modelsToLoad.push({ model, category });
      }
    }
    
    // Create IO instance with extensions registered
    const io = new gltfTransform.WebIO();
    
    // Register material extensions to preserve transparency
    // These MUST be registered before reading any GLB files
    io.registerExtensions([
      window.gltfExtensions.KHRMaterialsTransmission,
      window.gltfExtensions.KHRMaterialsIOR,
      window.gltfExtensions.KHRMaterialsEmissiveStrength
    ]);
    
    log("Material extensions registered successfully");
    
    // Load first model as base
    const firstModel = modelsToLoad[0];
    const firstPath = `models/${firstModel.model.filename}`;
    const firstResponse = await fetch(firstPath);
    const firstBuffer = await firstResponse.arrayBuffer();
    const baseDoc = await io.readBinary(new Uint8Array(firstBuffer));
    
    // Scale the first model
    const baseRoot = baseDoc.getRoot();
    baseRoot.listNodes().forEach(node => {
      const scale = node.getScale();
      node.setScale([scale[0] * 0.1, scale[1] * 0.1, scale[2] * 0.1]);
    });
    
    // Load and merge remaining models using mergeDocuments
    for (let i = 1; i < modelsToLoad.length; i++) {
      const { model } = modelsToLoad[i];
      const fullPath = `models/${model.filename}`;
      const response = await fetch(fullPath);
      const arrayBuffer = await response.arrayBuffer();
      const doc = await io.readBinary(new Uint8Array(arrayBuffer));
      
      // Scale this model
      const root = doc.getRoot();
      root.listNodes().forEach(node => {
        const scale = node.getScale();
        node.setScale([scale[0] * 0.1, scale[1] * 0.1, scale[2] * 0.1]);
      });
      
      // Merge using the proper function from @gltf-transform/functions
      await gltfFunctions.mergeDocuments(baseDoc, doc);
    }
    
    // Merge all scenes into the first scene
    const scenes = baseDoc.getRoot().listScenes();
    if (scenes.length > 1) {
      const mainScene = scenes[0];
      
      // Move all ROOT nodes from other scenes into the main scene
      for (let i = 1; i < scenes.length; i++) {
        const scene = scenes[i];
        const allNodes = scene.listChildren();
        
        allNodes.forEach(node => {
          mainScene.addChild(node);
        });
        
        scene.dispose();
      }
    }
    
    // Use unpartition() to combine all buffers into one
    await baseDoc.transform(gltfFunctions.unpartition());
    
    // Export as GLB
    const mergedGLB = await io.writeBinary(baseDoc);
    
    // Create blob URL
    const blob = new Blob([mergedGLB], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    
    // Store old GLB to revoke AFTER new one loads (prevents flicker)
    const oldGLB = currentGLB;
    currentGLB = url;
    
    // CRITICAL: Don't set modelViewer.src until we've set up the cleanup handler
    // This ensures old model stays visible during the transition
    const loadHandler = () => {
      if (oldGLB) {
        URL.revokeObjectURL(oldGLB);
      }
      hideLoadingOverlay();
      isCurrentlyLoading = false;
    };
    
    // Set up one-time listener
    modelViewer.addEventListener('load', loadHandler, { once: true });
    
    // NOW load the new model - old one stays visible until this completes
    modelViewer.src = url;
    
    // Store accessories for collision detection (using Three.js)
    let collisionCopiesLoaded = 0;
    const totalCollisionCopies = modelsToLoad.filter(m => m.category.startsWith('accessories-')).length;
    
    for (const { model, category } of modelsToLoad) {
      if (category.startsWith('accessories-')) {
        const subcategory = category.split('-')[1];
        
        const fullPath = `models/${model.filename}`;
        const gltfLoader = new THREE.GLTFLoader();
        gltfLoader.load(fullPath, (gltf) => {
          const collisionCopy = gltf.scene.clone();
          collisionCopy.scale.set(0.1, 0.1, 0.1);
          collisionCopy.userData.modelData = model;
          loadedModels.accessories[subcategory] = collisionCopy;
          
          collisionCopiesLoaded++;
        });
      }
    }
    
  } catch (error) {
    log(`ERROR: Failed to merge models - ${error.message}`);
    console.error('Merge error:', error);
    hideLoadingOverlay();
    isCurrentlyLoading = false;
  }
};

const loadModel = (model, category, subcategory = null) => {
  const requestId = Date.now() + Math.random();
  const categoryKey = subcategory ? `${category}-${subcategory}` : category;
  loadedModels.latestRequests[categoryKey] = requestId;
  
  if (subcategory && collidingAccessories[subcategory]) {
    return;
  }
  
  // Call immediately - no delay
  if (loadedModels.latestRequests[categoryKey] === requestId) {
    loadAllModels();
  }
};