// Initialize bloom effect
const initBloom = () => {
  // Initialize bloom parameters
  const bloomParams = {
    bloomStrength: 0.4,
    bloomThreshold: 0.9,
    bloomRadius: 0.5
  };
  
  // Create necessary passes
  const renderPass = new THREE.RenderPass(scene, camera);
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight),
    bloomParams.bloomStrength,
    bloomParams.bloomRadius,
    bloomParams.bloomThreshold
  );
  
  // Create the effect composer
  composer = new THREE.EffectComposer(renderer);
  composer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  
  // Handle resize
  window.addEventListener('resize', () => {
    composer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  });
  
  log("Bloom effect initialized - will apply to any materials with emission");
};