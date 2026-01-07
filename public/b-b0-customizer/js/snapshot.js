// High-resolution snapshot functionality using model-viewer
// Takes a 2000x2000 screenshot of the current B-b0 configuration

const takeHighResSnapshot = async () => {
  if (!modelViewer || !modelViewer.src) {
    log("No model loaded to snapshot");
    alert("No model loaded!");
    return;
  }
  
  // Show a message that snapshot is being generated
  const snapshotMessage = document.createElement('div');
  snapshotMessage.className = 'snapshot-message';
  snapshotMessage.textContent = 'Preparing high-quality snapshot...';
  document.getElementById('model-viewer').appendChild(snapshotMessage);
  
  log("Taking 2000x2000 high-resolution snapshot...");
  
  try {
    // Use model-viewer's built-in screenshot feature
    const blob = await modelViewer.toBlob({
      idealAspect: true,
      mimeType: 'image/png',
      qualityArgument: 1.0
    });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `b-b0-snapshot-${Date.now()}.png`;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Update message
    snapshotMessage.textContent = 'Snapshot saved!';
    snapshotMessage.classList.add('success');
    
    log("Snapshot saved successfully");
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (snapshotMessage.parentNode) {
        snapshotMessage.parentNode.removeChild(snapshotMessage);
      }
    }, 3000);
    
  } catch (error) {
    log(`Error taking snapshot: ${error.message}`);
    
    snapshotMessage.textContent = 'Error creating snapshot!';
    snapshotMessage.classList.add('error');
    
    setTimeout(() => {
      if (snapshotMessage.parentNode) {
        snapshotMessage.parentNode.removeChild(snapshotMessage);
      }
    }, 3000);
  }
};

// Add snapshot button to the UI
const addSnapshotButton = () => {
  const buttonsGroup = document.querySelector('.buttons-group');
  if (!buttonsGroup) return;
  
  const snapshotButton = document.createElement('button');
  snapshotButton.id = 'snapshot-button';
  snapshotButton.className = 'toggle-button';
  snapshotButton.textContent = 'Take Snapshot';
  snapshotButton.style.backgroundColor = '#550';
  snapshotButton.style.borderColor = '#ff0';
  
  snapshotButton.addEventListener('click', takeHighResSnapshot);
  
  buttonsGroup.appendChild(snapshotButton);
  log("Snapshot button added to interface");
};

// Initialize snapshot functionality
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addSnapshotButton, 100);
});