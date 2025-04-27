// Function to toggle performance mode
const togglePerformanceMode = () => {
  performanceMode = !performanceMode;
  
  // Update button text
  const performanceToggle = document.getElementById('performance-toggle');
  performanceToggle.textContent = `Performance Mode: ${performanceMode ? 'ON' : 'OFF'}`;
  performanceToggle.classList.toggle('active', performanceMode);
  
  // Apply renderer changes
  if (performanceMode) {
    // Enable performance mode
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1); // Lower pixel ratio
    
    // Simplify lighting
    scene.remove(fillLight);
    scene.remove(backLight);
    scene.remove(rimLight);
    
    // Reduce main light intensity
    mainLight.intensity = 1.5;
    ambientLight.intensity = 1.0;
    
    // Disable shadows on all objects
    scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
    
    // Disable bloom in performance mode
    if (bloomPass) {
      bloomPass.enabled = false;
    }
    
    log("Performance mode enabled - reduced graphics quality for better performance");
  } else {
    // Restore high quality mode
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Restore complex lighting
    scene.add(fillLight);
    scene.add(backLight);
    scene.add(rimLight);
    
    // Restore light intensity
    mainLight.intensity = 2.5;
    ambientLight.intensity = 0.8;
    
    // Re-enable shadows on all objects
    scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    
    // Enable bloom in high quality mode
    if (bloomPass) {
      bloomPass.enabled = true;
    }
    
    log("High quality mode enabled - full graphics quality with shadows and lighting");
  }
};

