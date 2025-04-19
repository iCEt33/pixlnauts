import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// System Check Component
const SystemCheck = ({ onComplete }) => {
  const [displayedInitialInfo, setDisplayedInitialInfo] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [blinkContinue, setBlinkContinue] = useState(true);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [showInitialInfo, setShowInitialInfo] = useState(true);
  const [startMainSequence, setStartMainSequence] = useState(false);
  
  // For spinning indicator
  const spinChars = useMemo(() => ['|', '/', '-', '\\'], []);
  const [spinIndex, setSpinIndex] = useState(0);
  
  // Track which lines are completely typed
  const [lineCompletionStates, setLineCompletionStates] = useState([]);
  // Track which lines are in "processing" mode (showing spinner)
  const [lineProcessingStates, setLineProcessingStates] = useState([]);
  // Track which lines are finished and showing final status
  const [lineFinishedStates, setLineFinishedStates] = useState([]);
  
  // Added to enable skipping the initial system check
  const skipToEnd = useCallback(() => {
    if (showInitialInfo) {
      setShowInitialInfo(false);
      setStartMainSequence(true);
      setDisplayedLines([]);
    } else if (startMainSequence) {
      onComplete(); // Skip directly to the next screen
    }
  }, [showInitialInfo, startMainSequence, onComplete]);
  
  const initialSystemInfo = useMemo(() => [
    "PIXL-OS v2.5.7 - Environmental Monitoring System",
    "Copyright (C) 2021-2025, PIXLNAUTS Foundation",
    "--------------------------------------------",
    "CPU Type    : PIXL-CORE 1024 @ 3800 MHz",
    "Memory      : 8192 MB OK",
    "Storage     : 1024 TB OK",
    "\u00A0", // Non-breaking space for empty line
    "Boot Sequence Initialized - Application v0.0.1",
    "Copyright (C) 2025 PIXLNAUTS",
    "   Detecting Core Components",
    "   Initializing Plant Monitoring Modules",
    "   Activating Environmental Sensors OK",
    "\u00A0", // Non-breaking space for empty line
    "PIXL Device Detection...",
    "\u00A0", // Non-breaking space for empty line
    "Zone    ID      Status      Class",
    "--------------------------------------------",
    "1       PL01    Active      PX512",
    "1       PL02    Active      PX512",
    "2       TR01    Active      PX350",
    "2       TR02    Active      PX350",
    "3       FL01    Standby     PX128",
    "0       SYS     Master      PX999"
  ], []);
  
  // Modified system check messages with just processing indicators
  const systemLines = useMemo(() => [
    { text: "INITIALIZING PIXLNAUTS SYSTEM v0.0.1", processing: false, status: "" },
    { text: "CHECKING MEMORY ALLOCATION", processing: true, status: "[OK]" },
    { text: "LOADING CORE MODULES", processing: true, status: "[OK]" },
    { text: "ESTABLISHING CONNECTIONS", processing: true, status: "[OK]" },
    { text: "CALIBRATING DISPLAY PARAMETERS", processing: true, status: "[OK]" },
    { text: "OPTIMIZING PERFORMANCE METRICS", processing: true, status: "[OK]" },
    { text: "VERIFYING PIXEL INTEGRITY", processing: true, status: "[OK]" },
    { text: "SCANNING FOR UPDATES", processing: true, status: "[COMPLETE]" }
  ], []);
  
  const secondSetLines = useMemo(() => [
    { text: "ALMOST", processing: true, status: "[THERE]" },
    { text: "INITIALIZING DATABASE CONNECTIONS", processing: true, status: "[OK]" },
    { text: "ALL SYSTEMS NOMINAL. LAUNCHING INTERFACE", processing: false, status: "" }
  ], []);
    
  const [lines, setLines] = useState(systemLines);
  const [displayedLines, setDisplayedLines] = useState([]);
  
  // Initialize state arrays for tracking line status
  useEffect(() => {
    if (startMainSequence && lines.length > 0) {
      setLineCompletionStates(Array(lines.length).fill(false));
      setLineProcessingStates(Array(lines.length).fill(false));
      setLineFinishedStates(Array(lines.length).fill(false));
    }
  }, [startMainSequence, lines.length]);
  
  // Animate the spinning indicator
  useEffect(() => {
    if (!startMainSequence) return;
    
    const spinTimer = setInterval(() => {
      setSpinIndex((prev) => (prev + 1) % spinChars.length);
    }, 150);
    
    return () => clearInterval(spinTimer);
  }, [startMainSequence, spinChars]);
  
  useEffect(() => {
    if (!showInitialInfo) return;
    
    // Reset previous state and clear any previous content
    setDisplayedInitialInfo([]);
    
    // Start with a clean slate
    let mounted = true;
    
    // Show the header (first 3 lines) immediately
    setDisplayedInitialInfo([
      initialSystemInfo[0],
      initialSystemInfo[1],
      initialSystemInfo[2]
    ]);
    
    // Start after a delay to ensure header is displayed
    setTimeout(() => {
      if (!mounted) return;
      
      // Current line index (start after header)
      let lineIndex = 3;
      
      // Function to display the next line
      const displayNextLine = () => {
        if (!mounted) return;
        
        if (lineIndex < initialSystemInfo.length) {
          // Add the current line to display
          setDisplayedInitialInfo(prevLines => [...prevLines, initialSystemInfo[lineIndex]]);
          
          // Move to next line
          lineIndex++;
          
          // Schedule next line display
          setTimeout(displayNextLine, 100);
        } else {
          // All lines displayed, proceed to next phase
          setTimeout(() => {
            if (!mounted) return;
            setShowInitialInfo(false);
            setStartMainSequence(true);
            setDisplayedLines([]);
          }, 1000);
        }
      };
      
      // Start displaying lines
      displayNextLine();
    }, 500);
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [showInitialInfo, initialSystemInfo]);
  
  // Handle keyboard/mouse input to continue or skip
  useEffect(() => {
    const handleInput = (e) => {
      // If waiting for specific input to continue
      if (waitingForInput) {
        setWaitingForInput(false);
        setShowContinue(false);
        setCurrentLine(0);
        setCurrentChar(0);
        setLines(secondSetLines);
        setDisplayedLines([]);
        setLineCompletionStates(Array(secondSetLines.length).fill(false));
        setLineProcessingStates(Array(secondSetLines.length).fill(false));
        setLineFinishedStates(Array(secondSetLines.length).fill(false));
      } else {
        // Allow skipping with any key or click
        if (e.key === 'Escape' || e.key === ' ' || e.type === 'click') {
          skipToEnd();
        }
      }
    };
    
    window.addEventListener('keydown', handleInput);
    window.addEventListener('click', handleInput);
    
    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('click', handleInput);
    };
  }, [waitingForInput, secondSetLines, skipToEnd]);
  
  // Main typewriter effect
  useEffect(() => {
    if (!startMainSequence || !lines.length) return;
    
    if (currentLine < lines.length) {
      // First, check if this line is already being processed or completed
      if (lineCompletionStates[currentLine]) return;
      
      // Type out the current line character by character
      const typeTimer = setTimeout(() => {
        if (currentChar < lines[currentLine].text.length) {
          setCurrentChar(prevChar => prevChar + 1);
          
          setDisplayedLines(prev => {
            const newLines = [...prev];
            while (newLines.length <= currentLine) newLines.push('');
            newLines[currentLine] = lines[currentLine].text.substring(0, currentChar + 1);
            return newLines;
          });
        } else {
          // Mark this line as completely typed
          setLineCompletionStates(prev => {
            const newStates = [...prev];
            newStates[currentLine] = true;
            return newStates;
          });
          
          // If this line should show processing animation
          if (lines[currentLine].processing) {
            // Start processing animation for this line
            setLineProcessingStates(prev => {
              const newStates = [...prev];
              newStates[currentLine] = true;
              return newStates;
            });
            
            // After a random delay, finish this line and move to the next
            const processingTime = Math.random() * 1000 + 350;
            setTimeout(() => {
              // Mark processing as done
              setLineProcessingStates(prev => {
                const newStates = [...prev];
                newStates[currentLine] = false;
                return newStates;
              });
              
              // Mark as finished with final status
              setLineFinishedStates(prev => {
                const newStates = [...prev];
                newStates[currentLine] = true;
                return newStates;
              });
              
              // Move to next line or finish sequence
              setTimeout(() => {
                // Reset for next line
                setCurrentChar(0);
                
                // Check for completion
                if (currentLine === lines.length - 1) {
                  if (lines === systemLines) {
                    setTimeout(() => {
                      setWaitingForInput(true);
                      setShowContinue(true);
                    }, 1000);
                  } else {
                    setTimeout(() => {
                      onComplete();
                    }, 1000);
                  }
                } else {
                  // Move to next line
                  setCurrentLine(prev => prev + 1);
                }
              }, 300);
            }, processingTime);
          } else {
            // For lines without processing, just mark as finished and move on
            setLineFinishedStates(prev => {
              const newStates = [...prev];
              newStates[currentLine] = true;
              return newStates;
            });
            
            // Move to next line after a short delay
            setTimeout(() => {
              setCurrentChar(0);
              
              // Check for completion
              if (currentLine === lines.length - 1) {
                if (lines === systemLines) {
                  setTimeout(() => {
                    setWaitingForInput(true);
                    setShowContinue(true);
                  }, 1000);
                } else {
                  setTimeout(() => {
                    onComplete();
                  }, 1000);
                }
              } else {
                // Move to next line
                setCurrentLine(prev => prev + 1);
              }
            }, 500);
          }
        }
      }, Math.random() * 10 + 5); // Random typing speed
      
      return () => clearTimeout(typeTimer);
    }
  }, [currentLine, currentChar, lines, onComplete, startMainSequence, systemLines, spinChars, lineCompletionStates]);
  
  // Blinking "Press any key to continue" effect
  useEffect(() => {
    if (!showContinue) return;
    
    const blinkTimer = setInterval(() => {
      setBlinkContinue(prev => !prev);
    }, 500);
    
    return () => clearInterval(blinkTimer);
  }, [showContinue]);
  
  return (
    <div className="system-check">
      <div className="terminal">
        {showInitialInfo ? (
          // For initial info, use the dedicated state variable
          displayedInitialInfo.map((line, index) => (
            <div key={`initial-${index}`} className="terminal-line">
              <span className="pre-formatted">{line}</span>
            </div>
          ))
        ) : (
          // For main sequence lines with animated status
          displayedLines.map((line, index) => (
            <div key={`main-${index}`} className="terminal-line">
              <span className="terminal-prompt">&gt;</span> {line}
              
              {/* Show spinning indicator for lines in processing state */}
              {lineProcessingStates[index] && (
                <span className="spinning-status">{spinChars[spinIndex]}</span>
              )}
              
              {/* Show final status for completed lines */}
              {lineFinishedStates[index] && lines[index]?.status && (
                <span className="status-text">{lines[index].status}</span>
              )}
            </div>
          ))
        )}
        {showContinue && blinkContinue && (
          <div className="continue-prompt">PRESS ANY KEY TO CONTINUE...</div>
        )}
        {showContinue && !blinkContinue && (
          <div className="continue-prompt-empty">&nbsp;</div>
        )}
        <div className="skip-prompt"></div>
      </div>
    </div>
  );
};

