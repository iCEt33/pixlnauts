// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  log("Initializing B-b0 assembler");
  
  // Initialize Three.js scene
  initScene();
  
  // Initial population of carousels
  updateAllCarousels();
  
  // Initialize prices
  updatePrices();
  
  // Add collision toggle button
  addCollisionToggle();
  
  // Add event listeners to all carousel arrows
  document.querySelectorAll('.carousel-arrow').forEach(arrow => {
    arrow.addEventListener('click', () => {
      const category = arrow.getAttribute('data-category');
      const direction = arrow.classList.contains('next-arrow') ? 'next' : 'prev';
      changeSelection(category, direction);
    });
  });
  
  // Add reset button handler
  document.getElementById('reset-button').addEventListener('click', () => {
    resetAllModels();
    updatePrices();
  });
  
  // Load default models
  loadDefaultModels();

  const resetButton = document.getElementById('reset-button');
  const buttonsGroup = document.querySelector('.buttons-group');
  
  // Only move if both elements exist and reset button isn't already in the group
  if (resetButton && buttonsGroup && resetButton.parentNode !== buttonsGroup) {
    // Remove from current location
    resetButton.parentNode.removeChild(resetButton);
    
    // Add to buttons group
    buttonsGroup.appendChild(resetButton);
    
    // Update styling
    resetButton.className = 'toggle-button';
    resetButton.textContent = 'Reset All';
  }
  
  // Hide the original header if it's no longer needed
  const controlsHeader = document.querySelector('.controls-header');
  if (controlsHeader) {
    controlsHeader.style.display = 'none';
  }
  
  // Update the intro text to be more compact
  const introText = document.querySelector('.controls-panel > p');
  if (introText) {
    introText.style.margin = '2px 0 5px';
    introText.style.fontSize = '12px';
  }

  // Create container for buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.position = 'absolute';
  buttonsContainer.style.left = '-110px';
  buttonsContainer.style.top = '0';
  buttonsContainer.style.width = '100px';
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.flexDirection = 'column';
  buttonsContainer.style.gap = '10px';
  
  // Get model container to attach to
  const modelContainer = document.querySelector('.model-container');
  if (modelContainer) {
    modelContainer.style.position = 'relative';
    modelContainer.appendChild(buttonsContainer);
    
    // List of buttons to clone - REMOVED snapshot button from this list
    const buttonsToClone = [
      { id: 'auto-rotate-toggle', text: 'Auto Rotate' },
      { id: 'camera-reset', text: 'Reset Camera' },
      { id: 'performance-toggle', text: 'Performance Mode' },
      { id: 'reset-button', text: 'Reset B-b0' }
    ];
    
    // Create each button
    buttonsToClone.forEach(buttonInfo => {
      const originalButton = document.getElementById(buttonInfo.id);
      
      // Create a new button
      const newButton = document.createElement('button');
      newButton.textContent = buttonInfo.text;
      newButton.className = 'toggle-button';
      
      // Special styling for Reset All button
      if (buttonInfo.id === 'reset-button') {
        // Apply red styling
        newButton.style.backgroundColor = '#500';
        newButton.style.color = '#fff';
        newButton.style.border = '1px solid #f00';
      }

      // For active buttons - special case for Auto Rotate to ensure it shows as active
      if (buttonInfo.id === 'auto-rotate-toggle') {
        newButton.classList.add('active');
      } else if (originalButton && originalButton.classList.contains('active')) {
        newButton.classList.add('active');
      }
      
      // Add click handler that triggers the original button
      newButton.addEventListener('click', function() {
        if (originalButton) {
          originalButton.click();
          
          // Update active state if needed
          setTimeout(() => {
            if (originalButton.classList.contains('active')) {
              newButton.classList.add('active');
            } else {
              newButton.classList.remove('active');
            }
          }, 10);
        }
      });
      
      // Add to container
      buttonsContainer.appendChild(newButton);
    });
    
    log('Added buttons to the left of renderer');
    
    // Add snapshot button with direct function call
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshot-clone';
    snapshotButton.textContent = 'Take 2K Snapshot';
    snapshotButton.className = 'toggle-button';
    
    // Apply yellow styling
    snapshotButton.style.backgroundColor = '#550';
    snapshotButton.style.color = '#fff';
    snapshotButton.style.border = '1px solid #ff0';
    
    // Direct event handler for taking snapshot
    snapshotButton.addEventListener('click', function() {
      // Try to call the function directly first
      if (typeof takeHighResSnapshot === 'function') {
        takeHighResSnapshot();
        log('Snapshot taken via direct function call');
      } else {
        // Try to get the button as fallback
        const originalSnapshotButton = document.getElementById('snapshot-button');
        if (originalSnapshotButton) {
          originalSnapshotButton.click();
          log('Snapshot taken via button click');
        } else {
          log('Cannot find snapshot function or button');
        }
      }
    });
    
    // Add to the container
    buttonsContainer.appendChild(snapshotButton);
  }
});