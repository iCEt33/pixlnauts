// UI with consistent verification - every selection gets unique ID
// Results are only applied if the selection ID is still current

// Track the latest selection ID for each category
const latestSelectionId = {
  'accessories-clothes': null,
  'accessories-face': null,
  'accessories-head': null
};

// Function to update prices
const updatePrices = () => {
  const bodyModel = modelDefinitions.body[currentSelections.body];
  const faceModel = modelDefinitions.face[currentSelections.face];
  const screenModel = modelDefinitions.screen[currentSelections.screen];
  const specsModel = modelDefinitions.specs[currentSelections.specs];
  
  document.getElementById('body-price').textContent = `${bodyModel.price.toFixed(2)} POL`;
  document.getElementById('face-price').textContent = `${faceModel.price.toFixed(2)} POL`;
  document.getElementById('screen-price').textContent = `${screenModel.price.toFixed(2)} POL`;
  document.getElementById('specs-price').textContent = `${specsModel.price.toFixed(2)} POL`;
  
  let accessoriesTotal = 0;
  
  const clothesIndex = currentSelections["accessories-clothes"];
  const clothesModel = modelDefinitions.accessories.clothes[clothesIndex];
  if (clothesIndex > 0 && !collidingAccessories.clothes) {
    accessoriesTotal += clothesModel.price;
  }
  
  const faceAccIndex = currentSelections["accessories-face"];
  const faceAccModel = modelDefinitions.accessories.face[faceAccIndex];
  if (faceAccIndex > 0 && !collidingAccessories.face) {
    accessoriesTotal += faceAccModel.price;
  }
  
  const headIndex = currentSelections["accessories-head"];
  const headModel = modelDefinitions.accessories.head[headIndex];
  if (headIndex > 0 && !collidingAccessories.head) {
    accessoriesTotal += headModel.price;
  }
  
  document.getElementById('accessories-total-price').textContent = ``;
  
  const existingBreakdown = document.querySelectorAll('.accessory-price-breakdown');
  existingBreakdown.forEach(item => item.remove());
  
  const accessoriesPriceItem = document.getElementById('accessories-total-price').parentElement;
  const priceList = accessoriesPriceItem.parentElement;
  
  if (clothesIndex > 0 || faceAccIndex > 0 || headIndex > 0) {
    if (clothesIndex > 0) {
      const clothesItem = document.createElement('div');
      clothesItem.className = `price-item accessory-price-breakdown ${collidingAccessories.clothes ? 'price-inactive' : ''}`;
      clothesItem.innerHTML = `
        <span class="price-label">&nbsp;&nbsp;- Clothes: ${clothesModel.displayName}</span>
        <span class="price-value">${clothesModel.price.toFixed(2)} POL</span>
      `;
      priceList.insertBefore(clothesItem, accessoriesPriceItem.nextSibling);
    }
    
    if (faceAccIndex > 0) {
      const faceAccItem = document.createElement('div');
      faceAccItem.className = `price-item accessory-price-breakdown ${collidingAccessories.face ? 'price-inactive' : ''}`;
      faceAccItem.innerHTML = `
        <span class="price-label">&nbsp;&nbsp;- Face: ${faceAccModel.displayName}</span>
        <span class="price-value">${faceAccModel.price.toFixed(2)} POL</span>
      `;
      priceList.insertBefore(faceAccItem, accessoriesPriceItem.nextSibling);
    }
    
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
  
  const total = bodyModel.price + faceModel.price + screenModel.price + specsModel.price + accessoriesTotal;
  document.getElementById('total-price').textContent = `${total.toFixed(2)} POL`;
};

// Update carousel display
const updateCarousel = (category) => {
  const isSubcategory = category.includes('-');
  let baseCategory, subcategory;
  
  if (isSubcategory) {
    [baseCategory, subcategory] = category.split('-');
  }
  
  let models;
  if (isSubcategory && baseCategory === 'accessories') {
    models = modelDefinitions.accessories[subcategory] || [];
  } else {
    models = modelDefinitions[category] || [];
  }
  
  if (!models || models.length === 0) return;
  
  const currentIndex = currentSelections[category];
  const prevIndex = (currentIndex - 1 + models.length) % models.length;
  const nextIndex = (currentIndex + 1) % models.length;
  
  const currentElem = document.querySelector(`.carousel-current[data-category="${category}"]`);
  const prevLabel = document.querySelector(`.carousel-prev-label[data-category="${category}"]`);
  const nextLabel = document.querySelector(`.carousel-next-label[data-category="${category}"]`);
  
  if (currentElem) {
    let displayText = models[currentIndex]?.displayName || 'None';
    currentElem.textContent = displayText;
    currentElem.classList.toggle('none', models[currentIndex]?.id === 'none');
    currentElem.classList.toggle('active', models[currentIndex]?.id !== 'none');
  }
  
  if (prevLabel) prevLabel.textContent = models[prevIndex]?.displayName || 'None';
  if (nextLabel) nextLabel.textContent = models[nextIndex]?.displayName || 'None';
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

// Change selection - with unique ID verification
const changeSelection = async (category, direction) => {
  // Generate unique ID for this selection change
  const selectionId = Date.now() + Math.random();
  
  const isSubcategory = category.includes('-');
  let baseCategory, subcategory;
  
  if (isSubcategory) {
    [baseCategory, subcategory] = category.split('-');
  }
  
  let models;
  if (isSubcategory && baseCategory === 'accessories') {
    models = modelDefinitions.accessories[subcategory] || [];
  } else {
    models = modelDefinitions[category] || [];
  }
  
  if (!models || models.length === 0) return;
  
  const currentIndex = currentSelections[category];
  const newIndex = direction === 'next'
    ? (currentIndex + 1) % models.length
    : (currentIndex - 1 + models.length) % models.length;
  
  // Update selection IMMEDIATELY
  currentSelections[category] = newIndex;
  updateCarousel(category);
  
  const currentElem = document.querySelector(`.carousel-current[data-category="${category}"]`);
  
  log(`Selection change ${category} -> ${models[newIndex].displayName} (ID: ${selectionId})`);
  
  // For accessories, check collision
  if (isSubcategory && baseCategory === 'accessories') {
    // Store this as the latest selection ID for this category
    latestSelectionId[category] = selectionId;
    
    // If selecting "None", just clear and we're done
    if (newIndex === 0) {
      collidingAccessories[subcategory] = false;
      if (currentElem) {
        currentElem.classList.remove('collision');
        currentElem.classList.remove('loading');
        currentElem.classList.remove('active');
      }
      
      // Load models (which will exclude this None)
      loadAllModels();
      updatePrices();
      
      // Recheck other accessories in case this freed up space
      setTimeout(() => recheckOtherAccessories(subcategory, selectionId), 100);
      return;
    }
    
    // Show loading indicator
    if (currentElem) currentElem.classList.add('loading');
    
    try {
      // Check collision (async)
      const collisionResult = await checkAccessoryCollisions(models[newIndex], subcategory);
      
      // VERIFY this selection is still current
      if (latestSelectionId[category] !== selectionId) {
        log(`Ignoring outdated result for ${category} (ID: ${selectionId})`);
        if (currentElem) currentElem.classList.remove('loading');
        return; // THROW AWAY this result
      }
      
      // VERIFY the selection hasn't changed
      if (currentSelections[category] !== newIndex) {
        log(`Selection changed during check for ${category}`);
        if (currentElem) currentElem.classList.remove('loading');
        return;
      }
      
      // Remove loading
      if (currentElem) currentElem.classList.remove('loading');
      
      if (collisionResult.hasCollision) {
        // COLLISION - mark as red, don't load
        log(`COLLISION: ${models[newIndex].displayName} vs ${collisionResult.collidingWith}`);
        
        collidingAccessories[subcategory] = true;
        
        if (currentElem) {
          currentElem.classList.remove('active');
          currentElem.classList.add('collision');
        }
        
        showCollisionWarning(collisionResult);
        
      } else {
        // NO COLLISION - mark as safe, load it
        log(`SAFE: ${models[newIndex].displayName}`);
        
        collidingAccessories[subcategory] = false;
        
        if (currentElem) {
          currentElem.classList.remove('collision');
          currentElem.classList.add('active');
        }
        
        hideCollisionWarning();
      }
      
      // Load all models (will include/exclude based on collision flags)
      loadAllModels();
      updatePrices();
      
      // Recheck other accessories that might have been blocked
      setTimeout(() => recheckOtherAccessories(subcategory, selectionId), 100);
      
    } catch (error) {
      log(`Error during collision check: ${error.message}`);
      if (currentElem) currentElem.classList.remove('loading');
    }
    
  } else {
    // Main category (body/face/screen/specs) - just load it
    loadModel(models[newIndex], category);
    updatePrices();
    
    // Recheck all accessories in case body change affects collisions
    setTimeout(() => recheckAllAccessoriesAfterMainChange(selectionId), 100);
  }
};

// Recheck other accessories after one changes (might free up blocked items)
const recheckOtherAccessories = async (changedCategory, originalSelectionId) => {
  const categoriesToRecheck = ['clothes', 'face', 'head'].filter(c => c !== changedCategory);
  
  for (const subcategory of categoriesToRecheck) {
    const categoryKey = `accessories-${subcategory}`;
    const selectedIndex = currentSelections[categoryKey];
    
    // Skip if None
    if (selectedIndex === 0) continue;
    
    // Skip if not currently colliding (already loaded)
    if (!collidingAccessories[subcategory]) continue;
    
    // This item is marked as colliding - recheck it
    const model = modelDefinitions.accessories[subcategory][selectedIndex];
    const recheckId = Date.now() + Math.random();
    latestSelectionId[categoryKey] = recheckId;
    
    log(`Rechecking ${subcategory}: ${model.displayName} (ID: ${recheckId})`);
    
    const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
    if (currentElem) currentElem.classList.add('loading');
    
    try {
      const collisionResult = await checkAccessoryCollisions(model, subcategory);
      
      // VERIFY this recheck is still current
      if (latestSelectionId[categoryKey] !== recheckId) {
        log(`Ignoring outdated recheck for ${categoryKey}`);
        if (currentElem) currentElem.classList.remove('loading');
        continue;
      }
      
      // VERIFY selection hasn't changed
      if (currentSelections[categoryKey] !== selectedIndex) {
        log(`Selection changed during recheck for ${categoryKey}`);
        if (currentElem) currentElem.classList.remove('loading');
        continue;
      }
      
      if (currentElem) currentElem.classList.remove('loading');
      
      if (collisionResult.hasCollision) {
        // Still colliding
        log(`Still colliding: ${model.displayName} vs ${collisionResult.collidingWith}`);
        collidingAccessories[subcategory] = true;
        
        if (currentElem) {
          currentElem.classList.remove('active');
          currentElem.classList.add('collision');
        }
        
      } else {
        // No longer colliding! Load it
        log(`Now safe: ${model.displayName}`);
        collidingAccessories[subcategory] = false;
        
        if (currentElem) {
          currentElem.classList.remove('collision');
          currentElem.classList.add('active');
        }
        
        // Reload models to include this one
        loadAllModels();
      }
      
    } catch (error) {
      log(`Error during recheck: ${error.message}`);
      if (currentElem) currentElem.classList.remove('loading');
    }
  }
  
  updatePrices();
  
  // Update warning to show current collision state
  updateCollisionWarning();
};

// Recheck all accessories after a main category changes
const recheckAllAccessoriesAfterMainChange = async (mainChangeId) => {
  const subcategories = ['clothes', 'face', 'head'];
  
  for (const subcategory of subcategories) {
    const categoryKey = `accessories-${subcategory}`;
    const selectedIndex = currentSelections[categoryKey];
    
    // Skip if None
    if (selectedIndex === 0) continue;
    
    const model = modelDefinitions.accessories[subcategory][selectedIndex];
    const recheckId = Date.now() + Math.random();
    latestSelectionId[categoryKey] = recheckId;
    
    log(`Rechecking ${subcategory} after main change: ${model.displayName}`);
    
    const currentElem = document.querySelector(`.carousel-current[data-category="${categoryKey}"]`);
    if (currentElem) currentElem.classList.add('loading');
    
    try {
      const collisionResult = await checkAccessoryCollisions(model, subcategory);
      
      // VERIFY this recheck is still current
      if (latestSelectionId[categoryKey] !== recheckId) {
        log(`Ignoring outdated recheck for ${categoryKey}`);
        if (currentElem) currentElem.classList.remove('loading');
        continue;
      }
      
      // VERIFY selection hasn't changed
      if (currentSelections[categoryKey] !== selectedIndex) {
        log(`Selection changed during recheck for ${categoryKey}`);
        if (currentElem) currentElem.classList.remove('loading');
        continue;
      }
      
      if (currentElem) currentElem.classList.remove('loading');
      
      if (collisionResult.hasCollision) {
        log(`Collision: ${model.displayName} vs ${collisionResult.collidingWith}`);
        collidingAccessories[subcategory] = true;
        
        if (currentElem) {
          currentElem.classList.remove('active');
          currentElem.classList.add('collision');
        }
        
      } else {
        log(`Safe: ${model.displayName}`);
        collidingAccessories[subcategory] = false;
        
        if (currentElem) {
          currentElem.classList.remove('collision');
          currentElem.classList.add('active');
        }
      }
      
    } catch (error) {
      log(`Error during recheck: ${error.message}`);
      if (currentElem) currentElem.classList.remove('loading');
    }
  }
  
  // Reload all models with current collision states
  loadAllModels();
  updatePrices();
  updateCollisionWarning();
};

// Update collision warning to show current state
const updateCollisionWarning = () => {
  const subcategories = ['clothes', 'face', 'head'];
  const collidingItems = [];
  
  for (const subcat of subcategories) {
    if (collidingAccessories[subcat]) {
      const categoryKey = `accessories-${subcat}`;
      const selectedIndex = currentSelections[categoryKey];
      if (selectedIndex > 0) {
        const model = modelDefinitions.accessories[subcat][selectedIndex];
        collidingItems.push({ subcat, model });
      }
    }
  }
  
  if (collidingItems.length > 0) {
    // Find what the first colliding item is colliding with
    const item = collidingItems[0];
    const otherCategories = subcategories.filter(c => c !== item.subcat && !collidingAccessories[c]);
    
    let collidingWith = '';
    for (const otherCat of otherCategories) {
      const otherKey = `accessories-${otherCat}`;
      const otherIndex = currentSelections[otherKey];
      if (otherIndex > 0) {
        collidingWith = modelDefinitions.accessories[otherCat][otherIndex].displayName;
        break;
      }
    }
    
    if (collidingWith) {
      showCollisionWarning({
        hasCollision: true,
        collidingWith: collidingWith,
        newItemName: item.model.displayName
      });
    }
  } else {
    hideCollisionWarning();
  }
};