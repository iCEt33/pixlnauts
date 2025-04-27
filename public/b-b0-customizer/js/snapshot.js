// Function to take a high-resolution snapshot of the scene at 2000x2000 resolution
const takeHighResSnapshot = () => {
  // Show a message that snapshot is being generated
  const snapshotMessage = document.createElement('div');
  snapshotMessage.className = 'snapshot-message';
  snapshotMessage.textContent = 'Preparing high-quality snapshot...';
  document.getElementById('model-viewer').appendChild(snapshotMessage);
  
  log("Setting up for 2000x2000 high-resolution snapshot...");
  
  // First reset the camera by triggering a click on the reset button
  document.getElementById('camera-reset').click();
  
  // Store the current state of performance mode and auto-rotate
  const wasPerformanceModeOn = performanceMode;
  const wasAutoRotateOn = controls.autoRotate;
  
  // Turn off auto-rotate temporarily
  controls.autoRotate = false;
  
  // If performance mode is on, turn it off temporarily for better quality
  if (wasPerformanceModeOn) {
    // Call the performance toggle function to properly turn it off
    document.getElementById('performance-toggle').click();
    log("Temporarily disabled performance mode for snapshot quality");
  }
  
  // A small delay to let all the settings take effect
  setTimeout(() => {
    // Get the current size of the renderer
    const originalWidth = renderer.domElement.width;
    const originalHeight = renderer.domElement.height;
    
    // Fixed dimensions for high-resolution output
    const targetWidth = 2000;
    const targetHeight = 2000;
    
    // Store the current pixel ratio
    const originalPixelRatio = renderer.getPixelRatio();
    
    try {
      // Set the renderer and composer to the high-resolution size
      renderer.setSize(targetWidth, targetHeight);
      if (composer) {
        composer.setSize(targetWidth, targetHeight);
      }
      
      // Set a higher pixel ratio for better quality
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Store original camera properties
      const originalAspect = camera.aspect;
      
      // Update camera for the new aspect ratio while maintaining the view
      camera.aspect = targetWidth / targetHeight;
      camera.updateProjectionMatrix();
      
      // Render the scene at high resolution
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      
      // Capture the image from the renderer
      const dataURL = renderer.domElement.toDataURL('image/png');
      
      // Create an anchor element to download the image
      const downloadLink = document.createElement('a');
      downloadLink.href = dataURL;
      downloadLink.download = `b-b0_snapshot_${Date.now()}.png`;
      
      // Programmatically click the link to trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Log success
      log(`Snapshot created successfully at ${targetWidth}x${targetHeight} resolution`);
      
      // Reset the renderer back to its original state
      renderer.setSize(originalWidth, originalHeight);
      if (composer) {
        composer.setSize(originalWidth, originalHeight);
      }
      renderer.setPixelRatio(originalPixelRatio);
      
      // Reset the camera aspect ratio
      camera.aspect = originalAspect;
      camera.updateProjectionMatrix();
      
      // Restore auto-rotation state
      controls.autoRotate = wasAutoRotateOn;
      
      // Restore performance mode to its original state if it was on
      if (wasPerformanceModeOn && !performanceMode) {
        document.getElementById('performance-toggle').click();
        log("Restored performance mode to original setting");
      }
      
      // Remove the message
      snapshotMessage.textContent = 'Snapshot saved!';
      snapshotMessage.classList.add('success');
      
      // Auto-remove the message after 3 seconds
      setTimeout(() => {
        if (snapshotMessage.parentNode) {
          snapshotMessage.parentNode.removeChild(snapshotMessage);
        }
      }, 3000);
    } catch (error) {
      // If anything goes wrong, log the error and restore original settings
      log(`Error taking snapshot: ${error.message}`);
      
      // Remove the message
      snapshotMessage.textContent = 'Error creating snapshot!';
      snapshotMessage.classList.add('error');
      
      // Auto-remove the message after 3 seconds
      setTimeout(() => {
        if (snapshotMessage.parentNode) {
          snapshotMessage.parentNode.removeChild(snapshotMessage);
        }
      }, 3000);
      
      // Reset to original size
      renderer.setSize(originalWidth, originalHeight);
      if (composer) {
        composer.setSize(originalWidth, originalHeight);
      }
      renderer.setPixelRatio(originalPixelRatio);
      
      // Reset camera
      camera.aspect = originalWidth / originalHeight;
      camera.updateProjectionMatrix();
      
      // Restore auto-rotation state
      controls.autoRotate = wasAutoRotateOn;
      
      // Restore performance mode to its original state if it was on
      if (wasPerformanceModeOn && !performanceMode) {
        document.getElementById('performance-toggle').click();
      }
    }
  }, 200); // Increased delay to ensure all settings take effect
};
  
  // Function to add snapshot button to the UI
  const addSnapshotButton = () => {
    const buttonsGroup = document.querySelector('.buttons-group');
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshot-button';
    snapshotButton.className = 'toggle-button';
    snapshotButton.innerHTML = 'Take 2K Snapshot';
    
    // Add to buttons group
    buttonsGroup.appendChild(snapshotButton);
    
    // Add event listener
    snapshotButton.addEventListener('click', takeHighResSnapshot);
    
    log("Snapshot button added to interface");
  };
  
  // Add the snapshot button once the document is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // We add a small delay to ensure other initialization is complete
    setTimeout(addSnapshotButton, 100);
  });