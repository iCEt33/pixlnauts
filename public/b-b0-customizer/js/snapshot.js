// Snapshot functionality using model-viewer
// Shoots the current B-b0 from fixed base-model framing (see scene.js).
// NOTE: output size currently follows the viewer element and the display's
// pixel ratio, so it varies by machine. Tier 2 pins it.

// Wait for the camera to ACTUALLY ARRIVE instead of guessing at a duration.
// model-viewer interpolates asymptotically toward a new cameraOrbit, so a
// fixed setTimeout is a race: a big spin takes longer to settle than a small
// one, and the picture could be taken mid-glide. This watches the realtime
// orbit and returns once it has stopped moving -- the animation is still
// there, we just stop taking the picture during it.
const waitForCameraToSettle = async (mv, timeoutMs = 3000) => {
  const readFov = () =>
    (typeof mv.getFieldOfView === 'function' ? mv.getFieldOfView() : 0);

  const started = performance.now();
  let last = mv.getCameraOrbit();
  let lastFov = readFov();
  let quiet = 0;

  while (performance.now() - started < timeoutMs) {
    await new Promise(r => requestAnimationFrame(r));
    const now = mv.getCameraOrbit();
    const fov = readFov();
    const moved =
      Math.abs(now.theta  - last.theta)  +
      Math.abs(now.phi    - last.phi)    +
      Math.abs(now.radius - last.radius) +
      Math.abs(fov - lastFov) * 0.01;
    last = now;
    lastFov = fov;
    quiet = moved < 1e-4 ? quiet + 1 : 0;
    if (quiet >= 3) return true;      // three still frames = it has arrived
  }
  return false;                       // timed out -- take the shot anyway
};

const takeHighResSnapshot = async () => {
  if (!modelViewer || !modelViewer.src) {
    log("No model loaded to snapshot");
    alert("No model loaded!");
    return;
  }
  
  // auto-rotate, the interaction prompt and the camera are now all handled by
  // applyCaptureFraming (scene.js), shared with the mint path so the two can
  // never drift apart.
  const savedFraming = applyCaptureFraming();
  
  // jumpCameraToGoal has already put the camera exactly on its mark, so this
  // returns in a few frames. Kept as a backstop, not as the mechanism.
  await waitForCameraToSettle(modelViewer);
  
  // Show a message that snapshot is being generated
  const snapshotMessage = document.createElement('div');
  snapshotMessage.className = 'snapshot-message';
  snapshotMessage.textContent = 'Preparing high-quality snapshot...';
  document.getElementById('model-viewer').appendChild(snapshotMessage);
  
  log("Taking snapshot at base-model framing...");
  
  try {
    // Use model-viewer's built-in screenshot feature
    // idealAspect:true crops the PNG to the MODEL's proportions, so a hatted
    // robot came out narrower than a bare one and the grid looked ragged.
    // false keeps the viewer's own aspect -- same shape for every build.
    const blob = await modelViewer.toBlob({
      idealAspect: false,
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
  
  restoreViewFraming(savedFraming);
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
