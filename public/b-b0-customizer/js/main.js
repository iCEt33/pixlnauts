// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  log("Initializing B-b0 assembler");
  
  // Initialize loader
  initLoader();
  
  // Initialize model-viewer scene
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

  // Move reset button to buttons group if needed
  const resetButton = document.getElementById('reset-button');
  const buttonsGroup = document.querySelector('.buttons-group');
  
  if (resetButton && buttonsGroup && resetButton.parentNode !== buttonsGroup) {
    resetButton.parentNode.removeChild(resetButton);
    buttonsGroup.appendChild(resetButton);
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

  // Create container for side buttons
  const modelContainer = document.querySelector('.model-container');
  if (modelContainer) {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-side';
    buttonsContainer.style.position = 'absolute';
    buttonsContainer.style.left = '-110px';  // LEFT side, not right
    buttonsContainer.style.top = '0';
    buttonsContainer.style.width = '100px';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.gap = '10px';
    
    modelContainer.style.position = 'relative';
    modelContainer.appendChild(buttonsContainer);
    
    // Add buttons
    const sideButtons = [
      { id: 'auto-rotate-side', text: 'Auto Rotate', active: true, clickTarget: 'auto-rotate-toggle' },
      { id: 'camera-reset-side', text: 'Reset Camera', clickTarget: 'camera-reset' },
      { id: 'performance-side', text: 'Performance', clickTarget: 'performance-toggle' },
      { id: 'snapshot-side', text: 'Snapshot', onClick: () => takeHighResSnapshot() },
      { id: 'export-side', text: 'Export GLB', onClick: () => exportCurrentModel() },
      { id: 'reset-side', text: 'Reset B-b0', style: { backgroundColor: '#500', borderColor: '#f00' }, clickTarget: 'reset-button' }
    ];
    
    sideButtons.forEach(buttonInfo => {
      const btn = document.createElement('button');
      btn.id = buttonInfo.id;
      btn.textContent = buttonInfo.text;
      btn.className = 'toggle-button';
      if (buttonInfo.active) btn.classList.add('active');
      
      if (buttonInfo.style) {
        Object.assign(btn.style, buttonInfo.style);
      }
      
      if (buttonInfo.onClick) {
        btn.addEventListener('click', buttonInfo.onClick);
      } else if (buttonInfo.clickTarget) {
        btn.addEventListener('click', () => {
          const target = document.getElementById(buttonInfo.clickTarget);
          if (target) {
            target.click();
            setTimeout(() => {
              if (target.classList.contains('active')) {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            }, 10);
          }
        });
      }
      
      buttonsContainer.appendChild(btn);
    });
    
    log('Side buttons added');
  }
  
  log("B-b0 assembler initialized");
});