// Component for the text scrambling animation
const ScrambleText = ({ text, speed = 50, finalDelay = 1000, intensity = 1.0, color }) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Different character sets for more variety
  const primaryChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/';
  const pixelChars = '■□▢▣▤▥▦▧▨▩▪▫▬▲△▴▵▸▹►▻▼▾▿◂◃◄◅◆◇◈◉◊○●◌●◙◚◛◦◬◭◮◰◱◲◳◴◵◶◷';
  
  // Clean up text by trimming and preventing null
  const cleanText = text?.trim() || '';
  
  // Memoize the character selection function
  const getRandomChar = useCallback(() => {
    const r = Math.random();
    if (r < 0.6) return primaryChars.charAt(Math.floor(Math.random() * primaryChars.length));
    if (r < 0.8) return symbolChars.charAt(Math.floor(Math.random() * symbolChars.length));
    return pixelChars.charAt(Math.floor(Math.random() * pixelChars.length));
  }, []);

  useEffect(() => {
    if (!cleanText) return;
    
    let textArray = Array(cleanText.length).fill('');
    let completedIndices = new Set();
    // Removed unused 'iteration' variable
    let startTime = Date.now();
    let duration = cleanText.length * speed * 2; // Total animation duration
    
    // Initial fill with random characters
    for (let i = 0; i < cleanText.length; i++) {
      if (cleanText[i] === ' ') {
        textArray[i] = ' ';
        completedIndices.add(i);
      } else {
        textArray[i] = getRandomChar();
      }
    }
    setDisplayText(textArray.join(''));
    
    const interval = setInterval(() => {
      // Calculate progress for transition effects
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(1, elapsed / duration);
      setProgress(newProgress);
      
      // If all characters are complete, clear interval
      if (completedIndices.size === cleanText.length) {
        clearInterval(interval);
        setTimeout(() => setIsComplete(true), finalDelay);
        return;
      }
      
      // Pick a random index to update if not already complete
      let availableIndices = Array.from(Array(cleanText.length).keys())
        .filter(index => !completedIndices.has(index) && cleanText[index] !== ' ');
        
      if (availableIndices.length === 0) return;
      
      // Determine how many characters to update this iteration (increases over time)
      const charsToUpdate = Math.max(1, Math.floor(availableIndices.length * (newProgress * 0.3)));
      
      // Update multiple characters per iteration
      for (let i = 0; i < charsToUpdate; i++) {
        if (availableIndices.length === 0) break;
        
        const randomIdx = Math.floor(Math.random() * availableIndices.length);
        const randomIndex = availableIndices[randomIdx];
        availableIndices.splice(randomIdx, 1);
        
        // After certain progress threshold, start finalizing characters
        if (newProgress > 0.4 && Math.random() < 0.3 * newProgress * intensity) {
          textArray[randomIndex] = cleanText[randomIndex];
          completedIndices.add(randomIndex);
        } else {
          // Otherwise show random character with increasing probability of matching final char
          const matchProb = newProgress * 0.5;
          if (Math.random() < matchProb) {
            textArray[randomIndex] = cleanText[randomIndex];
          } else {
            textArray[randomIndex] = getRandomChar();
          }
        }
      }
      
      setDisplayText(textArray.join(''));
    }, speed);

    return () => clearInterval(interval);
  }, [cleanText, speed, finalDelay, getRandomChar, intensity]);

  // If text is empty, don't render anything
  if (!cleanText) return null;

  return (
    <span 
      className={`scramble-text ${isComplete ? 'completed' : ''}`} 
      style={{
        filter: isComplete ? 'none' : `blur(${(1 - progress) * 0.5}px)`,
        opacity: 0.5 + progress * 0.5,
        color: color // Use custom color if provided
      }}
    >
      {displayText || cleanText}
    </span>
  );
};

