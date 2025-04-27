// Function to update prices
const updatePrices = () => {
  // Get current selections
  const bodyModel = modelDefinitions.body[currentSelections.body];
  const faceModel = modelDefinitions.face[currentSelections.face];
  const screenModel = modelDefinitions.screen[currentSelections.screen];
  const specsModel = modelDefinitions.specs[currentSelections.specs];
  
  // Update individual component prices for base components
  document.getElementById('body-price').textContent = `${bodyModel.price.toFixed(2)} POL`;
  document.getElementById('face-price').textContent = `${faceModel.price.toFixed(2)} POL`;
  document.getElementById('screen-price').textContent = `${screenModel.price.toFixed(2)} POL`;
  document.getElementById('specs-price').textContent = `${specsModel.price.toFixed(2)} POL`;
  
  // Calculate accessories total, excluding colliding items
  let accessoriesTotal = 0;
  
  // Clothes
  const clothesIndex = currentSelections["accessories-clothes"];
  const clothesModel = modelDefinitions.accessories.clothes[clothesIndex];
  if (clothesIndex > 0 && !collidingAccessories.clothes) {
    accessoriesTotal += clothesModel.price;
  }
  
  // Face accessory
  const faceAccIndex = currentSelections["accessories-face"];
  const faceAccModel = modelDefinitions.accessories.face[faceAccIndex];
  if (faceAccIndex > 0 && !collidingAccessories.face) {
    accessoriesTotal += faceAccModel.price;
  }
  
  // Head
  const headIndex = currentSelections["accessories-head"];
  const headModel = modelDefinitions.accessories.head[headIndex];
  if (headIndex > 0 && !collidingAccessories.head) {
    accessoriesTotal += headModel.price;
  }
  
  // Update accessories total in the UI - leave it blank as requested
  document.getElementById('accessories-total-price').textContent = ``;
  
  // Remove any existing detailed breakdown
  const existingBreakdown = document.querySelectorAll('.accessory-price-breakdown');
  existingBreakdown.forEach(item => item.remove());
  
  // Get the accessories price item
  const accessoriesPriceItem = document.getElementById('accessories-total-price').parentElement;
  const priceList = accessoriesPriceItem.parentElement;
  
  // Only show breakdown if we have accessories selected
  if (clothesIndex > 0 || faceAccIndex > 0 || headIndex > 0) {
    // Add individual accessory items
    
    // Add clothes if selected
    if (clothesIndex > 0) {
      const clothesItem = document.createElement('div');
      clothesItem.className = `price-item accessory-price-breakdown ${collidingAccessories.clothes ? 'price-inactive' : ''}`;
      clothesItem.innerHTML = `
        <span class="price-label">&nbsp;&nbsp;- Clothes: ${clothesModel.displayName}</span>
        <span class="price-value">${clothesModel.price.toFixed(2)} POL</span>
      `;
      priceList.insertBefore(clothesItem, accessoriesPriceItem.nextSibling);
    }
    
    // Add face accessory if selected
    if (faceAccIndex > 0) {
      const faceAccItem = document.createElement('div');
      faceAccItem.className = `price-item accessory-price-breakdown ${collidingAccessories.face ? 'price-inactive' : ''}`;
      faceAccItem.innerHTML = `
        <span class="price-label">&nbsp;&nbsp;- Face: ${faceAccModel.displayName}</span>
        <span class="price-value">${faceAccModel.price.toFixed(2)} POL</span>
      `;
      priceList.insertBefore(faceAccItem, accessoriesPriceItem.nextSibling);
    }
    
    // Add head if selected
    if (headIndex > 0) {
      const headItem = document.createElement('div');
      headItem.className = `price-item accessory-price-breakdown ${collidingAccessories.head ? 'price-inactive' : ''}`;
      headItem.innerHTML = `
        <span class="price-label">&nbsp;&nbsp;- Head: ${headModel.displayName}</span>
        <span class="price-value">${headModel.price.toFixed(2)} POL</span>
      `;
      priceList.insertBefore(headItem, accessoriesPriceItem.nextSibling);
    }
  }
  
  // Calculate and update total
  const total = bodyModel.price + faceModel.price + screenModel.price + specsModel.price + accessoriesTotal;
  document.getElementById('total-price').textContent = `${total.toFixed(2)} POL`;
};