// Initialize Three.js scene
const initScene = () => {
  log("Initializing 3D scene...");
  const container = document.getElementById('model-viewer');
  
  // Frame counter for animation
  let frameCount = 0;
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  
  // Create a container for all models
  modelContainer = new THREE.Group();
  scene.add(modelContainer);
  
  // Add camera
  camera = new THREE.PerspectiveCamera(
    40, // Slightly narrower FOV to match the reference 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  );
  // Position camera to properly frame the model
  camera.position.set(2, 1.2, 6.5);
  
  // Set renderer with better shadow settings and correct alpha settings
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true, // Enable alpha buffer
    premultipliedAlpha: false // Important for proper transparency
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Smoother shadows
  container.appendChild(renderer.domElement);

  // Initialize bloom effects
  initBloom();
  
  // Add lighting with improved shadow settings
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  
  mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
  mainLight.position.set(5, 8, 7);
  mainLight.castShadow = true;
  
  // Improve shadow quality
  mainLight.shadow.mapSize.width = 2048; 
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.1;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -15;
  mainLight.shadow.camera.right = 15;
  mainLight.shadow.camera.top = 15;
  mainLight.shadow.camera.bottom = -15;
  mainLight.shadow.bias = -0.0005;
  
  scene.add(mainLight);
  
  // Add a fill light from the opposite direction
  fillLight = new THREE.DirectionalLight(0xffffff, 1);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);
  
  // Add a subtle backlight to create separation from background
  backLight = new THREE.DirectionalLight(0x333333, 1);
  backLight.position.set(2, 3, -8);
  scene.add(backLight);
  
  // Add a subtle rim light for the screen glow effect
  rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(5, 2, -3);
  scene.add(rimLight);
  
  // Add ground plane with a completely non-reflective black material
  const groundGeometry = new THREE.PlaneGeometry(30, 30);

  // Use MeshBasicMaterial for complete non-reflectivity
  // This material doesn't respond to lighting at all
  groundMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x111111
  });
  
  const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
  groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  groundPlane.position.y = -0.01;        // Slightly below zero
  scene.add(groundPlane);
  
  // Add subtle grid helper for reference but more subdued than before
  const gridHelper = new THREE.GridHelper(30, 30, 0x777777, 0x555555);
  gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
  
  // Set up controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false; // Start with auto-rotation off (will enable after delay)
  controls.autoRotateSpeed = 0.5;
  
  // Center the orbit controls on the upper body part of the model
  controls.target.set(0, 1, 0);
  
  // Variables for auto-rotation control
  let autoRotateEnabled = true;
  let autoRotateTimeout = null;
  let isInteracting = false;
  
  // Add initial delay before starting auto-rotation
  setTimeout(() => {
    if (autoRotateEnabled && !isInteracting) {
      controls.autoRotate = true;
      log("Auto-rotation started after initial delay");
    }
  }, 3000); // 3-second initial delay
  
  // Function to handle when user starts interaction
  const handleInteractionStart = () => {
    isInteracting = true;
    
    // Stop auto-rotation immediately
    controls.autoRotate = false;
    
    // Clear any existing timeout
    if (autoRotateTimeout) {
      clearTimeout(autoRotateTimeout);
      autoRotateTimeout = null;
    }
  };
  
  // Function to handle when user ends interaction
  const handleInteractionEnd = () => {
    isInteracting = false;
    
    // Only set a timeout if auto-rotation is enabled in general
    if (autoRotateEnabled) {
      // Clear any existing timeout first (just in case)
      if (autoRotateTimeout) {
        clearTimeout(autoRotateTimeout);
      }
      
      // Schedule re-enabling of auto-rotation after user completely stops interacting
      autoRotateTimeout = setTimeout(() => {
        if (!isInteracting && autoRotateEnabled) {
          controls.autoRotate = true;
          log("Auto-rotation resumed after user interaction");
        }
      }, 5000); // 5-second delay after interaction ends
    }
  };
  
  // Add event listeners for complete interaction tracking
  renderer.domElement.addEventListener('pointerdown', handleInteractionStart);
  renderer.domElement.addEventListener('pointerup', handleInteractionEnd);
  renderer.domElement.addEventListener('pointercancel', handleInteractionEnd);
  renderer.domElement.addEventListener('pointerleave', handleInteractionEnd);
  
  // Auto-rotate toggle button
  document.getElementById('auto-rotate-toggle').addEventListener('click', () => {
    autoRotateEnabled = !autoRotateEnabled;
    
    if (autoRotateEnabled) {
      // If enabling, set a timeout before starting rotation
      if (!isInteracting) {
        autoRotateTimeout = setTimeout(() => {
          if (!isInteracting && autoRotateEnabled) {
            controls.autoRotate = true;
          }
        }, 3000); // 3-second delay when manually enabling
      }
    } else {
      // If disabling, stop rotation immediately
      controls.autoRotate = false;
      
      // Clear any pending timeout
      if (autoRotateTimeout) {
        clearTimeout(autoRotateTimeout);
        autoRotateTimeout = null;
      }
    }
    
    const toggleButton = document.getElementById('auto-rotate-toggle');
    toggleButton.textContent = `Auto Rotate: ${autoRotateEnabled ? 'ON' : 'OFF'}`;
    toggleButton.classList.toggle('active', autoRotateEnabled);
    
    log(`Auto-rotation ${autoRotateEnabled ? 'enabled' : 'disabled'}`);
  });
  
  // Performance mode toggle button
  document.getElementById('performance-toggle').addEventListener('click', togglePerformanceMode);
  
  // Camera reset button
  document.getElementById('camera-reset').addEventListener('click', () => {
    camera.position.set(-2.5, 1.2, 6.5);
    controls.target.set(0, 1, 0);
    controls.update();
    log('Camera position reset');
  });
  
  // Loading manager
  loadingManager = new THREE.LoadingManager();
  loadingManager.onLoad = () => {
    if (loadingQueue <= 0) {
      document.getElementById('loading-overlay').style.display = 'none';
      loadingQueue = 0;
      log("All models loaded successfully");
    }
  };
  
  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    document.querySelector('.loading-text').textContent = `Loading... ${progress}%`;
  };
  
  loadingManager.onError = (url) => {
    log(`Error loading: ${url}`);
    loadingQueue--;
    if (loadingQueue <= 0) {
      document.getElementById('loading-overlay').style.display = 'none';
      loadingQueue = 0;
    }
    document.querySelector('.loading-text').textContent = `Error loading model`;
  };
  
  // GLTFLoader
  gltfLoader = new THREE.GLTFLoader(loadingManager);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  
  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    frameCount++;
    
    // Use composer for rendering which includes the bloom effect
    if (composer && !performanceMode) {
      composer.render();
    } else {
      // Fall back to standard rendering when in performance mode
      renderer.render(scene, camera);
    }
  };
  
  animate();
  
  log("Scene initialized successfully");
};