// Loading animation component
const LoadingAnimation = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  
  // Add option to skip loading animation
  const skipLoading = useCallback(() => {
    onComplete();
  }, [onComplete]);
  
  useEffect(() => {
    // Handle key presses and clicks to skip
    const handleSkip = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.type === 'click') {
        skipLoading();
      }
    };
    
    window.addEventListener('keydown', handleSkip);
    window.addEventListener('click', handleSkip);
    
    return () => {
      window.removeEventListener('keydown', handleSkip);
      window.removeEventListener('click', handleSkip);
    };
  }, [skipLoading]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 500);
          return 100;
        }
        return prev + Math.floor(Math.random() * 5) + 1;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [onComplete]);
  
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <ScrambleText text="PIXLNAUTS" speed={20} intensity={2.0} />
      </div>
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="loading-text">
        <ScrambleText text={`LOADING: ${progress}%`} speed={10} />
      </div>
      <div className="skip-prompt"></div>
    </div>
  );
};

// Updated Logo component with toggle functionality
const Logo = () => {
  const [showText, setShowText] = useState(false); // Initially show the image
  const [scrambleKey, setScrambleKey] = useState(0); // To trigger scramble effect on each toggle
  
  const toggleLogoDisplay = () => {
    if (!showText) {
      // When switching to text, increment scramble key to restart animation
      setScrambleKey(prev => prev + 1);
    }
    setShowText(!showText);
  };
  
  return (
    <div className="logo-container">
      <div className="logo-toggle-area" onClick={toggleLogoDisplay}>
        {/* Text logo with scramble effect - initially hidden */}
        <div className={`logo ${showText ? 'visible' : 'hidden'}`}>
          <ScrambleText 
            text="PIXLNAUTS" 
            speed={30} 
            intensity={1.5}
            key={`scramble-${scrambleKey}`} // Key changes force remount and restart animation
          />
        </div>
        
        {/* Image logo - initially visible */}
        <div className={`logo-image ${showText ? 'hidden' : 'visible'}`}>
          <img src="/images/pixlnauts-logo.png" alt="PIXLNAUTS Logo" className="png-logo" />
        </div>
      </div>
    </div>
  );
};