// Update carousel display for a specific category
const updateCarousel = (category) => {
  const isSubcategory = category.includes('-');
  let baseCategory, subcategory;
  
  if (isSubcategory) {
    [baseCategory, subcategory] = category.split('-');
  }
  
  // Get the models array for this category
  let models;
  if (isSubcategory && baseCategory === 'accessories') {
    models = modelDefinitions.accessories[subcategory] || [];
  } else {
    models = modelDefinitions[category] || [];
  }
  
  // Skip if no models are available
  if (!models || models.length === 0) {
    log(`No models available for ${category}`);
    return;
  }
  
  // Get the current index
  const currentIndex = currentSelections[category];
  
  // Calculate prev and next indices with wrapping
  const prevIndex = (currentIndex - 1 + models.length) % models.length;
  const nextIndex = (currentIndex + 1) % models.length;
  
  // Get display elements
  const currentElem = document.querySelector(`.carousel-current[data-category="${category}"]`);
  const prevLabel = document.querySelector(`.carousel-prev-label[data-category="${category}"]`);
  const nextLabel = document.querySelector(`.carousel-next-label[data-category="${category}"]`);
  
  // Update labels
  if (currentElem) {
    // For regular components
    let displayText = models[currentIndex]?.displayName || 'None';
    currentElem.textContent = displayText;
    
    // Add/remove 'none' class for styling
    currentElem.classList.toggle('none', models[currentIndex]?.id === 'none');
    
    // Add active class for all non-none accessories
    currentElem.classList.toggle('active', models[currentIndex]?.id !== 'none');
  }
  
  if (prevLabel) {
    prevLabel.textContent = models[prevIndex]?.displayName || 'None';
  }
  
  if (nextLabel) {
    nextLabel.textContent = models[nextIndex]?.displayName || 'None';
  }
};

// Update all carousels
const updateAllCarousels = () => {
  updateCarousel('body');
  updateCarousel('face');
  updateCarousel('screen');
  updateCarousel('specs');
  updateCarousel('accessories-clothes');
  updateCarousel('accessories-face');
  updateCarousel('accessories-head');
};

// Change selection for a category
const changeSelection = async (category, direction) => {
  const isSubcategory = category.includes('-');
  let baseCategory, subcategory;
  
  if (isSubcategory) {
    [baseCategory, subcategory] = category.split('-');
  }
  
  // Get the models array for this category
  let models;
  if (isSubcategory && baseCategory === 'accessories') {
    models = modelDefinitions.accessories[subcategory] || [];
  } else {
    models = modelDefinitions[category] || [];
  }
  
  // Skip if no models are available
  if (!models || models.length === 0) {
    log(`No models available for ${category}`);
    return;
  }
  
  // Calculate the new index with wrapping
  const currentIndex = currentSelections[category];
  const newIndex = direction === 'next'
    ? (currentIndex + 1) % models.length
    : (currentIndex - 1 + models.length) % models.length;
  
  // Update the UI immediately to show the new selection
  currentSelections[category] = newIndex;
  
  // Get current element to update styling
  const currentElem = document.querySelector(`.carousel-current[data-category="${category}"]`);
  
  // Update the carousel display
  updateCarousel(category);
  
  // Only check for collisions for accessory categories
  if (isSubcategory && baseCategory === 'accessories') {
    // Check if the new accessory would collide with existing ones
    const collisionResult = await checkAccessoryCollisions(models[newIndex], subcategory);
    
    if (collisionResult.hasCollision) {
      // Show warning but still allow selection visually
      showCollisionWarning(collisionResult);
      
      // Mark this item as colliding in the UI with red styling
      if (currentElem) {
        // Remove the 'active' class which gives it a green color
        currentElem.classList.remove('active');
        
        // Add a new 'collision' class
        currentElem.classList.add('collision');
      }
      
      // Mark this accessory as colliding
      collidingAccessories[subcategory] = true;
      
      // Don't actually load the model
      log(`Skipping loading of ${models[newIndex].displayName} due to collision`);
    } else {
      // No collision, hide any existing warning
      hideCollisionWarning();
      
      // Remove collision styling if it exists
      if (currentElem) {
        currentElem.classList.remove('collision');
      }
      
      // Mark as not colliding
      collidingAccessories[subcategory] = false;
      
      // Load the accessory model
      loadModel(models[newIndex], baseCategory, subcategory);
      
      // If we just loaded or removed an accessory, we need to recheck other accessories
      // that might have been marked as colliding before
      setTimeout(() => recheckAllAccessories(), 100);
    }
  } else {
    // For main categories, just load the selected model
    loadModel(models[newIndex], category);
    
    // If we changed a main category, recheck accessories in case
    // the change resolved some collision
    if (!isSubcategory) {
      setTimeout(() => recheckAllAccessories(), 100);
    }
  }
  
  // Update prices whenever a selection changes
  updatePrices();
};