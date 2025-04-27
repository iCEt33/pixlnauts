import React, { useState, useEffect, useRef } from 'react';

const BeeboCustomizerModal = ({ isOpen, onClose }) => {
  const [animationStage, setAnimationStage] = useState('initial');
  const [showIframe, setShowIframe] = useState(false);
  const iframeRef = useRef(null);
  const timerRef = useRef([]);
  
  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      timerRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Animation sequence management
  useEffect(() => {
    if (!isOpen) return;
    
    // Clear previous timers
    timerRef.current.forEach(timer => clearTimeout(timer));
    timerRef.current = [];
    
    // Opening sequence
    setAnimationStage('fadeIn');
    
    const timer1 = setTimeout(() => setAnimationStage('horizontalLine'), 800);
    const timer2 = setTimeout(() => setAnimationStage('verticalExpand'), 1600);
    const timer3 = setTimeout(() => {
      setAnimationStage('ready');
      setShowIframe(true);
    }, 2400);
    
    timerRef.current = [timer1, timer2, timer3];
    
    return () => {
      timerRef.current.forEach(timer => clearTimeout(timer));
    };
  }, [isOpen]);
  
  // Communicate with iframe when it's loaded
  useEffect(() => {
    if (!showIframe || !iframeRef.current) return;
    
    const handleMessage = (event) => {
      // Listen for "customizer-loaded" message from iframe
      if (event.data && event.data.type === 'customizer-loaded') {
        console.log('Customizer loaded, sending modal-mode message');
        
        // Tell the iframe to use modal mode
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'modal-mode',
              fullscreen: true
            }, '*');
          }
        }, 200);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showIframe]);
  
  // Handle close animation sequence
  const handleClose = () => {
    // Clear any existing timers
    timerRef.current.forEach(timer => clearTimeout(timer));
    timerRef.current = [];
    
    setAnimationStage('verticalCollapse');
    
    const timer1 = setTimeout(() => setAnimationStage('horizontalCollapse'), 800);
    const timer2 = setTimeout(() => setAnimationStage('fadeOut'), 1600);
    const timer3 = setTimeout(() => {
      setAnimationStage('initial');
      onClose();
    }, 2400);
    
    timerRef.current = [timer1, timer2, timer3];
  };
  
  // If not open, don't render anything
  if (animationStage === 'initial') return null;
  
  return (
    <div className={`beebo-modal-overlay ${animationStage}`}>
      <div className="beebo-modal-container">
        <div className="beebo-modal-border">
          <div className="beebo-modal-content">
            {showIframe ? (
              <>
                <div className="beebo-iframe-container">
                  <iframe
                    ref={iframeRef}
                    src="/b-b0-customizer/index.html"
                    title="B-b0 Customizer"
                    className="beebo-modal-iframe"
                    frameBorder="0"
                    allow="fullscreen"
                  />
                </div>
                <button 
                  className="beebo-modal-back" 
                  onClick={handleClose}
                >
                  RETURN TO PIXLNAUTS
                </button>
              </>
            ) : (
              <div className="beebo-modal-loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">INITIALIZING B-b0 CUSTOMIZER</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeeboCustomizerModal;