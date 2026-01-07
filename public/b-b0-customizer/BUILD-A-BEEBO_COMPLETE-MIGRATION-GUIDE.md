# 🤖 Build-a-B-b0 Migration Guide
## Converting Custom Three.js Viewer to Google Model-Viewer

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Why Migrate](#why-migrate)
4. [Current Architecture](#current-architecture)
5. [Target Architecture](#target-architecture)
6. [Migration Strategy](#migration-strategy)
7. [Implementation Steps](#implementation-steps)
8. [Key Technical Details](#key-technical-details)
9. [Testing Checkpoints](#testing-checkpoints)

---

## ✅ Prerequisites

Before starting this migration, you should already have:

### Required Files
- ✅ Working `customizer/` folder with current Three.js implementation
- ✅ `models/` directory containing all GLB files:
  - Body variations (body_white.glb, body_red.glb, etc.)
  - Face variations (face_smile.glb, face_angry.glb, etc.)
  - Screen variations (screen_green.glb, screen_red.glb, etc.)
  - Specs variations (specs_1core2gb.glb, specs_2core4gb.glb, etc.)
  - Accessory variations (accessories_clothes_*.glb, accessories_face_*.glb, etc.)
- ✅ All current JS files (utils.js, models.js, scene.js, etc.)
- ✅ CSS file with current styling

### Technical Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Basic understanding of JavaScript and Three.js concepts
- Text editor or IDE
- Local web server (optional - can use `file://` protocol for testing)

**🚫 NO BUILD TOOLS REQUIRED:**
- ❌ No Node.js needed
- ❌ No npm/yarn needed
- ❌ No Vite/Webpack/Parcel needed
- ❌ No package.json needed
- ❌ No build/compile step needed
- ✅ Pure HTML/CSS/JS - just open `index.html` in browser!

### What This Guide Does NOT Cover
- ❌ Creating or providing 3D models (GLB files)
- ❌ 3D modeling in Blender/Maya/etc.
- ❌ Smart contract development for NFT minting
- ❌ IPFS node setup or hosting
- ❌ Blockchain integration details

This guide focuses **only on migrating the 3D viewer from custom Three.js to Google Model-Viewer**.

---

## 🎯 Project Overview

**Build-a-B-b0** is a customizable robot NFT builder where users:
1. Select parts from different categories (Body, Face, Screen, Specs, Accessories)
2. Preview their custom robot in 3D
3. Get real-time collision detection for accessories
4. Export the final model as GLB for NFT minting
5. Upload to IPFS and mint as NFT with metadata

**Current Tech:** Custom Three.js scene with manual rendering
**Target Tech:** Google Model-Viewer (same as OpenSea & objkt.com use)

**Project Structure:**
```
customizer/              # Root folder
├── index.html          # Main HTML file
├── css/                # Styles folder
│   └── styles.css
├── js/                 # JavaScript folder
│   └── *.js files
└── models/             # 3D models folder (PRE-EXISTING - see note below)
    └── *.glb files
```

**📦 Note About Models:**
The `models/` folder with all GLB files is **assumed to already exist** in your project. This migration guide does NOT cover creating or providing the 3D models. The guide assumes you already have:
- All body variations (body_white.glb, body_red.glb, etc.)
- All face variations (face_smile.glb, face_angry.glb, etc.)
- All screen variations (screen_green.glb, screen_red.glb, etc.)
- All specs variations (specs_1core2gb.glb, etc.)
- All accessory variations (accessories_*.glb files)

If you're starting fresh and don't have models yet, you'll need to create/obtain these GLB files separately before testing the customizer.

---

## 🤔 Why Migrate

### Problems with Current Implementation
1. **Color inconsistency** - Renders differently than OpenSea/objkt
2. **Transparency issues** - Screen elements don't export transparent correctly
3. **Complex maintenance** - Custom Three.js setup requires managing:
   - Scene, camera, renderer, lights
   - Post-processing (bloom effects)
   - Shadow maps
   - Material overrides at runtime
4. **Export problems** - Runtime material changes (like `material.transparent = true`) don't save to GLB

### Benefits of Model-Viewer
1. **✅ Exact OpenSea/objkt compatibility** - Same renderer they use
2. **✅ Proper PBR rendering** - Respects baked material properties
3. **✅ Transparency works** - Alpha/emissive materials handled correctly
4. **✅ Auto-optimization** - Built-in performance tuning
5. **✅ Simpler codebase** - ~90% less custom rendering code
6. **✅ Bonus AR support** - Mobile AR viewing included

---

## 📦 External Dependencies

### Current Dependencies (Three.js Custom Setup)
The current implementation uses ~10 CDN script tags:
- Three.js core
- GLTFLoader
- OrbitControls  
- EffectComposer
- UnrealBloomPass
- RenderPass
- CopyShader
- LuminosityHighPassShader
- ShaderPass

### After Migration (Model-Viewer)
**Only 2 dependencies needed:**

```html
<!-- 1. Model-Viewer (includes Three.js + loaders + controls) -->
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>

<!-- 2. GLTFExporter (only needed for Step 5 - export functionality) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/exporters/GLTFExporter.js"></script>
```

### Why CDN Instead of npm?

**✅ Recommended: Use CDN links (NO BUILD TOOLS NEEDED)**
- No build process required
- No Vite, Webpack, Parcel, or any bundler
- No package.json or node_modules folder needed
- Simpler deployment (just upload files)
- Better for IPFS hosting (static files)
- Faster development (no npm install/build)
- Model-viewer is optimized for CDN delivery

**❌ Not Recommended: npm packages + build tools**
- Requires build tooling (webpack/vite/parcel)
- Adds complexity for minimal benefit
- Not needed for a single-page customizer
- Makes IPFS deployment harder
- Requires maintaining build configuration

**Summary:** This is a **pure HTML/CSS/JS project** - no build step, no compilation, no bundling. Just open `index.html` in a browser and it works!

### Version Pinning
Use specific versions (not `@latest`) for production:
```html
<!-- ✅ GOOD: Pinned version -->
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>

<!-- ❌ BAD: Latest (can break) -->
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/latest/model-viewer.min.js"></script>
```

---

## 🏗️ Current Architecture

### File Structure
```
customizer/
├── index.html           # HTML with custom Three.js renderer div
├── css/
│   └── styles.css       # UI styling
├── js/
│   ├── utils.js         # Global vars, logging
│   ├── models.js        # Model definitions & prices
│   ├── scene.js         # Three.js scene setup, lighting, camera
│   ├── bloom.js         # Post-processing bloom effects
│   ├── reflection.js    # Ground plane reflections (empty)
│   ├── loader.js        # GLTFLoader for loading models
│   ├── collisions.js    # Voxel-based collision detection
│   ├── ui.js            # Carousel controls, pricing
│   ├── snapshot.js      # High-res screenshot export
│   └── main.js          # App initialization
└── models/              # GLB files for all parts
```

### How It Works Now
1. **Scene Setup** (`scene.js`):
   - Creates Three.js Scene, Camera, Renderer
   - Sets up 4 directional lights + ambient light
   - Creates ground plane with grid
   - Initializes OrbitControls
   - Sets up bloom post-processing

2. **Model Loading** (`loader.js`):
   - Uses GLTFLoader to load individual GLB files
   - Scales models to 0.1x (they're authored at 10x scale)
   - Applies runtime material overrides (transparency, shadows)
   - Adds to `modelContainer` group in scene

3. **Part Management** (`ui.js`):
   - User selects parts via carousel
   - Each category loads ONE model at a time
   - Old model removed, new one loaded
   - Accessories have collision detection

4. **Collision Detection** (`collisions.js`):
   - Converts each accessory to voxel grid
   - Caches voxel data for reuse
   - Uses spatial hashing for fast collision checks
   - Blocks loading if collision detected

5. **Export** (`snapshot.js`):
   - Temporarily increases renderer resolution
   - Captures PNG screenshot
   - Downloads as file

---

## 🎯 Target Architecture

### New File Structure
```
customizer/
├── index.html           # HTML with <model-viewer> component
├── css/
│   └── styles.css       # UI styling + model-viewer styles
├── js/
│   ├── utils.js         # Global vars, logging (minimal changes)
│   ├── models.js        # Model definitions & prices (NO CHANGE)
│   ├── scene.js         # Model-viewer initialization (REPLACED)
│   ├── loader.js        # Dynamic part loading into model-viewer (REPLACED)
│   ├── collisions.js    # Voxel collision detection (NO CHANGE - works with MV!)
│   ├── ui.js            # Carousel controls, pricing (minimal changes)
│   ├── export.js        # GLB export for IPFS (NEW - replaces snapshot.js)
│   └── main.js          # App initialization (simplified)
│   
│   # DELETED FILES:
│   # ❌ bloom.js - not needed (model-viewer handles post-processing)
│   # ❌ reflection.js - not needed (already empty)
│   # ❌ snapshot.js - replaced by export.js
│
└── models/              # GLB files (NO CHANGE)
```

### How It Will Work

1. **Scene Setup** (`scene.js`):
   ```javascript
   // Get model-viewer element
   modelViewer = document.querySelector('model-viewer');
   
   // Model-viewer handles:
   // - Camera controls (camera-controls attribute)
   // - Auto-rotation (auto-rotate attribute)
   // - Lighting (environment-image="neutral")
   // - Rendering loop
   // - Shadow mapping
   ```

2. **Model Loading** (`loader.js`):
   ```javascript
   // Load base model into model-viewer
   modelViewer.src = 'models/body_white.glb';
   
   // Access the Three.js scene
   const scene = modelViewer.model;
   
   // Add additional parts as children
   const faceLoader = new THREE.GLTFLoader();
   faceLoader.load('models/face_smile.glb', (gltf) => {
     const faceMesh = gltf.scene;
     faceMesh.scale.set(0.1, 0.1, 0.1);
     scene.add(faceMesh);
   });
   ```

3. **Part Management** (same as before):
   - Carousel controls remain identical
   - When user switches: remove old child, add new child
   - Same request tracking to prevent race conditions

4. **Collision Detection** (NO CHANGE):
   ```javascript
   // Works exactly the same because model-viewer.model 
   // is a Three.js Object3D
   const accessory = modelViewer.model.getObjectByName('accessory-clothes');
   const voxels = cachedVoxelSystem.extractVoxelCenters(accessory, 'clothes');
   ```

5. **Export** (NEW):
   ```javascript
   // Export the combined scene as GLB
   const exporter = new THREE.GLTFExporter();
   exporter.parse(modelViewer.model, (gltf) => {
     // gltf is the combined model ready for IPFS
     const blob = new Blob([gltf], {type: 'model/gltf-binary'});
     // Upload to IPFS or download
   });
   ```

---

## 🛠️ Migration Strategy

### Phase 1: Foundation (Baby Steps)
Break migration into 5 testable checkpoints:

**Step 1:** Basic model-viewer displays ONE static model
**Step 2:** Load all 4 base parts (body + face + screen + specs)
**Step 3:** Add carousel controls to switch parts
**Step 4:** Integrate collision detection for accessories
**Step 5:** Add GLB export functionality

### Why Baby Steps?
- Test each piece before moving forward
- Easy to identify what broke
- Can rollback to last working checkpoint
- Builds confidence incrementally

---

## 📝 Implementation Steps

### STEP 1: Basic Model-Viewer Setup
**Goal:** Display a single static model

**Files to Create/Modify:**
1. **index.html** - Replace Three.js renderer with model-viewer
2. **scene.js** - Replace Three.js setup with model-viewer init
3. **main.js** - Simplify to just initialize model-viewer
4. **styles.css** - Add model-viewer specific styles

**HTML Changes:**
```html
<!-- OLD (Three.js) -->
<div id="model-viewer" class="model-viewer"></div>

<!-- NEW (Model-Viewer) -->
<model-viewer 
  id="model-viewer"
  class="model-viewer"
  src="models/body_white.glb"
  camera-controls
  auto-rotate
  auto-rotate-delay="3000"
  camera-orbit="45deg 75deg 6.5m"
  field-of-view="40deg"
  environment-image="neutral"
  shadow-intensity="1">
</model-viewer>

<!-- Add script tag for model-viewer -->
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
```

**scene.js Changes:**
```javascript
// OLD: ~200 lines of Three.js setup
// scene = new THREE.Scene()
// camera = new THREE.PerspectiveCamera(...)
// renderer = new THREE.WebGLRenderer(...)
// etc...

// NEW: ~50 lines
let modelViewer;

const initScene = () => {
  modelViewer = document.querySelector('model-viewer');
  
  // Event listeners
  modelViewer.addEventListener('load', () => {
    console.log('Model loaded!');
  });
  
  // Setup UI controls (camera reset, auto-rotate toggle)
  setupControls();
};
```

**Test Checkpoint 1:**
- ✅ White body model displays
- ✅ Can rotate with mouse
- ✅ Auto-rotation works
- ✅ Camera controls work

---

### STEP 2: Load Multiple Parts
**Goal:** Combine body + face + screen + specs into one model

**New Logic in loader.js:**
```javascript
const loadedParts = {
  body: null,
  face: null,
  screen: null,
  specs: null
};

const loadModel = async (modelData, category) => {
  // Load GLB file
  const loader = new THREE.GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(modelData.filename, resolve, undefined, reject);
  });
  
  const part = gltf.scene;
  part.scale.set(0.1, 0.1, 0.1);
  part.name = `${category}-${modelData.id}`;
  
  // Remove old part if exists
  if (loadedParts[category]) {
    modelViewer.model.remove(loadedParts[category]);
  }
  
  // Add new part
  modelViewer.model.add(part);
  loadedParts[category] = part;
  
  // Store reference for collision detection
  if (category === 'body') {
    modelContainer = part; // For collision system compatibility
  }
};
```

**Test Checkpoint 2:**
- ✅ All 4 base parts load and display
- ✅ Parts are positioned correctly (no overlaps)
- ✅ Can see body, face, screen, and specs together
- ✅ Total of 4 children in modelViewer.model

---

### STEP 3: Carousel Controls
**Goal:** Switch parts via UI carousels

**Minimal ui.js changes:**
```javascript
// Most of ui.js stays the same!
// Just need to hook up to new loader

const changeSelection = async (category, direction) => {
  // ... calculate newIndex (SAME AS BEFORE)
  
  // NEW: Use model-viewer loader instead of Three.js loader
  const newModel = modelDefinitions[category][newIndex];
  await loadModel(newModel, category);
  
  // ... update pricing (SAME AS BEFORE)
};
```

**Test Checkpoint 3:**
- ✅ Can change body color via carousel
- ✅ Can change face via carousel
- ✅ Can change screen via carousel
- ✅ Can change specs via carousel
- ✅ Pricing updates correctly
- ✅ Old part removed, new part added

---

### STEP 4: Collision Detection
**Goal:** Prevent accessories from overlapping

**Key Insight:** `collisions.js` needs ZERO changes!
```javascript
// Works because modelViewer.model is Three.js Object3D
const checkCollision = async (newAccessory, category) => {
  // Extract voxels from new accessory (SAME AS BEFORE)
  const newVoxels = await cachedVoxelSystem.extractVoxelCenters(
    newAccessory, 
    `accessory-${category}`
  );
  
  // Check against existing accessories (SAME AS BEFORE)
  for (const [cat, accessory] of Object.entries(loadedAccessories)) {
    if (cat === category) continue;
    const collision = cachedVoxelSystem.checkCollision(
      `accessory-${category}`,
      `accessory-${cat}`
    );
    if (collision.hasCollision) return true;
  }
  return false;
};
```

**Test Checkpoint 4:**
- ✅ Can add accessories (clothes, face, head)
- ✅ Collision detection triggers when items overlap
- ✅ UI shows collision warning
- ✅ Colliding items don't load
- ✅ Non-colliding items load correctly

---

### STEP 5: GLB Export
**Goal:** Export combined model for IPFS

**New export.js:**
```javascript
const exportGLB = async () => {
  return new Promise((resolve, reject) => {
    const exporter = new THREE.GLTFExporter();
    
    exporter.parse(
      modelViewer.model,
      (gltf) => {
        const blob = new Blob([gltf], {
          type: 'model/gltf-binary'
        });
        resolve(blob);
      },
      { binary: true },
      reject
    );
  });
};

// Usage for IPFS upload:
const blob = await exportGLB();
const ipfsHash = await uploadToIPFS(blob);
// Then create NFT metadata with ipfsHash
```

**Test Checkpoint 5:**
- ✅ Export button generates GLB file
- ✅ GLB contains all selected parts
- ✅ Transparency preserved in export
- ✅ Emissive materials preserved
- ✅ Can re-import GLB and it looks correct
- ✅ File size reasonable (<5MB typical)

---

## 🔑 Key Technical Details

### 1. Model-Viewer Scene Access
```javascript
// Model-viewer exposes Three.js scene via .model property
const scene = modelViewer.model; // This is a THREE.Object3D

// You can do normal Three.js operations:
scene.add(newMesh);
scene.remove(oldMesh);
scene.traverse((child) => { /* iterate children */ });
const obj = scene.getObjectByName('part-name');
```

### 2. Material Properties
**CRITICAL:** Don't override materials at runtime!

```javascript
// ❌ BAD (old way - doesn't export):
material.transparent = true;
material.alphaTest = 0.01;

// ✅ GOOD (new way - bake into source GLB):
// Set these properties in Blender/3D software BEFORE export
// Model-viewer will respect them automatically
```

### 3. Scaling
Models are authored at 10x scale, so always scale to 0.1:
```javascript
part.scale.set(0.1, 0.1, 0.1);
```

### 4. Request Tracking (Race Conditions)
Keep the existing request tracking system:
```javascript
const latestRequests = {};

const loadModel = (model, category) => {
  const requestId = Date.now() + Math.random();
  latestRequests[category] = requestId;
  
  // ... async loading ...
  
  // Before adding to scene, check if still latest:
  if (latestRequests[category] !== requestId) {
    console.log('Outdated request, ignoring');
    return;
  }
  
  // Safe to add to scene
};
```

### 5. Collision Detection Integration
```javascript
// The collision system expects a "modelContainer" group
// Point it to the model-viewer's scene:
modelContainer = modelViewer.model;

// Or track accessories separately:
const loadedAccessories = {
  clothes: null,
  face: null,
  head: null
};

// Add to scene AND track reference:
modelViewer.model.add(accessory);
loadedAccessories[category] = accessory;
```

### 6. Lighting
Model-viewer uses environment-based lighting:
```html
<model-viewer 
  environment-image="neutral"  <!-- Standard gray environment -->
  shadow-intensity="1">        <!-- Soft shadows -->
```

No need for manual lights! This matches OpenSea's rendering.

---

## ✅ Testing Checkpoints

### Pre-Migration Checklist
- [ ] Create backup of current working version
- [ ] Verify all models/ files are present
- [ ] Document current functionality
- [ ] Test current version works end-to-end

### Step 1 Checkpoint
- [ ] Model-viewer component loads
- [ ] Single model displays (body_white.glb)
- [ ] Mouse controls work (rotate, zoom)
- [ ] Auto-rotation works
- [ ] No console errors

### Step 2 Checkpoint
- [ ] 4 base parts load together
- [ ] Parts positioned correctly
- [ ] No z-fighting or overlap
- [ ] Scene has 4 children

### Step 3 Checkpoint
- [ ] Body carousel switches models
- [ ] Face carousel switches models
- [ ] Screen carousel switches models
- [ ] Specs carousel switches models
- [ ] Pricing updates correctly
- [ ] No memory leaks (old models removed)

### Step 4 Checkpoint
- [ ] Accessories load without collision
- [ ] Collision detection triggers correctly
- [ ] UI shows collision warning
- [ ] Colliding items blocked from loading
- [ ] Can remove accessory to clear collision

### Step 5 Checkpoint
- [ ] Export button generates GLB
- [ ] GLB contains all parts
- [ ] Can download GLB file
- [ ] Transparency preserved in export
- [ ] File size reasonable
- [ ] Can re-import and verify

### Final Integration Checklist
- [ ] All features from original work
- [ ] Colors match OpenSea preview
- [ ] Transparency works correctly
- [ ] Emissive screens glow
- [ ] Collision detection 100% accurate
- [ ] Export generates valid GLB
- [ ] Performance is smooth
- [ ] Mobile responsive
- [ ] No console warnings

---

## 🎯 NFT Minting Flow (Final Goal)

1. **User builds robot** → Selects all parts via UI
2. **Export to GLB** → Click export, get combined model file
3. **Upload to IPFS** → Upload GLB to IPFS, get hash
4. **Generate metadata:**
   ```json
   {
     "name": "B-b0 #1234",
     "description": "Custom assembled B-b0 robot",
     "image": "ipfs://[preview-image-hash]",
     "animation_url": "ipfs://[glb-file-hash]",
     "attributes": [
       {"trait_type": "Body", "value": "White"},
       {"trait_type": "Face", "value": "Smile"},
       {"trait_type": "Screen", "value": "Green"},
       {"trait_type": "Specs", "value": "1 Core 2GB"},
       {"trait_type": "Clothes", "value": "Hoodie"},
       {"trait_type": "Total Price", "value": "15 POL"}
     ]
   }
   ```
5. **Upload metadata to IPFS** → Get metadata hash
6. **Mint NFT** → Call smart contract with metadata URI
7. **Result** → NFT displays perfectly on OpenSea/objkt!

---

## 🚨 Common Pitfalls

### 1. Material Overrides
**Problem:** Runtime material changes don't export
**Solution:** Bake properties into source GLB files

### 2. Multiple Model-Viewer Instances
**Problem:** Only one model-viewer per page
**Solution:** Load all parts into ONE model-viewer

### 3. Async Loading Race Conditions
**Problem:** User clicks rapidly, models load out of order
**Solution:** Use request tracking system (already implemented)

### 4. Voxel Cache Not Cleared
**Problem:** Collision checks use stale data
**Solution:** Clear cache when model changes (already handled)

### 5. Z-Fighting
**Problem:** Multiple parts at same position flicker
**Solution:** Ensure parts have different positions or merge geometry

---

## 📚 Resources

- **Model-Viewer Docs:** https://modelviewer.dev
- **Model-Viewer Examples:** https://modelviewer.dev/examples
- **Three.js GLTFExporter:** https://threejs.org/docs/#examples/en/exporters/GLTFExporter
- **OpenSea Metadata:** https://docs.opensea.io/docs/metadata-standards
- **IPFS Upload:** https://docs.ipfs.tech/how-to/websites-on-ipfs/

---

## 🎓 Summary

**What we're doing:**
- Replacing custom Three.js renderer with Google Model-Viewer
- Keeping 90% of existing logic (collision, UI, pricing)
- Improving compatibility with OpenSea/objkt
- Fixing transparency and color accuracy issues
- Simplifying codebase dramatically

**Why it works:**
- Model-viewer uses Three.js internally (same foundation)
- We can access the scene graph directly via `.model`
- Collision system works unchanged
- Export to GLB is simpler and more reliable

**End result:**
- Exact same functionality for users
- Better visual quality
- OpenSea/objkt compatibility
- Simpler maintenance
- Ready for NFT minting!

---

**Ready to migrate? Start with Baby Step 1! 🚀**