// Tab component with auto-scroll functionality
const Tab = ({ title, children, isOpen, toggleTab }) => {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const tabRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
      
      // Add auto-scroll functionality
      // Use setTimeout to allow the height transition to start
      setTimeout(() => {
        if (tabRef.current) {
          const tabPosition = tabRef.current.getBoundingClientRect();
          const isPartiallyVisible = 
            tabPosition.bottom > 0 && 
            tabPosition.top < window.innerHeight;
          
          if (!isPartiallyVisible || tabPosition.bottom > window.innerHeight) {
            // If tab is not fully visible in viewport, scroll it into view
            tabRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (tabPosition.bottom + contentRef.current.scrollHeight > window.innerHeight) {
            // If content will extend beyond viewport, scroll to show as much as possible
            window.scrollBy({
              top: Math.min(
                contentRef.current.scrollHeight,
                tabPosition.bottom + contentRef.current.scrollHeight - window.innerHeight
              ),
              behavior: 'smooth'
            });
          }
        }
      }, 50); // Small delay to allow for DOM updates
    } else {
      setHeight(0);
    }
  }, [isOpen]);
  
  return (
    <div className={`tab ${isOpen ? 'open' : 'closed'}`} ref={tabRef}>
      <div className="tab-header" onClick={toggleTab}>
        <div className={`play-icon ${isOpen ? 'playing' : ''}`}>▶</div>
        <ScrambleText text={title} speed={30} intensity={0.8} />
      </div>
      <div 
        className="tab-content-wrapper" 
        style={{ height: `${height}px` }}
      >
        <div className="tab-content" ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Introduction tab content
const IntroductionTab = () => {
  return (
    <div className="introduction">
      <div className="video-container">
        <iframe 
          width="100%" 
          height="315" 
          src="https://www.youtube.com/embed/KSz8VG1Tzm0" 
          title="Pixelnauts Introduction Video"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
      <p>
        <ScrambleText 
          text="Welcome to PIXLNAUTS, an innovative non-profit environmental project that uses blockchain technology to drive positive change." 
          speed={10} 
        />
      </p>
      <p>
        <ScrambleText 
          text="Check out our whitepaper for more details on our vision and roadmap." 
          speed={10} 
        />
      </p>
      <div className="whitepaper-link">
        <a href="https://pixelnauts.gitbook.io/pixel-cryptonauts-whitepaper" target="_blank" rel="noopener noreferrer" className="pixel-button">
          {/* Using direct span with black color, not using ScrambleText for button text */}
          <span className="whitepaper-button-text">READ WHITEPAPER</span>
        </a>
      </div>
    </div>
  );
};

// Socials tab content
const SocialsTab = () => {
  return (
    <div className="socials">
      <p>
        <ScrambleText 
          text="Join our community! Follow PIXLNAUTS on social media to stay up to date with our environmental initiatives." 
          speed={10} 
        />
      </p>
      <div className="social-links">
        <a href="https://discord.gg/W73cvPDcgK" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">DISCORD</span>
        </a>
        <a href="https://twitter.com/PixlCryptonauts" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">TWITTER</span>
        </a>
        <a href="https://t.me/projectcosmos" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">TELEGRAM</span>
        </a>
      </div>
    </div>
  );
};

// Games tab content
const GamesTab = () => {
  return (
    <div className="games">
      <p>
        <ScrambleText 
          text="Try our concept beta games! Experience these exciting PIXLNAUTS titles:" 
          speed={10} 
        />
      </p>
      <div className="games-links">
        <a href="https://icet33.itch.io/project-cosmos" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">PROJECT: COSMOS - SPACESHIP SHOOTER</span>
        </a>
        <a href="https://icet33.itch.io/pixelnaut" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">PIXELNAUT AIM TRAINER</span>
        </a>
      </div>
    </div>
  );
};

// B-b0 Customizer tab content
const BeeboCustomizerTab = () => {
  return (
    <div className="beebo-customizer">
      <p>
        <ScrambleText 
          text="Coming soon! In the meantime, you can:" 
          speed={10} 
        />
      </p>
      <div className="beebo-links">
        <a href="https://discord.com/oauth2/authorize?client_id=1284849644345626664" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">INVITE BEEBO TO YOUR DISCORD SERVER! :O</span>
        </a>
      </div>
    </div>
  );
};

// Support Us tab content
const SupportUsTab = () => {
  return (
    <div className="support-us">
      <p>
        <ScrambleText 
          text="Support PIXLNAUTS environmental initiatives through these platforms:" 
          speed={10} 
        />
      </p>
      <div className="support-links">
        <a href="https://teamtrees.org/search?q=project%20cosmos" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">TEAM TREES</span>
        </a>
        <a href="https://teamseas.org/search-donors/?team_name=Project%20Cosmos" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">TEAM SEAS</span>
        </a>
        <a href="https://paypal.me/pixelcryptonauts" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">PAYPAL</span>
        </a>
        <a href="http://www.patreon.com/pixelcryptonauts" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">PATREON</span>
        </a>
      </div>
    </div>
  );
};

// The Quirkiest App tab content
const QuirkiestAppTab = () => {
  return (
    <div className="quirkiest-app">
      <div className="app-description">
        <p>Need a reliable way to track your thoughts, schedule reminders, and stay in sync across global time zones?</p>
        <p>Want precise, up-to-the-minute lunar phase information at your fingertips?</p>
        <p>Introducing our all-in-one Smart Clock app for Android – your digital companion that combines elegant time management with powerful productivity tools.</p>
        <p>Stay organized, connected, and informed with our pixel-perfect interface.</p>
        <p>Download now and transform how you experience time!</p>
      </div>
      <div className="app-download">
        <a href="/downloads/smartclockbeta.apk" download className="pixel-button">
          <span className="whitepaper-button-text">DOWNLOAD APK</span>
        </a>
      </div>
    </div>
  );
};

// TabsManager to control which tab is open
const TabsManager = () => {
  const [openTab, setOpenTab] = useState(0);
  
  const toggleTab = (index) => {
    if (openTab === index) {
      setOpenTab(null);
    } else {
      setOpenTab(index);
    }
  };
  
  return (
    <div className="tabs-container">
      <Tab 
        title="INTRODUCTION" 
        isOpen={openTab === 0} 
        toggleTab={() => toggleTab(0)}
      >
        <IntroductionTab />
      </Tab>
      <Tab 
        title="SOCIALS" 
        isOpen={openTab === 1} 
        toggleTab={() => toggleTab(1)}
      >
        <SocialsTab />
      </Tab>
      <Tab 
        title="GAMES" 
        isOpen={openTab === 2} 
        toggleTab={() => toggleTab(2)}
      >
        <GamesTab />
      </Tab>
      <Tab 
        title="B-b0 CUSTOMIZER" 
        isOpen={openTab === 3} 
        toggleTab={() => toggleTab(3)}
      >
        <BeeboCustomizerTab />
      </Tab>
      <Tab 
        title="THE QUIRKIEST USELESS APP" 
        isOpen={openTab === 4} 
        toggleTab={() => toggleTab(4)}
      >
        <QuirkiestAppTab />
      </Tab>
      <Tab 
        title="SUPPORT US" 
        isOpen={openTab === 5} 
        toggleTab={() => toggleTab(5)}
      >
        <SupportUsTab />
      </Tab>
    </div>
  );
};

// Footer component
const Footer = () => {
  return (
    <div className="footer">
      <div className="footer-logo">
        <img src="/images/logo.png" alt="PIXLNAUTS Secondary Logo" className="secondary-logo" />
      </div>
      <div className="authentication-text">
        <ScrambleText 
          text="This is the one and only authentic website of PIXLNAUTS project" 
          speed={20}
          intensity={1.0}
        />
      </div>
      <div className="secret-message">
        <ScrambleText 
          text="If you found the loading screens to be too long, they are completely skippable. Just press any button it doesn't matter. I just wanted you to experience it at least one time before letting you know this :D" 
          speed={200}
          intensity={0.5}
        />
      </div>
    </div>
  );
};

// Main component
const App = () => {
  const [currentState, setCurrentState] = useState('systemCheck'); // systemCheck, loading, content
  const [tabsVisible] = useState(true); // Removed the setter since it's not used
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    // Transition from loading to content
    if (currentState === 'content' && !showContent) {
      setTimeout(() => {
        setShowContent(true);
      }, 300);
    }
  }, [currentState, showContent]);
  
  const handleSystemCheckComplete = () => {
    setCurrentState('loading');
  };
  
  const handleLoadingComplete = () => {
    setCurrentState('content');
  };
  
  if (currentState === 'systemCheck') {
    return <SystemCheck onComplete={handleSystemCheckComplete} />;
  }
  
  if (currentState === 'loading') {
    return <LoadingAnimation onComplete={handleLoadingComplete} />;
  }
  
  return (
    <div className={`pixlnauts-app ${showContent ? 'show' : 'hide'}`}>
      <Logo />
      <div className={`tabs-section ${tabsVisible ? 'open' : 'closed'}`}>
        <TabsManager />
      </div>
      <Footer />
    </div>
  );
};

