/* global BigInt */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const isMobileDevice = () => {
  return (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

// SystemCheck Component with Fast Initial Boot
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
  
  // MODIFIED: Fast boot sequence for first screen (systemLines)
  useEffect(() => {
    if (!startMainSequence || !lines.length || lines !== systemLines) return;
    
    let mounted = true;
    
    // Function to type out a single line with its own timer
    const typeOutLine = (lineIndex, delay) => {
      if (!mounted) return;
      
      let lineText = lines[lineIndex].text;
      let currentTypedChars = 0;
      
      // Start displaying this line after the specified delay
      setTimeout(() => {
        if (!mounted) return;
        
        // Create an initial empty line
        setDisplayedLines(prev => {
          const newLines = [...prev];
          while (newLines.length <= lineIndex) newLines.push('');
          return newLines;
        });
        
        // Typing timer for this specific line
        const typingInterval = setInterval(() => {
          if (!mounted) {
            clearInterval(typingInterval);
            return;
          }
          
          if (currentTypedChars < lineText.length) {
            currentTypedChars++;
            
            // Update just this line in the display
            setDisplayedLines(prev => {
              const newLines = [...prev];
              newLines[lineIndex] = lineText.substring(0, currentTypedChars);
              return newLines;
            });
          } else {
            clearInterval(typingInterval);
            
            // Mark this line as fully typed
            setLineCompletionStates(prev => {
              const newStates = [...prev];
              newStates[lineIndex] = true;
              return newStates;
            });
            
            // If this line should show processing animation
            if (lines[lineIndex].processing) {
              // Start processing animation
              setLineProcessingStates(prev => {
                const newStates = [...prev];
                newStates[lineIndex] = true;
                return newStates;
              });
              
              // Show processing for a short time
              const processingTime = 300 + Math.random() * 700; // 300-1000ms
              setTimeout(() => {
                if (!mounted) return;
                
                // End processing
                setLineProcessingStates(prev => {
                  const newStates = [...prev];
                  newStates[lineIndex] = false;
                  return newStates;
                });
                
                // Show final status
                setLineFinishedStates(prev => {
                  const newStates = [...prev];
                  newStates[lineIndex] = true;
                  return newStates;
                });
                
                // If this is the last line, prepare for next phase
                if (lineIndex === lines.length - 1) {
                  setTimeout(() => {
                    if (!mounted) return;
                    setWaitingForInput(true);
                    setShowContinue(true);
                  }, 500);
                }
              }, processingTime);
            } else {
              // For lines without processing, just mark as finished
              setLineFinishedStates(prev => {
                const newStates = [...prev];
                newStates[lineIndex] = true;
                return newStates;
              });
              
              // If this is the last line, prepare for next phase
              if (lineIndex === lines.length - 1) {
                setTimeout(() => {
                  if (!mounted) return;
                  setWaitingForInput(true);
                  setShowContinue(true);
                }, 500);
              }
            }
          }
        }, Math.random() * 20 + 10); // Slightly random typing speed
      }, delay);
    };
    
    // Start typing each line with staggered delays
    // Each line starts after a fixed delay from the beginning
    lines.forEach((line, index) => {
      // First line appears immediately, subsequent lines appear with staggered delays
      const baseDelay = index * 700; // Delay between starting each new line
      typeOutLine(index, baseDelay);
    });
    
    return () => {
      mounted = false;
    };
  }, [startMainSequence, lines, systemLines]);
  
  // Original typewriter effect for second screen (not the systemLines)
  useEffect(() => {
    if (!startMainSequence || !lines.length || lines === systemLines) return;
    
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
  }, [currentLine, currentChar, lines, onComplete, startMainSequence, systemLines, lineCompletionStates]);
  
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
  const pixelChars = '■□▢▣▤▥▦▧▨▩▪▫▬▲△▴▵▸▹►▻▼▽▾▿◂◃◄◅◆◇◈◉◊○●◌●◙◚◛◦◬◭◮◰◱◲◳◴◵◶◷';
  
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

// Wallet connection component with real Web3 implementation
const WalletDonation = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [polBalance, setPolBalance] = useState('0.0000');
  const [donationAmount, setDonationAmount] = useState('0.00000');
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  const targetAddress = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';
  const POLYGON_CHAIN_ID = '0x89'; // 137 in hex
  const POLYGON_RPC = 'https://polygon-rpc.com';
  
  // Update balance function
  const updateBalance = useCallback(async (address) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      // Convert from wei to POL (18 decimals)
      const balanceInPol = parseInt(balance, 16) / Math.pow(10, 18);
      setPolBalance(balanceInPol.toFixed(4));
    } catch (error) {
      console.error('Failed to get balance:', error);
      setPolBalance('0.0000');
    }
  }, []);
  
  // Ensure Polygon network function
  const ensurePolygonNetwork = useCallback(async () => {
    try {
      // Check current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== POLYGON_CHAIN_ID) {
        try {
          // Try to switch to Polygon
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CHAIN_ID }],
          });
        } catch (switchError) {
          // If the chain isn't added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: POLYGON_CHAIN_ID,
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: {
                    name: 'POL',
                    symbol: 'POL',
                    decimals: 18,
                  },
                  rpcUrls: [POLYGON_RPC],
                  blockExplorerUrls: ['https://polygonscan.com/'],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error('Failed to switch to Polygon network:', error);
      alert('Please manually switch to Polygon network in your wallet.');
    }
  }, [POLYGON_CHAIN_ID, POLYGON_RPC]);
  
  // Removed automatic connection check - user must explicitly connect
  
  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setWalletAddress('');
      setPolBalance('0.0000');
      setDonationAmount('0.00000');
      setTxHash('');
    } else {
      setWalletAddress(accounts[0]);
      updateBalance(accounts[0]);
    }
  }, [updateBalance]);
  
  // Handle chain changes
  const handleChainChanged = useCallback((chainId) => {
    // Only reload if we're already connected and it's not switching to Polygon
    if (isConnected && chainId !== POLYGON_CHAIN_ID) {
      // Give a small delay to avoid reloading during connection process
      setTimeout(() => {
        console.log('Chain changed to non-Polygon network, reloading...');
        window.location.reload();
      }, 2000);
    }
  }, [isConnected, POLYGON_CHAIN_ID]);
  
  // Setup wallet listeners on mount
  useEffect(() => {
    // Don't automatically check connection - user must explicitly connect
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);
  
  // Connect wallet function
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          const address = accounts[0];
          setWalletAddress(address);
          await updateBalance(address);
          await ensurePolygonNetwork();
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        if (error.code === 4001) {
          alert('Please accept the connection request in your wallet.');
        } else {
          alert('Failed to connect wallet. Please try again.');
        }
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet to continue.\n\nYou can download MetaMask from: https://metamask.io');
    }
  };
  
  // Disconnect function that reloads page but skips boot sequence
  const disconnect = () => {
    // Set a flag in localStorage to skip boot sequence on reload
    localStorage.setItem('skipBootSequence', 'true');
    
    // Reload the page to fully disconnect from wallet extension
    window.location.reload();
  };
  
  // Set preset amount
  const setAmount = (amount) => {
    setDonationAmount(amount.toString());
  };
  
  // Set max amount (minus gas)
  const setMaxAmount = () => {
    const maxAmount = Math.max(0, parseFloat(polBalance) - 0.01);
    setDonationAmount(maxAmount.toFixed(5));
  };
  
  // Handle donation transaction
  const handleDonate = async () => {
    if (!isConnected || parseFloat(donationAmount) <= 0) return;
    
    setIsTransacting(true);
    setTxHash('');
    
    try {
      // Ensure we're on Polygon network
      await ensurePolygonNetwork();
      
      // Convert amount to wei (18 decimals)
      const amountInWei = '0x' + (parseFloat(donationAmount) * Math.pow(10, 18)).toString(16).split('.')[0];
      
      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: targetAddress,
            value: amountInWei,
            gas: '0x5208', // 21000 gas limit for simple transfer
          },
        ],
      });
      
      setTxHash(txHash);
      alert(`Transaction sent! Hash: ${txHash}\n\nYou can view it on Polygonscan: https://polygonscan.com/tx/${txHash}`);
      
      // Reset amount and update balance after successful transaction
      setDonationAmount('0.00000');
      
      // Wait a bit then update balance
      setTimeout(() => {
        updateBalance(walletAddress);
      }, 3000);
      
    } catch (error) {
      console.error('Transaction failed:', error);
      
      if (error.code === 4001) {
        alert('Transaction was rejected by user.');
      } else if (error.code === -32603) {
        alert('Transaction failed. You may have insufficient funds for gas fees.');
      } else {
        alert(`Transaction failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsTransacting(false);
    }
  };
  
  // Render connect button if not connected
  if (!isConnected) {
    return (
      <div className="wallet-connect">
        <button onClick={connectWallet} className="pixel-button wallet-connect-btn">
          <span className="whitepaper-button-text">CONNECT WALLET</span>
        </button>
        <div className="wallet-info-text">
          <p>Connect your wallet to donate POL directly to PIXLNAUTS on Polygon network.</p>
        </div>
      </div>
    );
  }
  
  // Render donation interface if connected
  return (
    <div className="wallet-donation">
      <div className="wallet-header">
        <div className="wallet-info">
          <span className="wallet-label">WALLET:</span>
          <span className="wallet-address">{walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</span>
        </div>
        <button onClick={disconnect} className="disconnect-btn">[DISCONNECT]</button>
      </div>
      
      <div className="donation-panel">
        <div className="donation-header">
          <span className="prompt">&gt;&gt;&gt;</span>
          <span className="donation-title">DONATE POL TO PIXELNAUTS</span>
        </div>
        
        <div className="target-address">
          <span className="target-label">TARGET:</span>
          <span className="target-value">{targetAddress}</span>
        </div>
        
        <div className="amount-section">
          <div className="amount-label">AMOUNT (POL):</div>
          <div className="amount-input-row">
            <input
              type="number"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              className="amount-input"
              step="0.00001"
              min="0"
              max={polBalance}
              placeholder="0.00000"
            />
            <button onClick={setMaxAmount} className="max-btn">[MAX]</button>
          </div>
        </div>
        
        <div className="preset-amounts">
          <button onClick={() => setAmount(0.42069)} className="preset-btn">[0.42069]</button>
          <button onClick={() => setAmount(6.9)} className="preset-btn">[6.9]</button>
          <button onClick={() => setAmount(69)} className="preset-btn">[69]</button>
        </div>
        
        <button 
          onClick={handleDonate} 
          className="donate-btn"
          disabled={isTransacting || parseFloat(donationAmount) <= 0 || parseFloat(donationAmount) > parseFloat(polBalance)}
        >
          {isTransacting ? '[PROCESSING...]' : `[DONATE ${parseFloat(donationAmount || 0).toFixed(5)} POL]`}
        </button>
        
        <div className="available-balance">
          AVAILABLE: {polBalance} POL
        </div>
        
        {txHash && (
          <div className="transaction-hash">
            <span className="tx-label">LAST TX:</span>
            <a 
              href={`https://polygonscan.com/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tx-link"
            >
              {txHash.substring(0, 10)}...{txHash.substring(56)}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Improved Tab component with better bottom scrolling
const Tab = ({ title, children, isOpen, toggleTab }) => {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const tabRef = useRef(null);
  
  // Function to update height
  const updateHeight = useCallback(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);
  
  // Use ResizeObserver to watch for content changes
  useEffect(() => {
    if (!contentRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    
    resizeObserver.observe(contentRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [updateHeight]);
  
  useEffect(() => {
    updateHeight();
    
    if (isOpen && contentRef.current) {
      // Improved scrolling that ensures content isn't cut off at bottom
      setTimeout(() => {
        if (tabRef.current) {
          const tabRect = tabRef.current.getBoundingClientRect();
          const topOffset = 120; // Space for logo at top
          const bottomPadding = 60; // Extra space at bottom of viewport
          
          // Calculate total content height (header + expanded content)
          const totalContentHeight = tabRect.height + contentRef.current.scrollHeight;
          
          // Check if bottom of expanded content would be visible in viewport
          const tabBottom = tabRect.bottom + contentRef.current.scrollHeight;
          const bottomWouldBeCutOff = tabBottom > window.innerHeight - bottomPadding;
          
          // Check if tab header is visible
          const headerIsVisible = tabRect.top >= topOffset && tabRect.top <= window.innerHeight - topOffset;
          
          // If content is too large to fit entirely in viewport, prioritize showing as much as possible
          if (totalContentHeight > window.innerHeight - topOffset - bottomPadding) {
            // Position tab as high as possible while respecting top offset
            window.scrollTo({
              top: window.scrollY + tabRect.top - topOffset,
              behavior: 'smooth'
            });
          } 
          // If header is visible but bottom would be cut off, scroll to show more of the bottom
          else if (headerIsVisible && bottomWouldBeCutOff) {
            // Scroll just enough to show bottom content with padding
            window.scrollTo({
              top: window.scrollY + (tabBottom - window.innerHeight + bottomPadding),
              behavior: 'smooth'
            });
          }
          // If header is not visible, scroll to position it properly
          else if (!headerIsVisible) {
            window.scrollTo({
              top: window.scrollY + tabRect.top - topOffset,
              behavior: 'smooth'
            });
          }
          // Otherwise, no scrolling needed - everything fits nicely
        }
      }, 50); // Small delay to allow for DOM updates
    }
  }, [isOpen, updateHeight]);
  
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
const BeeboCustomizerTab = ({ onLaunch }) => {
  // Check if user is on mobile
  const isMobile = isMobileDevice();
  
  return (
    <div className="beebo-customizer">
      {isMobile ? (
        // Mobile version - show unavailable message
        <>
          <p>
            <ScrambleText 
              text="The B-b0 Customizer requires a desktop computer." 
              speed={10} 
            />
          </p>
          <p className="mobile-notice">
            <ScrambleText 
              text="This feature is not available on mobile devices. Please use a computer to access the full 3D customizer experience." 
              speed={10}
              color="#ff5" 
            />
          </p>
        </>
      ) : (
        // Desktop version - show launch button
        <>
          <p>
            <ScrambleText 
              text="Customize your own B-b0 robot companion in our interactive 3D model viewer!" 
              speed={10} 
            />
          </p>
          <div className="beebo-links">
            <button onClick={onLaunch} className="pixel-button">
              <span className="whitepaper-button-text">LAUNCH B-b0 CUSTOMIZER</span>
            </button>
          </div>
        </>
      )}
      {/* Keep the Discord invite button for all devices */}
      <div className={`beebo-links ${isMobile ? 'mobile-only-links' : 'secondary-links'}`}>
        <a href="https://discord.com/oauth2/authorize?client_id=1284849644345626664" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">INVITE BEEBO TO YOUR DISCORD SERVER!</span>
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
      
      <WalletDonation />
      
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
        <p>GET THE LATEST VERSION SmartClock v2.0 NOW!!!</p>
      </div>
      <div className="app-download">
        <a href="/downloads/smartclockbeta.apk" download className="pixel-button">
          <span className="whitepaper-button-text">DOWNLOAD APK</span>
        </a>
      </div>
    </div>
  );
};

// Donation Milestones tab content
const DonationMilestonesTab = ({ currentUsdValue }) => {
  const milestones = [
    { name: "NFT Customizer", amount: 450, selfFunded: 0, description: "Smart contract for actually minting your very own custom B-b0s" },
    { name: "Revenue Card", amount: 350, selfFunded: 0, description: "Smart contract for convertible note inspired dynamic revenue redistribution" },
    { name: "Project: Cosmos alpha release", amount: 3200, selfFunded: 0, description: "Blockchain integration, multiplayer and performance optimizations" },
    { name: "3D Printer", amount: 750, selfFunded: 0, description: "Physical prototyping capabilities" },
    { name: "Coming Soon", amount: null, selfFunded: 0, description: "Future milestone to be announced" }
  ];

  // Calculate cumulative totals and status for each milestone
  const processedMilestones = [];
  let cumulativeTotal = 0;
  
  milestones.forEach((milestone, index) => {
    if (milestone.amount === null) {
      processedMilestones.push({
        ...milestone,
        cumulativeTotal: cumulativeTotal,
        status: 'locked',
        progress: 0,
        isComingSoon: true
      });
      return;
    }

    cumulativeTotal += milestone.amount;
    
    let status, progress;
    const totalFunding = currentUsdValue + (milestone.selfFunded || 0);

    if (totalFunding >= cumulativeTotal) {
      status = 'completed';
      progress = 100;
    } else if (index === 0 || totalFunding >= (processedMilestones[index - 1]?.cumulativeTotal || 0)) {
      status = 'in-progress';
      const previousTotal = index === 0 ? 0 : (processedMilestones[index - 1]?.cumulativeTotal || 0);
      progress = Math.min(100, ((totalFunding - previousTotal) / milestone.amount) * 100);
    } else {
      status = 'locked';
      progress = 0;
    }

    processedMilestones.push({
      ...milestone,
      cumulativeTotal,
      status,
      progress
    });
  });

  return (
    <div className="donation-milestones">
      <div className="milestones-header">
        <p>
          <ScrambleText 
            text="Track our progress towards key development milestones funded by community donations." 
            speed={10} 
          />
        </p>
        <div className="current-progress">
          <span className="progress-label">CURRENT DONATIONS:</span>
          <span className="progress-value">${currentUsdValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="milestones-list">
        {processedMilestones.map((milestone, index) => (
          <div 
            key={index} 
            className={`milestone-item ${milestone.status} ${milestone.isComingSoon ? 'coming-soon' : ''}`}
          >
            <div className="milestone-header">
              <div className="milestone-info">
                <span className="milestone-name">{milestone.name}</span>
              </div>
              <div className="milestone-total">
                {!milestone.isComingSoon && (
                  <span className="milestone-amount">${milestone.amount}</span>
                )}
              </div>
            </div>
            
            <div className="milestone-description">
              {milestone.description}
            </div>

            {!milestone.isComingSoon && (
              <div className="milestone-progress">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${milestone.progress}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {milestone.status === 'completed' ? 'COMPLETED' : `${milestone.progress.toFixed(1)}%`}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// TabsManager to control which tab is open
const TabsManager = ({ openCustomizer, currentUsdValue }) => {
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
        title="BUILD-A-BEEBO" 
        isOpen={openTab === 3} 
        toggleTab={() => toggleTab(3)}
      >
        <BeeboCustomizerTab onLaunch={openCustomizer} />
      </Tab>
      <Tab 
        title="THE QUIRKIEST USELESS APP" 
        isOpen={openTab === 4} 
        toggleTab={() => toggleTab(4)}
      >
        <QuirkiestAppTab />
      </Tab>
      <Tab 
        title="DONATION MILESTONES" 
        isOpen={openTab === 5} 
        toggleTab={() => toggleTab(5)}
      >
        <DonationMilestonesTab currentUsdValue={currentUsdValue} />
      </Tab>
      <Tab 
        title="SUPPORT US" 
        isOpen={openTab === 6} 
        toggleTab={() => toggleTab(6)}
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

// Enhanced CustomizerView with improved fade-in animations
const CustomizerView = ({ onClose }) => {
  const [animationStage, setAnimationStage] = useState('fadeIn');
  const [showIframe, setShowIframe] = useState(false);
  const [iframeOpacity, setIframeOpacity] = useState(0);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const timerRef = useRef([]);
  const iframeRef = useRef(null);
  
  // Set up animation sequence when component mounts
  useEffect(() => {
    // Clear any existing timers
    timerRef.current.forEach(timer => clearTimeout(timer));
    timerRef.current = [];
    
    // Opening animation sequence
    const timer1 = setTimeout(() => setAnimationStage('horizontalLine'), 800);
    const timer2 = setTimeout(() => setAnimationStage('verticalExpand'), 1600);
    const timer3 = setTimeout(() => {
      setAnimationStage('ready');
      setShowIframe(true);
      // Start fade-in for iframe and button after a small delay
      setTimeout(() => {
        setIframeOpacity(1);
        setTimeout(() => setButtonOpacity(1), 500); // Stagger button fade-in
      }, 100);
    }, 2400);
    
    timerRef.current = [timer1, timer2, timer3];
    
    // Clean up timers when component unmounts
    return () => {
      timerRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Handle closing animation sequence
  const handleClose = () => {
    // Clear any existing timers
    timerRef.current.forEach(timer => clearTimeout(timer));
    timerRef.current = [];
    
    // First fade out the iframe and button
    setButtonOpacity(0);
    setTimeout(() => {
      setIframeOpacity(0);
      // After brief delay, start the container animations
      setTimeout(() => {
        setShowIframe(false);
        setAnimationStage('verticalCollapse');
        
        const timer1 = setTimeout(() => setAnimationStage('horizontalCollapse'), 800);
        const timer2 = setTimeout(() => setAnimationStage('fadeOut'), 1600);
        const timer3 = setTimeout(() => {
          onClose();
        }, 2400);
        
        timerRef.current = [timer1, timer2, timer3];
      }, 300);
    }, 200);
  };
  
  return (
    <div className={`customizer-overlay ${animationStage}`}>
      <div className="customizer-container">
        <div className="customizer-border">
          <div className="customizer-content">
            {showIframe ? (
              <>
                <div 
                  className="customizer-iframe-container"
                  style={{ 
                    opacity: iframeOpacity,
                    transition: 'opacity 0.6s ease-in-out'
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src="/b-b0-customizer/index.html"
                    title="B-b0 Customizer"
                    className="customizer-iframe"
                    frameBorder="0"
                    allow="fullscreen"
                  />
                </div>
                <button 
                  onClick={handleClose}
                  className="customizer-return-button pixel-button"
                  style={{ 
                    opacity: buttonOpacity,
                    transition: 'opacity 0.6s ease-in-out, transform 0.3s ease'
                  }}
                >
                  <span className="whitepaper-button-text">RETURN TO PIXLNAUTS</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Global Dashboard Component with Dynamic Views
const GlobalDashboard = ({ onUsdValueChange }) => {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalAmount: 0,
    carbonOffset: 0,
    topDonors: [],
    loading: true
  });
  const [userStats, setUserStats] = useState({
    userDonations: 0,
    userAmount: 0,
    userRank: 0,
    loading: true
  });
  const [polPrice, setPolPrice] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Dashboard state management
  const [leftViewIndex, setLeftViewIndex] = useState(0); // 0: global, 1: user (if connected)
  const [rightViewIndex, setRightViewIndex] = useState(0); // 0: price info, 1: leaderboard
  const [isLeftHighlighted, setIsLeftHighlighted] = useState(false);
  const [isRightHighlighted, setIsRightHighlighted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);
  
  // Auto-cycle and refresh intervals
  const cycleIntervalRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  
  const targetAddress = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';
  
  // Fetch POL price from multiple sources with fallbacks
  const fetchPolPrice = useCallback(async () => {
    try {
      // Try CoinGecko first
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd');
        const data = await response.json();
        if (data && data.polygon && data.polygon.usd) {
          const price = parseFloat(data.polygon.usd);
          if (price > 0) {
            setPolPrice(price);
            return;
          }
        }
      } catch (error) {
        console.log('CoinGecko failed, trying next...');
      }

      // Try CryptoCompare as backup
      try {
        const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=MATIC&tsyms=USD');
        const data = await response.json();
        if (data && data.USD) {
          const price = parseFloat(data.USD);
          if (price > 0) {
            setPolPrice(price);
            return;
          }
        }
      } catch (error) {
        console.log('CryptoCompare failed...');
      }

      // Fallback price
      console.warn('All price APIs failed, using fallback price');
      setPolPrice(0.4);
      
    } catch (error) {
      console.error('Failed to fetch POL price:', error);
      setPolPrice(0.4);
    }
  }, []);
  
  const fetchTransactionsFromPolygonScan = useCallback(async () => {
    try {
      const apiKey = '6MSYXMBWYCUPQPU8MJ4T7UN7R634VTRSP8'; 
      const url = `https://api.polygonscan.com/api?module=account&action=txlist&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        // Filter for incoming transactions only
        const donations = data.result.filter(tx => {
          return (
            tx.to && 
            tx.to.toLowerCase() === targetAddress.toLowerCase() && 
            tx.value && 
            tx.value !== '0' &&
            tx.isError === '0' && 
            tx.from !== targetAddress.toLowerCase()
          );
        });
        
        // Group by donor address and sum amounts
        const donorMap = new Map();
        let totalAmount = 0;
        
        donations.forEach(tx => {
          try {
            const valueInWei = BigInt(tx.value);
            const amountInPol = Number(valueInWei) / Math.pow(10, 18);
            
            if (!isNaN(amountInPol) && amountInPol > 0 && amountInPol < 1000000) {
              totalAmount += amountInPol;
              
              // Add to donor map
              const currentAmount = donorMap.get(tx.from) || 0;
              donorMap.set(tx.from, currentAmount + amountInPol);
            }
          } catch (e) {
            console.warn('Error parsing transaction value:', tx.value, e);
          }
        });
        
        // Convert to array and sort by amount (top 3)
        const topDonors = Array.from(donorMap.entries())
          .map(([address, amount]) => ({ address, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);
        
        const carbonOffset = polPrice > 0 ? (totalAmount * polPrice * 10) / 1000 : 0;
        
        return {
          totalDonations: donations.length,
          totalAmount: totalAmount,
          carbonOffset: carbonOffset,
          topDonors: topDonors,
          donorMap: donorMap
        };
      } else {
        console.warn('PolygonScan API response:', data);
        return { totalDonations: 0, totalAmount: 0, carbonOffset: 0, topDonors: [], donorMap: new Map() };
      }
    } catch (error) {
      console.error('Failed to fetch transactions from PolygonScan:', error);
      return { totalDonations: 0, totalAmount: 0, carbonOffset: 0, topDonors: [], donorMap: new Map() };
    }
  }, [targetAddress, polPrice]);
  
  const fetchAccountBalance = useCallback(async () => {
    try {
      const response = await fetch('https://polygon-rpc.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [targetAddress, 'latest'],
          id: 1
        })
      });
      
      const data = await response.json();
      if (data.result) {
        const balanceInWei = parseInt(data.result, 16);
        const balanceInPol = Number(balanceInWei) / Math.pow(10, 18);
        return balanceInPol;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to fetch account balance:', error);
      return 0;
    }
  }, [targetAddress]);
  
  const fetchUserStats = useCallback(async (userAddress) => {
    if (!userAddress) return;
    
    try {
      // Show loading values in the stats instead of loading screen
      setUserStats(prev => ({ 
        userDonations: 0,
        userAmount: 0,
        userRank: 0,
        loading: true 
      }));
      
      const transactionData = await fetchTransactionsFromPolygonScan();
      const userAmount = transactionData.donorMap.get(userAddress.toLowerCase()) || 0;
      
      // Count actual transactions for this user
      const userDonationCount = userAmount > 0 ? 1 : 0;
      
      // Calculate user rank
      const sortedDonors = Array.from(transactionData.donorMap.entries())
        .sort((a, b) => b[1] - a[1]);
      const userRank = sortedDonors.findIndex(([address]) => address.toLowerCase() === userAddress.toLowerCase()) + 1;
      
      setUserStats({
        userDonations: userDonationCount,
        userAmount: userAmount,
        userRank: userRank || 0,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      setUserStats(prev => ({ ...prev, loading: false }));
    }
  }, [fetchTransactionsFromPolygonScan]);
  
  const fetchGlobalStats = useCallback(async () => {
    try {
      // Don't show loading state for the entire panel during refresh
      const [transactionStats, currentBalance] = await Promise.all([
        fetchTransactionsFromPolygonScan(),
        fetchAccountBalance()
      ]);
      
      const totalAmount = currentBalance;
      const carbonOffset = polPrice > 0 ? (totalAmount * polPrice * 10) / 1000 : 0;
      
      setStats({
        totalDonations: transactionStats.totalDonations,
        totalAmount: totalAmount,
        carbonOffset: carbonOffset,
        topDonors: transactionStats.topDonors,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch global stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [fetchTransactionsFromPolygonScan, fetchAccountBalance, polPrice]);
  
  // Check wallet connection status
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsConnected(true);
            await fetchUserStats(accounts[0]);
          } else {
            // No wallet connected - ensure we're in global view
            setIsConnected(false);
            setWalletAddress('');
            setLeftViewIndex(0);
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
          setIsConnected(false);
          setWalletAddress('');
          setLeftViewIndex(0);
        }
      }
    };
    
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setWalletAddress('');
          setLeftViewIndex(0); // Force to global view
          setUserStats({
            userDonations: 0,
            userAmount: 0,
            userRank: 0,
            loading: false
          });
        } else {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          fetchUserStats(accounts[0]);
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, [fetchUserStats]);
  
  // Auto-cycle between views every 10 seconds
  useEffect(() => {
    const startCycle = () => {
      cycleIntervalRef.current = setInterval(() => {
        // Only cycle left panel if wallet is connected and not hovered
        if (isConnected && !isLeftHovered) {
          // Highlight and change left view first
          setIsLeftHighlighted(true);
          setTimeout(() => {
            setIsLeftHighlighted(false);
            setLeftViewIndex(prev => prev === 0 ? 1 : 0);
          }, 500);
        }
        
        // Always cycle right panel if not hovered (after delay if left panel cycled)
        const rightPanelDelay = (isConnected && !isLeftHovered) ? 1500 : 0;
        setTimeout(() => {
          if (!isRightHovered) {
            setIsRightHighlighted(true);
            setTimeout(() => {
              setIsRightHighlighted(false);
              setRightViewIndex(prev => prev === 0 ? 1 : 0);
            }, 500);
          }
        }, rightPanelDelay);
      }, 10000);
    };
    
    startCycle();
    
    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [isConnected, isLeftHovered, isRightHovered]);
  
  // Refresh data every 2 minutes
  useEffect(() => {
    const startRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        // Set last updated to LOADING... before starting refresh
        setLastUpdated('LOADING...');
        
        fetchPolPrice();
        fetchGlobalStats();
        if (isConnected && walletAddress) {
          fetchUserStats(walletAddress);
        }
        
        // Set actual time after a short delay to allow data to load
        setTimeout(() => {
          setLastUpdated(new Date());
        }, 2000);
      }, 120000); // 2 minutes
    };
    
    startRefresh();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isConnected, walletAddress, fetchPolPrice, fetchGlobalStats, fetchUserStats]);
  
  // Manual click handlers for panels (no longer breaks cycle)
  const handleLeftPanelClick = () => {
    if (isConnected) {
      setIsLeftHighlighted(true);
      setTimeout(() => {
        setIsLeftHighlighted(false);
        setLeftViewIndex(prev => prev === 0 ? 1 : 0);
      }, 500);
    }
  };
  
  const handleRightPanelClick = () => {
    setIsRightHighlighted(true);
    setTimeout(() => {
      setIsRightHighlighted(false);
      setRightViewIndex(prev => prev === 0 ? 1 : 0);
    }, 500);
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchPolPrice();
  }, [fetchPolPrice]);

  useEffect(() => {
    if (polPrice > 0) {
      fetchGlobalStats();
    }
  }, [polPrice, fetchGlobalStats]);
  
  // USD value change emission
  useEffect(() => {
    const usdValue = stats.totalAmount * polPrice;
    if (onUsdValueChange && !stats.loading && polPrice > 0) {
      onUsdValueChange(usdValue);
    }
  }, [stats.totalAmount, polPrice, stats.loading, onUsdValueChange]);

  // Render left panel content
  const renderLeftPanel = () => {
    const isGlobalView = leftViewIndex === 0;
    const currentStats = isGlobalView ? stats : userStats;
    const isLoading = currentStats.loading;
    
    return (
      <div 
        className={`stats-panel left-panel ${isGlobalView ? 'global-stats' : 'user-stats'} ${isLeftHighlighted ? 'highlighted' : ''} ${isConnected ? 'clickable' : ''}`}
        onClick={handleLeftPanelClick}
        onMouseEnter={() => setIsLeftHovered(true)}
        onMouseLeave={() => setIsLeftHovered(false)}
      >
        <div className="stats-header">
          {isGlobalView ? 'COMMUNITY DONATIONS' : 'YOUR DONATIONS'}
        </div>
        <div className="stats-content">
          {isGlobalView ? (
            <>
              <div className="stat-item">
                <span className="stat-label">TOTAL DONATIONS:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : stats.totalDonations}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">TOTAL POL:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : stats.totalAmount.toFixed(5)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">USD VALUE:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${(stats.totalAmount * polPrice).toFixed(2)}`}</span>
              </div>
              <div className="stat-item carbon-impact">
                <span className="stat-label">CO2 OFFSET:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${stats.carbonOffset.toFixed(3)} METRIC TONS`}</span>
              </div>
            </>
          ) : (
            <>
              <div className="stat-item">
                <span className="stat-label">WALLET:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">YOUR DONATIONS:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${userStats.userAmount.toFixed(5)} POL`}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">USD VALUE:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${(userStats.userAmount * polPrice).toFixed(2)}`}</span>
              </div>
              <div className="stat-item carbon-impact">
                <span className="stat-label">YOUR CO2 OFFSET:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${(userStats.userAmount * polPrice * 10 / 1000).toFixed(3)} METRIC TONS`}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  
  // Render right panel content
  const renderRightPanel = () => {
    const isPriceView = rightViewIndex === 0;
    
    return (
      <div 
        className={`stats-panel right-panel ${isPriceView ? 'price-panel' : 'leaderboard-panel'} ${isRightHighlighted ? 'highlighted' : ''} clickable`}
        onClick={handleRightPanelClick}
        onMouseEnter={() => setIsRightHovered(true)}
        onMouseLeave={() => setIsRightHovered(false)}
      >
        <div className="stats-header">
          {isPriceView ? 'MARKET DATA' : 'TOP DONORS'}
        </div>
        <div className="stats-content">
          {isPriceView ? (
            <>
              <div className="stat-item price-highlight">
                <span className="stat-label">POL PRICE:</span>
                <span className="stat-value">${polPrice > 0 ? polPrice.toFixed(4) : 'LOADING...'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">LAST UPDATE:</span>
                <span className="stat-value">{typeof lastUpdated === 'string' ? lastUpdated : lastUpdated.toLocaleTimeString()}</span>
              </div>
            </>
          ) : (
            <>
              {stats.topDonors && stats.topDonors.length > 0 ? (
                stats.topDonors.map((donor, index) => (
                  <div key={donor.address} className="stat-item leaderboard-item">
                    <span className="stat-label">#{index + 1} {donor.address.substring(0, 6)}...{donor.address.substring(38)}:</span>
                    <span className="stat-value">{donor.amount.toFixed(5)} POL</span>
                  </div>
                ))
              ) : (
                <div className="loading-stats">LOADING DONORS...</div>
              )}
              <div className="stat-item">
                <span className="stat-label">LAST UPDATE:</span>
                <span className="stat-value">{typeof lastUpdated === 'string' ? lastUpdated : lastUpdated.toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="global-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <span className="prompt">&gt;&gt;&gt;</span>
          <span>PIXELNAUTS GLOBAL IMPACT</span>
        </div>
      </div>
      
      <div className="dashboard-grid">
        {renderLeftPanel()}
        {renderRightPanel()}
      </div>
      
      <div className="dashboard-footer">
        <div className="impact-message">
          <ScrambleText 
            text="Every donation helps fund environmental initiatives and carbon offset projects." 
            speed={15} 
            intensity={0.8}
          />
        </div>
      </div>
    </div>
  );
};

// Main component
const App = () => {
  const [currentState, setCurrentState] = useState(() => {
    // Check if we should skip boot sequence
    if (localStorage.getItem('skipBootSequence') === 'true') {
      localStorage.removeItem('skipBootSequence'); // Clean up the flag
      return 'content'; // Skip directly to content
    }
    return 'systemCheck'; // Normal boot sequence
  });
  const [tabsVisible] = useState(true); 
  const [showContent, setShowContent] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [currentUsdValue, setCurrentUsdValue] = useState(0);
  
  // Add simple scroll-to-top effect on initial load
  useEffect(() => {
    // Force scroll to top whenever content is first shown
    if (currentState === 'content' && !showContent) {
      setTimeout(() => {
        setShowContent(true);
      }, 300);
    }
  }, [currentState, showContent]);
  
  // Add another effect specifically to handle page refresh
  useEffect(() => {
    // This will run on component mount (page load/refresh)
    window.scrollTo(0, 0);
    
    // Add event listener for page visibility changes
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.scrollTo(0, 0);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  
  const handleSystemCheckComplete = () => {
    setCurrentState('loading');
  };
  
  const handleLoadingComplete = () => {
    setCurrentState('content');
  };
  
  const handleOpenCustomizer = () => {
    setShowCustomizer(true);
  };
  
  const handleCloseCustomizer = () => {
    setShowCustomizer(false);
  };
  
  // Check if showing customizer
  if (showCustomizer) {
    // Extra check to prevent mobile devices from accessing
    if (isMobileDevice()) {
      setShowCustomizer(false);
      return null;
    }
    return <CustomizerView onClose={handleCloseCustomizer} />;
  }

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
        <TabsManager openCustomizer={handleOpenCustomizer} currentUsdValue={currentUsdValue} />
      </div>
      <GlobalDashboard onUsdValueChange={setCurrentUsdValue} />
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
  html, body {
    scroll-behavior: smooth;
    overflow-x: hidden;
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
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    font-size: 16px;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
    font-family: monospace;
    display: block;
    min-height: 1.2em;
    position: relative;
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
    padding: 40px 20px 20px 20px;
    position: relative;
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
    min-height: 120px;
    min-width: 300px;
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
    scroll-margin-top: 20px;
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
    font-size: 24px;
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
    font-size: 24px;
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

  .logo-text-wrapper {
    white-space: nowrap !important;
    overflow: visible;
    display: inline-block;
    width: auto;
  }

  .logo .scramble-text {
    white-space: nowrap !important;
    display: inline-block;
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
    padding-bottom: 50%;
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

  .secret-message {
    font-size: 12px;
    color: #444;
    text-align: center;
    max-width: 600px;
    margin-top: 20px;
    padding: 15px;
    line-height: 1.4;
  }

  /* Wallet donation styles */
  .wallet-donation {
    position: relative;
    background-color: #000;
    border: 4px solid #0f0;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    font-family: monospace;
    color: #0f0;
    margin: 20px 0;
  }

  .wallet-header {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    font-size: 14px;
    font-family: monospace;
  }

  .wallet-info, .pol-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #0f0;
  }

  .wallet-address, .pol-balance {
    color: #0f0;
    font-weight: bold;
  }

  .disconnect-btn {
    background: none;
    border: none;
    color: #0f0;
    cursor: pointer;
    font-family: monospace;
    font-size: 14px;
    padding: 2px 4px;
  }

  .disconnect-btn:hover {
    color: #5f5;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  .donation-panel {
    padding: 20px;
    padding-top: 80px;
  }

  .donation-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: bold;
  }

  .prompt {
    color: #0f0;
    font-weight: bold;
  }

  .donation-title {
    color: #0f0;
    font-weight: bold;
  }

  .target-address {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    font-size: 14px;
    word-break: break-all;
  }

  .target-label {
    color: #0f0;
    font-weight: bold;
    white-space: nowrap;
  }

  .target-value {
    color: #0f0;
    font-family: monospace;
  }

  .amount-section {
    margin-bottom: 20px;
  }

  .amount-label {
    color: #0f0;
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 16px;
  }

  .amount-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .amount-input {
    flex: 1;
    background-color: #111;
    border: 2px solid #0f0;
    color: #0f0;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 16px;
    min-width: 0;
  }

  .amount-input:focus {
    outline: none;
    border-color: #5f5;
    box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  .max-btn {
    background-color: #0f0;
    color: #000;
    border: none;
    padding: 8px 16px;
    font-family: monospace;
    font-weight: bold;
    cursor: pointer;
    font-size: 14px;
  }

  .max-btn:hover {
    background-color: #5f5;
  }

  .preset-amounts {
    display: flex;
    gap: 15px;
    margin-bottom: 25px;
    justify-content: flex-start;
  }

  .preset-btn {
    background-color: #0f0;
    color: #000;
    border: none;
    padding: 8px 16px;
    font-family: monospace;
    font-weight: bold;
    cursor: pointer;
    font-size: 14px;
  }

  .preset-btn:hover {
    background-color: #5f5;
  }

  .donate-btn {
    width: 100%;
    background-color: #0f0;
    color: #000;
    border: none;
    padding: 15px 20px;
    font-family: monospace;
    font-weight: bold;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 15px;
    text-align: center;
  }

  .donate-btn:hover:not(:disabled) {
    background-color: #5f5;
  }

  .donate-btn:disabled {
    background-color: #555;
    color: #999;
    cursor: not-allowed;
  }

  .available-balance {
    color: #0f0;
    font-family: monospace;
    text-align: center;
    margin-bottom: 15px;
    font-size: 14px;
  }

  .transaction-hash {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    word-break: break-all;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #333;
  }

  .tx-label {
    color: #0f0;
    font-weight: bold;
    white-space: nowrap;
  }

  .tx-link {
    color: #0f0;
    text-decoration: underline;
    font-family: monospace;
  }

  .tx-link:hover {
    color: #5f5;
  }

  .wallet-connect {
    text-align: center;
    padding: 20px;
  }

  .wallet-connect-btn {
    margin-bottom: 20px;
  }

  .wallet-info-text {
    color: #0f0;
    font-size: 14px;
    line-height: 1.6;
  }

  .wallet-info-text p {
    margin: 0;
    text-shadow: 0 0 3px #0f03;
  }

  /* Global Dashboard Styles */
  .global-dashboard {
    margin: 40px 0;
    background-color: #0a0a0a;
    border: 4px solid #0f0;
    padding: 20px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    position: relative;
  }

  .global-dashboard .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: bold;
    flex-wrap: wrap;
    gap: 10px;
  }

  .global-dashboard .dashboard-title {
    color: #0f0;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .global-dashboard .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .global-dashboard .stats-panel {
    background-color: #111;
    border: 2px solid #333;
    padding: 15px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .global-dashboard .stats-panel:hover {
    border-color: #0f0;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 255, 0, 0.2);
  }

  /* Clickable panels */
  .global-dashboard .stats-panel.clickable {
    cursor: pointer;
  }

  .global-dashboard .stats-panel.clickable:hover {
    border-color: #5f5;
  }

  /* Highlighted state for auto-cycling */
  .global-dashboard .stats-panel.highlighted {
    border-color: #0f0 !important;
    background-color: #1a1a1a;
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 255, 0, 0.4);
    animation: highlight-pulse 0.5s ease-in-out;
  }

  @keyframes highlight-pulse {
    0%, 100% { 
      box-shadow: 0 6px 20px rgba(0, 255, 0, 0.4);
    }
    50% { 
      box-shadow: 0 8px 25px rgba(0, 255, 0, 0.6);
      transform: translateY(-4px);
    }
  }

  /* Panel type styling */
  .global-dashboard .left-panel.global-stats {
    border-left: 4px solid #0f0;
  }

  .global-dashboard .left-panel.user-stats {
    border-left: 4px solid #ff5;
  }

  .global-dashboard .right-panel.price-panel {
    border-left: 4px solid #5f5;
  }

  .global-dashboard .right-panel.leaderboard-panel {
    border-left: 4px solid #f5f;
  }

  .global-dashboard .stats-header {
    color: #0f0;
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 15px;
    text-align: center;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  .global-dashboard .stats-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .global-dashboard .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid #333;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .global-dashboard .stat-item:last-child {
    border-bottom: none;
  }

  .global-dashboard .stat-item:hover {
    background-color: rgba(0, 255, 0, 0.05);
    padding-left: 5px;
  }

  .global-dashboard .stat-label {
    color: #0f0;
    font-weight: bold;
  }

  .global-dashboard .stat-value {
    color: #fff;
    font-family: monospace;
  }

  .global-dashboard .carbon-impact .stat-value {
    color: #5f5;
    text-shadow: 0 0 3px rgba(95, 255, 95, 0.5);
  }

  .global-dashboard .price-highlight .stat-value {
    color: #ff5;
    font-weight: bold;
    text-shadow: 0 0 3px rgba(255, 255, 95, 0.5);
  }

  .global-dashboard .loading-stats {
    text-align: center;
    color: #0f0;
    font-style: italic;
    padding: 20px 0;
    animation: pulse 1.5s infinite;
  }

  .dashboard-footer {
    padding: 15px;
    border-top: 2px solid #333;
    margin-top: 10px;
    text-align: center;
  }

  .global-dashboard .leaderboard-item {
    background-color: #0a0a0a;
    border-left: 3px solid;
    padding-left: 8px;
    margin: 2px 0;
    transition: all 0.2s ease;
  }

  .global-dashboard .leaderboard-item:nth-child(1) {
    border-left-color: #ffd700; /* Gold */
  }

  .global-dashboard .leaderboard-item:nth-child(2) {
    border-left-color: #c0c0c0; /* Silver */
  }

  .global-dashboard .leaderboard-item:nth-child(3) {
    border-left-color: #cd7f32; /* Bronze */
  }

  .global-dashboard .leaderboard-item:hover {
    background-color: #151515;
    transform: translateX(3px);
  }

  .impact-message {
    font-size: 14px;
    color: #0f0;
    text-shadow: 0 0 3px rgba(0, 255, 0, 0.3);
  }

  /* Panel transition effects */
  .stats-panel {
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .stats-panel .stats-content {
    transition: opacity 0.2s ease;
  }

  .stats-panel.highlighted .stats-content {
    opacity: 0.9;
  }

  /* Donation Milestones Styles */
  .donation-milestones {
    color: #0f0;
  }

  .donation-milestones p {
    line-height: 1.6;
    margin-bottom: 20px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
  }

  .milestones-header {
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #333;
  }

  .current-progress {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding: 10px;
    background-color: #0a0a0a;
    border: 2px solid #0f0;
  }

  .progress-label {
    font-weight: bold;
    color: #0f0;
  }

  .progress-value {
    font-family: monospace;
    font-weight: bold;
    color: #fff;
    font-size: 18px;
  }

  .milestones-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .milestone-item {
    padding: 15px;
    border: 2px solid #333;
    background-color: #0a0a0a;
    transition: all 0.3s ease;
  }

  .milestone-item.completed {
    border-color: #0f0;
    background-color: rgba(0, 50, 0, 0.3);
    color: #0f0;
  }

  .milestone-item.in-progress {
    border-color: #fff;
    background-color: rgba(50, 50, 50, 0.3);
    color: #fff;
  }

  .milestone-item.locked {
    border-color: #666;
    background-color: rgba(20, 20, 20, 0.3);
    color: #666;
  }

  .milestone-item.coming-soon {
    border-color: #888;
    background-color: rgba(30, 30, 30, 0.3);
    color: #888;
    border-style: dashed;
  }

  .milestone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .milestone-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .milestone-name {
    font-weight: bold;
    font-size: 18px;
  }

  .milestone-amount {
    font-family: monospace;
    font-size: 20px;
    opacity: 0.8;
  }

  .milestone-total {
    text-align: right;
  }

  .total-needed {
    font-family: monospace;
    font-size: 14px;
    opacity: 0.9;
  }

  .milestone-description {
    margin-bottom: 15px;
    font-size: 14px;
    opacity: 0.8;
    line-height: 1.4;
  }

  .milestone-progress {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .progress-bar-container {
    flex: 1;
    height: 20px;
    background-color: #111;
    border: 1px solid currentColor;
    position: relative;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background-color: currentColor;
    transition: width 0.5s ease;
    position: relative;
  }

  .milestone-item.completed .progress-bar-fill {
    background-color: #0f0;
  }

  .milestone-item.in-progress .progress-bar-fill {
    background-color: #fff;
  }

  .progress-text {
    font-family: monospace;
    font-weight: bold;
    min-width: 80px;
    text-align: right;
  }

  /* ENHANCED B-b0 Customizer Styles */
  .customizer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    transition: background-color 0.8s ease-in-out;
  }

  /* Animation states */
  .customizer-overlay.fadeIn {
    background-color: rgba(0, 0, 0, 0.95);
    animation: fadeIn 0.8s ease-in-out forwards;
  }

  .customizer-overlay.horizontalLine .customizer-container {
    width: 0;
    height: 4px;
    background-color: #0f0;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.7);
    animation: horizontalGrow 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  @keyframes horizontalGrow {
    from { width: 0; }
    to { width: 100%; }
  }

  .customizer-overlay.verticalExpand .customizer-container {
    width: 100%;
    height: 100%;
    background-color: transparent;
    border: 4px solid #0f0;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.7);
    transition: height 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .customizer-overlay.ready .customizer-container {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 10, 0, 0.8);
    border: 4px solid #0f0;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.9);
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Closing animations */
  .customizer-overlay.verticalCollapse .customizer-container {
    width: 100%;
    height: 4px;
    background-color: #0f0;
    transition: height 0.8s cubic-bezier(0.8, 0.2, 0.8, 0.2);
  }

  .customizer-overlay.horizontalCollapse .customizer-container {
    width: 0;
    height: 4px;
    background-color: #0f0;
    transition: width 0.8s cubic-bezier(0.8, 0.2, 0.8, 0.2), margin-right 0.8s cubic-bezier(0.8, 0.2, 0.8, 0.2);
  }

  .customizer-overlay.fadeOut {
    background-color: rgba(0, 0, 0, 0);
  }

  /* Container styling */
  .customizer-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .customizer-border {
    width: 100%;
    height: 100%;
    padding: 2px;
    clip-path: polygon(
      0 0, 
      100% 0, 
      100% calc(100% - 8px), 
      calc(100% - 8px) 100%, 
      0 100%
    );
  }

  .customizer-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    background-color: #111;
    color: #0f0;
  }

  /* Iframe container */
  .customizer-iframe-container {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  /* iframe styling */
  .customizer-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  /* Return button styling */
  .customizer-return-button {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10001;
    border: 2px solid #000;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.7);
  }

  .customizer-return-button:hover {
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.9);
    transform: translate(2px, -2px);
  }

  .customizer-return-button:active {
    box-shadow: 0 0 25px rgba(0, 255, 0, 1);
    transform: translate(4px, 0);
  }

  /* Animation keyframes */
  @keyframes fadeIn {
    from { background-color: rgba(0, 0, 0, 0); }
    to { background-color: rgba(0, 0, 0, 0.95); }
  }

  /* Mobile notice styling */
  .mobile-notice {
    margin: 20px 0;
    padding: 15px;
    border: 2px dashed #ff5;
    background-color: rgba(50, 50, 0, 0.2);
    text-align: center;
  }

  .mobile-only-links {
    margin-top: 20px;
  }

  .secondary-links {
    margin-top: 15px;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .customizer-overlay.horizontalLine .customizer-container,
    .customizer-overlay.verticalExpand .customizer-container,
    .customizer-overlay.ready .customizer-container {
      width: 95vw;
    }
    
    .customizer-overlay.ready .customizer-container {
      height: 95vh;
    }
  }

  /* Mobile responsiveness for global dashboard */
  @media (max-width: 768px) {
    .global-dashboard .dashboard-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 15px;
    }
      
    .global-dashboard .dashboard-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    
    .global-dashboard {
      margin: 30px 0;
      padding: 15px;
    }
    
    .global-dashboard .dashboard-header {
      font-size: 16px;
      margin-bottom: 15px;
    }
    
    .global-dashboard .stats-header {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .global-dashboard .stat-item {
      font-size: 12px;
      padding: 4px 0;
    }
    
    .dashboard-footer {
      padding: 12px;
    }
    
    .impact-message {
      font-size: 12px;
    }
  }

  /* Mobile responsiveness for milestones */
  @media (max-width: 600px) {
    .milestone-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .milestone-total {
      text-align: left;
    }

    .milestone-name {
      font-size: 16px;
    }

    .current-progress {
      flex-direction: column;
      gap: 8px;
      text-align: center;
    }

    .progress-value {
      font-size: 16px;
    }

    .milestone-progress {
      flex-direction: column;
      gap: 10px;
    }

    .progress-text {
      text-align: center;
      min-width: auto;
    }
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
      font-size: 40px;
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
      padding: 10px 8px;
      font-size: 12px;
    }
    
    .terminal-line {
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .spinning-status, .status-text {
      margin-left: 5px;
    }
    
    .continue-prompt, .continue-prompt-empty {
      margin-top: 20px;
      font-size: 14px;
    }
    
    .games p {
      font-size: 14px;
    }
    
    .app-download .pixel-button {
      width: 80%;
    }
    
    /* Mobile quirkiest app styles */
    .quirkiest-app p {
      font-size: 14px;
    }
    
    /* Mobile wallet donation styles */
    .wallet-donation {
      margin: 15px 0;
    }
    
    .wallet-header {
      position: static;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 2px solid #0f0;
      margin-bottom: 0;
    }
    
    .wallet-header .wallet-info,
    .wallet-header .pol-info {
      font-size: 12px;
    }
    
    .wallet-header .disconnect-btn {
      font-size: 12px;
    }
    
    .donation-panel {
      padding: 15px;
      padding-top: 15px;
    }
    
    .donation-header {
      font-size: 16px;
      margin-bottom: 15px;
    }
    
    .target-address {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 15px;
    }
    
    .amount-input-row {
      flex-direction: column;
      gap: 10px;
    }
    
    .amount-input {
      width: 100%;
      font-size: 14px;
    }
    
    .max-btn {
      width: 100%;
      padding: 10px;
    }
    
    .preset-amounts {
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .preset-btn {
      flex: 1;
      margin: 0 5px;
    }
    
    .donate-btn {
      font-size: 14px;
      padding: 12px;
    }
    
    .transaction-hash {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
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