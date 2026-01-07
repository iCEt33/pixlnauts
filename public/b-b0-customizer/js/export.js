// GLB Export functionality
// Allows users to download the current B-b0 configuration as a GLB file

const exportCurrentModel = () => {
  if (!currentGLB) {
    log("No model to export");
    alert("No model loaded to export!");
    return;
  }
  
  // Create a download link
  const link = document.createElement('a');
  link.href = currentGLB;
  link.download = `b-b0-custom-${Date.now()}.glb`;
  link.click();
  
  log("Model exported successfully");
};

// Add export button to UI
const addExportButton = () => {
  const buttonsGroup = document.querySelector('.buttons-group');
  if (!buttonsGroup) return;
  
  const exportButton = document.createElement('button');
  exportButton.id = 'export-button';
  exportButton.className = 'toggle-button';
  exportButton.textContent = 'Export GLB';
  exportButton.style.backgroundColor = '#050';
  exportButton.style.borderColor = '#0f0';
  
  exportButton.addEventListener('click', exportCurrentModel);
  
  buttonsGroup.appendChild(exportButton);
  log("Export button added");
};

// Initialize export functionality
document.addEventListener('DOMContentLoaded', () => {
  addExportButton();
});