// CSS for the whole application
const styles = `
  @font-face {
    font-family: 'PixelFont';
    /* We'd load the custom font here */
    font-display: swap;
  }

  * {
    box-sizing: border-box;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  /* Add smooth scrolling to the entire page */
  html {
    scroll-behavior: smooth;
  }

  body {
    background-color: #000;
    color: #0f0;
    font-family: 'PixelFont', monospace;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    line-height: 1.4;
    font-smooth: never;
    -webkit-font-smoothing: none;
  }
  
  /* System Check Terminal Styling */
  .system-check {
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000;
  }
  
  .terminal {
    width: 90%;
    max-width: 700px;
    height: 80vh;
    background-color: #000;
    border: 2px solid #0f0;
    padding: 20px;
    overflow: hidden;
    font-family: monospace;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  }
  
  .pre-formatted {
    white-space: pre;
    font-family: monospace;
  } 

  .terminal-line {
    color: #0f0;
    margin-bottom: 10px;
    white-space: pre-wrap; /* CHANGED: From 'pre' to 'pre-wrap' to allow wrapping */
    word-break: break-word; /* ADDED: Ensures words break properly */
    overflow-wrap: break-word; /* ADDED: Additional word wrapping support */
    max-width: 100%; /* ADDED: Ensure content fits within container */
    font-size: 16px;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
    font-family: monospace;
    display: block; /* Ensure block display for proper line breaks */
    min-height: 1.2em; /* Minimum height to ensure empty lines render */
    position: relative; /* For positioning the status */
  }
  
  .terminal-prompt {
    color: #0f0;
    margin-right: 10px;
  }
  
  .continue-prompt, .continue-prompt-empty, .skip-prompt {
    margin-top: 30px;
    color: #0f0;
    text-align: center;
    font-size: 18px;
    text-shadow: 0 0 8px rgba(0, 255, 0, 0.7);
  }
  
  .skip-prompt {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    font-size: 14px;
    opacity: 0.7;
  }

  .pixlnauts-app {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px 20px 20px; /* Increased top padding */
    position: relative; /* Added for absolute positioning of logo */
  }

  /* Logo container and toggle styling */
  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 50px;
    position: relative;
    width: 100%;
  }

  .logo-toggle-area {
    position: relative;
    min-height: 120px; /* Set minimum height to prevent layout shift */
    min-width: 300px; /* Ensure sufficient width */
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .logo, .logo-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: opacity 0.5s ease;
  }

  .logo {
    font-size: 64px;
    letter-spacing: 4px;
    text-align: center;
    padding: 15px 30px;
    border: 4px solid #444;
    background-color: #000;
    box-shadow: 0 0 0 2px #000;
    z-index: 1;
  }

  .logo-image {
    z-index: 2;
  }

  .visible {
    opacity: 1;
    visibility: visible;
  }

  .hidden {
    opacity: 0;
    visibility: hidden;
  }

  .png-logo {
    max-width: 180px;
    max-height: 180px;
    image-rendering: pixelated;
  }

  .tabs-container {
    margin-bottom: 20px;
  }

  .tab {
    margin-bottom: 15px;
    scroll-margin-top: 20px; /* Add scroll margin for better positioning when scrolled into view */
  }

  .tab-header {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    background-color: #111;
    border: 4px solid #555;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px #000;
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
    font-size: 24px; /* Doubled from default of 12px */
  }

  .tab-header:hover {
    border-color: #666;
    background-color: #151515;
  }
  
  .tab.open .tab-header {
    border-color: #0f0;
  }

  .play-icon {
    color: #0f0;
    margin-right: 15px;
    font-size: 24px; /* Increased to match the larger tab header text */
    transition: transform 0.3s ease, color 0.2s ease;
  }
  
  .play-icon.playing {
    transform: rotate(90deg);
    color: #5f5;
  }
  
  .tab-content-wrapper {
    overflow: hidden;
    transition: height 0.3s ease-in-out;
    background-color: #111;
    border-left: 4px solid #555;
    border-right: 4px solid #555;
    border-bottom: 4px solid #555;
  }
  
  .tab.open .tab-content-wrapper {
    border-color: #0f0;
  }

  .tab-content {
    padding: 20px;
    background-color: #111;
  }

  .whitepaper-button-text {
    color: #000;
    font-family: 'PixelFont', monospace;
    font-weight: bold;
    font-size: 18px;
    letter-spacing: 1px;
  }

  .pixel-button {
    display: inline-block;
    padding: 15px 30px;
    background-color: #0f0;
    text-decoration: none;
    border: none;
    cursor: pointer;
    text-align: center;
    position: relative;
    transition: all 0.2s ease;
    box-shadow: 4px 4px 0 #086;
    image-rendering: pixelated;
    clip-path: polygon(
      0 0, 
      100% 0, 
      100% calc(100% - 4px), 
      calc(100% - 4px) 100%, 
      0 100%
    );
  }

  .spinning-status {
    display: inline-block;
    color: #ff0;
    font-weight: bold;
    margin-left: 10px;
    animation: pulse 1s infinite;
    min-width: 15px;
    text-align: center;
  }

  .status-text {
    display: inline-block;
    color: #0f0;
    font-weight: bold;
    margin-left: 10px;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
    animation: statusAppear 0.5s ease-in;
  }

  @keyframes pulse {
    0% { opacity: 0.5; text-shadow: 0 0 5px rgba(255, 255, 0, 0.3); }
    50% { opacity: 1; text-shadow: 0 0 10px rgba(255, 255, 0, 0.7); }
    100% { opacity: 0.5; text-shadow: 0 0 5px rgba(255, 255, 0, 0.3); }
  }

  @keyframes statusAppear {
    from { opacity: 0; transform: translateX(-5px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .pixel-button:hover {
    background-color: #0c0;
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #086;
  }

  .pixel-button:active {
    transform: translate(4px, 4px);
    box-shadow: none;
  }

  .scramble-text {
    transition: color 0.3s ease;
    letter-spacing: 1px;
  }

  .scramble-text.completed {
    color: #0f0;
    text-shadow: 0 0 5px #0f05;
  }

  .introduction p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .whitepaper-link {
    text-align: center;
    margin-top: 30px;
  }

  /* Loading screen */
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100%;
    background-color: #000;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
  }
  
  .loading-logo {
    font-size: 36px;
    letter-spacing: 3px;
    margin-bottom: 30px;
    text-shadow: 0 0 10px #0f0;
  }
  
  .progress-container {
    width: 80%;
    max-width: 400px;
    height: 20px;
    background-color: #111;
    border: 2px solid #0f0;
    margin-bottom: 15px;
    position: relative;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background-color: #0f0;
    transition: width 0.2s ease;
    box-shadow: 0 0 10px #0f0;
  }
  
  .loading-text {
    font-size: 14px;
    color: #0f0;
    text-shadow: 0 0 5px #0f0;
    margin-bottom: 30px;
  }
  
  .loading-screen .skip-prompt {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 14px;
    opacity: 0.7;
  }
  
  /* App show/hide animations */
  .pixlnauts-app {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  
  .pixlnauts-app.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Tabs section animations */
  .tabs-section {
    max-height: 2000px;
    overflow: hidden;
    transition: max-height 0.5s ease-in-out;
  }
  
  .tabs-section.closed {
    max-height: 0;
  }
  
  .socials p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
    margin-bottom: 30px;
    border: 4px solid #0f0;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    overflow: hidden;
  }

  .video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .social-links {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }

  .beebo-customizer p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .beebo-links {
    display: flex;
    justify-content: center;
    margin-top: 30px;
  }

  .support-us p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .support-links {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }

  .games p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .games-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }
  
  /* Quirkiest App tab styles */
  .quirkiest-app p {
    line-height: 1.6;
    margin-bottom: 15px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
    color: #0f0;
  }
  
  .app-description {
    margin-bottom: 20px;
  }
  
  .app-download {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 30px;
  }
  
  .app-download .pixel-button {
    position: relative;
    overflow: hidden;
  }
  
  .app-download .pixel-button::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg, 
      rgba(0, 255, 0, 0) 0%,
      rgba(0, 255, 0, 0.2) 50%,
      rgba(0, 255, 0, 0) 100%
    );
    animation: shimmer 3s infinite linear;
    z-index: 1;
    pointer-events: none;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
  
  /* Footer styles */
  .footer {
    margin-top: 80px;
    padding-top: 40px;
    border-top: 4px solid #0f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .footer-logo {
    margin-bottom: 20px;
  }
  
  .secondary-logo {
    max-width: 240px;
    max-height: 240px;
    image-rendering: pixelated;
    filter: drop-shadow(0 0 8px rgba(0, 255, 0, 0.5));
  }
  
  .authentication-text {
    font-size: 18px;
    text-align: center;
    color: #0f0;
    padding: 10px 20px;
    border: 2px solid #0f0;
    background-color: rgba(0, 20, 0, 0.3);
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
    margin-bottom: 30px;
  }

  @media (max-width: 600px) {
    .social-links {
      flex-direction: column;
      width: 100%;
    }
    
    .social-links .pixel-button {
      width: 80%;
    }
    
    .beebo-links {
      width: 100%;
    }
    
    .beebo-links .pixel-button {
      width: 80%;
    }

    .games-links {
      width: 100%;
    }
    
    .games-links .pixel-button {
      width: 80%;
    }

    .support-links {
      flex-direction: column;
      width: 100%;
    }
    
    .support-links .pixel-button {
      width: 80%;
    }
    
    .video-container {
      margin-bottom: 20px;
      border-width: 2px;
    }
    
    .pixlnauts-app {
      padding: 20px 10px 10px 10px;
    }
    
    .logo {
      font-size: 40px; /* Smaller on mobile but still readable */
      padding: 10px 15px;
    }
    
    .logo-toggle-area {
      min-height: 100px;
    }
    
    .png-logo {
      max-width: 120px;
      max-height: 120px;
    }
    
    .tab-header, .tab-content {
      padding: 12px;
    }
    
    .introduction p {
      font-size: 14px;
    }
    
    .loading-logo {
      font-size: 28px;
    }
    
    .terminal {
      width: 95%;
      height: 90vh;
      padding: 10px 8px; /* CHANGED: Adjusted padding for mobile */
      font-size: 12px; /* ADDED: Smaller font size on mobile */
    }
    
    .terminal-line {
      font-size: 12px; /* CHANGED: Smaller font on mobile */
      margin-bottom: 8px; /* ADDED: Slightly reduced margin */
    }
    
    /* ADDED: Better mobile status indicators */
    .spinning-status, .status-text {
      margin-left: 5px;
    }
    
    /* ADDED: Better spacing for continue prompt */
    .continue-prompt, .continue-prompt-empty {
      margin-top: 20px;
      font-size: 14px;
    }
    
    /* Mobile quirkiest app styles */
    .quirkiest-app p {
      font-size: 14px;
    }
    
    .app-download .pixel-button {
      width: 80%;
    }
    
    /* Mobile footer styles */
    .footer {
      margin-top: 50px;
      padding-top: 30px;
    }
    
    .secondary-logo {
      max-width: 200px;
      max-height: 200px;
    }
    
    .authentication-text {
      font-size: 14px;
      padding: 8px 16px;
    }
    
    /* Improve tab transition on mobile */
    .tab-content-wrapper {
      transition: height 0.4s ease-in-out;
    }
    
    /* Add some extra space at the bottom of tab content on mobile */
    .tab-content {
      padding-bottom: 20px;
    }
  }
`;

// Add the styles to the document
const StyleSheet = () => {
  return <style>{styles}</style>;
};

// Wrap everything together
const PixlnautsWebsite = () => {
  return (
    <>
      <StyleSheet />
      <App />
    </>
  );
};

export default PixlnautsWebsite;