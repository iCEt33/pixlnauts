import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
// Import RainbowKit hooks
import { useAccount, useBalance, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther, formatUnits } from 'viem';
import QRCode from 'qrcode';
import { WalletProvider } from './WalletProvider';

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
    "PIXL-OS v2.6.9 - Environmental Monitoring System",
    "Copyright (C) 2021-2026, PIXLNAUTS Foundation",
    "--------------------------------------------",
    "CPU Type    : PIXL-CORE 1024 @ 3800 MHz",
    "Memory      : 8192 MB OK",
    "Storage     : 1024 TB OK",
    "\u00A0", // Non-breaking space for empty line
    "Boot Sequence Initialized - Application v0.0.1",
    "Copyright (C) 2026 PIXLNAUTS",
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
              const processingTime = 300 + Math.random() * 1500; // 300-1000ms
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
      const baseDelay = index * 400; // Delay between starting each new line
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
const ScrambleText = ({ text, speed = 50, finalDelay = 1000, intensity = 1.0, color, compact = false }) => {
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
    // Compact mode scrambles with letters/numbers only. The wide block and
    // symbol glyphs make the line wider than the final text, which can force
    // an extra wrap mid-animation and shove the content below up and down.
    if (compact) {
      return primaryChars.charAt(Math.floor(Math.random() * primaryChars.length));
    }
    const r = Math.random();
    if (r < 0.6) return primaryChars.charAt(Math.floor(Math.random() * primaryChars.length));
    if (r < 0.8) return symbolChars.charAt(Math.floor(Math.random() * symbolChars.length));
    return pixelChars.charAt(Math.floor(Math.random() * pixelChars.length));
  }, [compact]);

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
        <ScrambleText 
          text={progress >= 69 ? "LOADING: " : `LOADING: ${progress}%`} 
          speed={10} 
        />
        {progress >= 69 && <span>{progress}%</span>}
      </div>
      <div className="skip-prompt"></div>
    </div>
  );
};

// Updated Logo component with toggle functionality
const Logo = ({ focusKey }) => {
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
            key={`scramble-${scrambleKey}-${focusKey}`} // Key changes force remount and restart animation
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

// Donation history overlay (drawn over everything, paginated 10/page)
const DonationHistoryOverlay = ({ rows, walletAddress, onClose }) => {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return createPortal(
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <span className="history-title">
            <span className="prompt">&gt;&gt;&gt;</span> YOUR DONATION HISTORY
          </span>
          <button className="history-close-btn" onClick={onClose}>[CLOSE]</button>
        </div>
        <div className="history-wallet">
          WALLET: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
        </div>

        {rows.length === 0 ? (
          <div className="history-empty">NO DONATIONS FOUND FOR THIS WALLET.</div>
        ) : (
          <>
            <div className="history-list">
              {pageRows.map((row) => (
                <div key={row.hash} className={`history-row ${row.optimistic ? 'pending' : ''}`}>
                  <div className="history-row-top">
                    <span className="history-date">{new Date(row.date).toLocaleDateString()}</span>
                    <span className="history-amount">{row.amountPOL.toFixed(5)} POL</span>
                  </div>
                  <div className="history-row-bottom">
                    <span className="history-usd">
                      ${row.usdAtTime.toFixed(2)}{row.optimistic ? ' (EST)' : ''}
                    </span>
                    <a
                      className="tx-link"
                      href={row.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.hash.substring(0, 10)}...{row.hash.substring(56)}
                    </a>
                  </div>
                  {row.optimistic && (
                    <div className="history-pending-tag">PENDING CONFIRMATION</div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                >
                  [PREV]
                </button>
                <span className="page-indicator">PAGE {safePage + 1} / {totalPages}</span>
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                >
                  [NEXT]
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

// Wallet connection component with RainbowKit
const WalletDonation = () => {
  const { address, isConnected, chainId } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({
    address: address,
  });

  const balanceFormatted = balance ? formatUnits(balance.value, balance.decimals) : '0';
  
  const [donationAmount, setDonationAmount] = useState('0.00000');
  const [txHash, setTxHash] = useState('');
  
  const targetAddress = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';
  
  const { sendTransactionAsync, isPending: isTransacting } = useSendTransaction();
  const [txData, setTxData] = useState(null);
  const { isLoading: isWaitingForTx } = useWaitForTransactionReceipt({
    hash: txData,
    query: {
      enabled: !!txData,
    },
  });
  const { data: donationsData } = useDonations();
  const polPriceNow = donationsData?.polPriceNow || 0;
  const [pendingDonations, setPendingDonations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const lastSentAmountRef = useRef(null);

  // Handle transaction success/error with useEffect
  useEffect(() => {
    if (txData && !isWaitingForTx) {
      setTxHash(txData);
      setDonationAmount('0.00000');
      alert(`Transaction successful! Hash: ${txData}\n\nYou can view it on Polygonscan: https://polygonscan.com/tx/${txData}`);
    }
  }, [txData, isWaitingForTx]);

  // Optimistic row: show the just-sent donation the instant we have a hash
  useEffect(() => {
    if (!txData) return;
    const amt = lastSentAmountRef.current || 0;
    if (amt <= 0) return;
    setPendingDonations((prev) => {
      if (prev.some((p) => p.hash.toLowerCase() === txData.toLowerCase())) return prev;
      return [
        {
          hash: txData,
          from: (address || '').toLowerCase(),
          date: new Date().toISOString(),
          amountPOL: amt,
          usdAtTime: amt * polPriceNow,
          link: `https://polygonscan.com/tx/${txData}`,
          optimistic: true,
        },
        ...prev,
      ];
    });
  }, [txData, address, polPriceNow]);
  
  // Disconnect: tear down the wagmi connection and let the UI react (standard).
  const handleDisconnect = async () => {
    // Set skip-boot flag before disconnecting. We never reload ourselves, but
    // Coinbase reloads on its own — this makes that reload skip the boot screen.
    try {
      localStorage.setItem('skipBootUntil', String(Date.now() + 10000));
    } catch (e) {}
    try {
      await disconnectAsync();
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };
  
  // Set preset amount
  const setAmount = (amount) => {
    setDonationAmount(amount.toString());
  };
  
  // Set max amount (minus gas)
  const setMaxAmount = () => {
    const maxAmount = Math.max(0, parseFloat(balanceFormatted) - 0.01);
    setDonationAmount(maxAmount.toFixed(5));
  };
  
  // Handle donation transaction
  const handleDonate = async () => {
    if (!isConnected || parseFloat(donationAmount) <= 0) return;

    lastSentAmountRef.current = parseFloat(donationAmount);
    
    try {
      // If the wallet is on the wrong network, switch it to Polygon first.
      // Already on Polygon? This whole block is skipped — no prompt, no blocking.
      // If the switch is declined/fails, the catch below stops the send, so we
      // never fire on the wrong chain AND never block a user already on Polygon.
      if (chainId !== polygon.id) {
        await switchChainAsync({ chainId: polygon.id });
      }

      const hash = await sendTransactionAsync({
        to: targetAddress,
        value: parseEther(donationAmount),
        data: '0x',
      });
      setTxData(hash);
    } catch (error) {
      console.error('Transaction failed:', error);

      if (error.message?.includes('rejected') || error.name === 'UserRejectedRequestError') {
        alert('Transaction was rejected by user.');
      } else if (error.message?.includes('insufficient funds')) {
        alert('Transaction failed. You may have insufficient funds for gas fees.');
      } else if (error.message?.toLowerCase().includes('chain') || error.message?.toLowerCase().includes('network')) {
        alert('Please switch your wallet to the Polygon network and try again.');
      } else {
        alert(`Transaction failed: ${error.message || 'Unknown error'}`);
      }
    }
  };
  
  // Render connect button if not connected
  if (!isConnected) {
    return (
      <div className="wallet-connect">
        <div className="rainbow-connect-wrapper">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button 
                          onClick={openConnectModal} 
                          className="pixel-button wallet-connect-btn"
                        >
                          <span className="whitepaper-button-text">CONNECT WALLET</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
        <div className="wallet-info-text">
          <p>Connect your wallet to donate POL directly to PIXLNAUTS on Polygon network.</p>
        </div>
      </div>
    );
  }
  
  // Merge ledger rows for this wallet with optimistic pending, deduped by hash
  const me = (address || '').toLowerCase();
  const ledgerRows = (donationsData?.donations || []).filter((d) => d.from === me);
  const ledgerHashes = new Set(ledgerRows.map((r) => r.hash.toLowerCase()));
  const mergedHistory = [
    ...pendingDonations.filter((p) => !ledgerHashes.has(p.hash.toLowerCase())),
    ...ledgerRows,
  ];

  // Render donation interface if connected
  return (
    <div className="wallet-donation">
      <div className="wallet-header">
        <div className="wallet-info">
          <span className="wallet-label">WALLET:</span>
          <span className="wallet-address">{address?.substring(0, 6)}...{address?.substring(38)}</span>
        </div>
        <button onClick={handleDisconnect} className="disconnect-btn">[DISCONNECT]</button>
      </div>
      
      <div className="donation-panel">
        <div className="donation-header">
          <span className="prompt">&gt;&gt;&gt;</span>
          <span className="donation-title">DONATE POL TO PIXLNAUTS</span>
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
              max={balance?.formatted || '0'}
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
          disabled={isTransacting || isWaitingForTx || parseFloat(donationAmount) <= 0 || parseFloat(donationAmount) > parseFloat(balanceFormatted)}
        >
          {(isTransacting || isWaitingForTx) ? '[PROCESSING...]' : `[DONATE ${parseFloat(donationAmount || 0).toFixed(5)} POL]`}
        </button>
        
        <div className="available-balance">
          AVAILABLE: {parseFloat(balanceFormatted).toFixed(4)} POL
        </div>

        <button onClick={() => setShowHistory(true)} className="history-open-btn">
          [VIEW DONATION HISTORY]
        </button>

        {showHistory && (
          <DonationHistoryOverlay
            rows={mergedHistory}
            walletAddress={address || ''}
            onClose={() => setShowHistory(false)}
          />
        )}
        
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

const Tab = ({ title, children, isOpen, toggleTab, focusKey }) => {
  const tabRef = useRef(null);
  const clipRef = useRef(null);
  const contentRef = useRef(null);

  // Animate open/close with a measured height, then RELEASE the open panel to
  // height:auto + overflow:visible. Once it's auto/visible there is no clipping
  // mechanism left, so when content grows (QR drawing, wallet connecting) the
  // panel just grows with it — no re-measuring, which is what failed on mobile.
  useEffect(() => {
    const clip = clipRef.current;
    const content = contentRef.current;
    if (!clip || !content) return;

    if (isOpen) {
      clip.style.overflow = 'hidden';
      clip.style.height = `${content.scrollHeight}px`;

      let fallback;
      const release = (e) => {
        if (e && (e.target !== clip || e.propertyName !== 'height')) return;
        // Stay at explicit px height (not auto) so ResizeObserver can animate changes
        clip.style.overflow = 'visible';
        clip.removeEventListener('transitionend', release);
        clearTimeout(fallback);
      };
      clip.addEventListener('transitionend', release);
      fallback = setTimeout(release, 500);

      return () => {
        clip.removeEventListener('transitionend', release);
        clearTimeout(fallback);
      };
    }

    // closing
    const wasOpen = clip.style.height && clip.style.height !== '0px';
    clip.style.overflow = 'hidden';
    if (wasOpen) {
      clip.style.height = `${content.scrollHeight}px`;
      void clip.offsetHeight;
      clip.style.height = '0px';
    } else {
      clip.style.height = '0px';
    }
  }, [isOpen]);

  // Animate content height changes while the tab is already open
  useEffect(() => {
    const clip = clipRef.current;
    const content = contentRef.current;
    if (!clip || !content || !isOpen) return;

    const observer = new ResizeObserver(() => {
      // Only animate if we're in the "settled open" state (overflow is visible)
      if (clip.style.overflow === 'visible') {
        clip.style.overflow = 'hidden';
        clip.style.height = `${content.scrollHeight}px`;
        // Release back to visible after the transition
        const onDone = (e) => {
          if (e && (e.target !== clip || e.propertyName !== 'height')) return;
          clip.style.overflow = 'visible';
          clip.removeEventListener('transitionend', onDone);
        };
        clip.addEventListener('transitionend', onDone);
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [isOpen]);

  // Scroll the opened header into view.
  useEffect(() => {
    if (!isOpen || !tabRef.current) return;
    const t = setTimeout(() => {
      if (!tabRef.current) return;
      const rect = tabRef.current.getBoundingClientRect();
      const topOffset = 140;
      if (rect.top < topOffset || rect.top > window.innerHeight * 0.3) {
        window.scrollTo({ top: window.scrollY + rect.top - topOffset, behavior: 'smooth' });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <div className={`tab ${isOpen ? 'open' : 'closed'}`} ref={tabRef}>
      <div className="tab-header" onClick={toggleTab}>
        <div className={`play-icon ${isOpen ? 'playing' : ''}`}>▶</div>
        <ScrambleText text={title} speed={30} intensity={0.8} key={`tab-${title}-${focusKey}`} />
      </div>
      <div className="tab-content-wrapper">
        <div className="tab-content-clip" ref={clipRef}>
          <div className="tab-content" ref={contentRef}>{children}</div>
        </div>
      </div>
    </div>
  );
};

// Introduction tab content
const IntroductionTab = ({ focusKey }) => {
  return (
    <div className="introduction">
      <div className="video-container">
        <iframe 
          width="100%" 
          height="315" 
          src="https://www.youtube.com/embed/WF31W8mmDFw" 
          title="PIXLNAUTS Introduction Video"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
      <p>
        <ScrambleText 
          text="Welcome to PIXLNAUTS, an innovative environmental project that uses blockchain technology to drive positive change." 
          speed={10} 
          key={`intro-1-${focusKey}`}
        />
      </p>
      <p>
        <ScrambleText 
          text="Check out our whitepaper for more details on our vision and roadmap." 
          speed={10} 
          key={`intro-2-${focusKey}`}
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
const SocialsTab = ({ focusKey }) => {
  return (
    <div className="socials">
      <p>
        <ScrambleText 
          text="Join our community! Follow PIXLNAUTS on social media to stay up to date with our environmental initiatives." 
          speed={10} 
          key={`socials-1-${focusKey}`}
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
const GamesTab = ({ focusKey }) => {
  return (
    <div className="games">
      <p>
        <ScrambleText 
          text="Try our concept beta games! Experience these exciting PIXLNAUTS titles:" 
          speed={10} 
          compact
          key={`games-1-${focusKey}`}
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
const BeeboCustomizerTab = ({ onLaunch, focusKey }) => {
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
              key={`beebo-1-${focusKey}`}
            />
          </p>
          <p className="mobile-notice">
            <ScrambleText 
              text="This feature is not available on mobile devices. Please use a computer to access the full 3D customizer experience." 
              speed={10}
              color="#ff5" 
              key={`beebo-2-${focusKey}`}
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
              key={`beebo-3-${focusKey}`}
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
        <a href="https://discord.com/oauth2/authorize?client_id=1284849644345626664" target="_blank" rel="noopener noreferrer" className="pixel-button discord-button">
          <span className="whitepaper-button-text">INVITE BEEBO TO YOUR DISCORD SERVER!</span>
        </a>
      </div>
      
      <div className="beebo-community-section">
        <p>
          <ScrambleText 
            text="Want to submit your own ideas or assets for the B-b0 customizer? Navigate to the SOCIALS tab to find our Discord community!" 
            speed={10} 
            key={`beebo-4-${focusKey}`}
          />
        </p>
        <p>
          <ScrambleText 
            text="For those interested in the physical version, check out our open source Project: Mango" 
            speed={10} 
            key={`beebo-5-${focusKey}`}
          />
        </p>
        <div className="beebo-links">
          <a href="https://github.com/iCEt33/beebo-robot" target="_blank" rel="noopener noreferrer" className="pixel-button mango-button">
            <span className="whitepaper-button-text">PROJECT: MANGO (OPEN SOURCE)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

// Receive-POL QR for direct donations (no wallet connection needed)
const DONATION_WALLET = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';

const PolDonationQR = () => {
  const canvasRef = useRef(null);
  const [qrError, setQrError] = useState(false);

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(DONATION_WALLET);

  useEffect(() => {
    if (!isValidAddress || !canvasRef.current) {
      setQrError(true);
      return;
    }
    QRCode.toCanvas(
      canvasRef.current,
      DONATION_WALLET,
      {
        width: 260,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#00ff00', light: '#000000' },
      },
      (err) => {
        if (err) {
          console.error('QR render failed:', err);
          setQrError(true);
        } else {
          setQrError(false);
        }
      }
    );
  }, [isValidAddress]);

  return (
    <div className="pol-qr">
      <div className="pol-qr-title">
        <span>&gt;&gt;&gt;</span> SCAN TO DONATE POL
      </div>

      <div className="pol-qr-frame">
        {qrError ? (
          <div className="pol-qr-fallback">QR UNAVAILABLE</div>
        ) : (
          <canvas ref={canvasRef} className="pol-qr-canvas" />
        )}
      </div>

      <div className="pol-qr-warning">
        <div className="pol-qr-warning-main">⚠ POLYGON NETWORK ONLY</div>
        <div className="pol-qr-warning-sub">
          Other tokens or networks may be lost permanently.
        </div>
      </div>
    </div>
  );
};

// Support Us tab content
const SupportUsTab = ({ focusKey }) => {
  return (
    <div className="support-us">
      <PolDonationQR />

      <p>
        <ScrambleText 
          text="Support PIXLNAUTS environmental initiatives through these platforms:" 
          speed={10} 
          compact
          key={`support-1-${focusKey}`}
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
const QuirkiestAppTab = ({ focusKey }) => {
  return (
    <div className="quirkiest-app">
      <div className="app-description">
        <p>Need a reliable way to track your thoughts, schedule reminders, and stay in sync across global time zones?</p>
        <p>Want precise, up-to-the-minute lunar phase information at your fingertips?</p>
        <p>Introducing our all-in-one Smart Clock app for Android – your digital companion that combines elegant time management with powerful productivity tools.</p>
        <p>Stay organized, connected, and informed with our pixel-perfect interface.</p>
        <p>Download now and transform how you experience time!</p>
        <p>GET THE LATEST VERSION SmartClock v4.3 NOW!!!</p>
      </div>
      <div className="app-download">
        <a href="/downloads/smartclockv4.3.apk" download className="pixel-button">
          <span className="whitepaper-button-text">DOWNLOAD APK</span>
        </a>
        <a href="https://play.google.com/store/apps/details?id=com.pixelnauts.smartclock" target="_blank" rel="noopener noreferrer" className="pixel-button">
          <span className="whitepaper-button-text">GET FROM PLAY STORE</span>
        </a>
      </div>
    </div>
  );
};

// PxP Flip tab content
const PxPFlipTab = ({ focusKey }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSystemHealth, setEmailSystemHealth] = useState('checking');

  const APPS_SCRIPT_URL = process.env.REACT_APP_APPS_SCRIPT_URL;

  // Check Apps Script health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'GET',
        });
        const text = await response.text();
        if (text.includes('PxP Flip Waitlist API is running')) {
          setEmailSystemHealth('healthy');
        } else {
          setEmailSystemHealth('down');
        }
      } catch (error) {
        setEmailSystemHealth('down');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [APPS_SCRIPT_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email');
      return;
    }
    
    setStatus('loading');
    setIsSubmitting(true);
    setMessage('');
    
    let emailSent = false;
    const token = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    try {
      // Try to send email via Apps Script
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ email, token })
        });
        emailSent = true;
        setEmailSystemHealth('healthy');
      } catch (emailError) {
        console.log('Email failed, continuing...');
        setEmailSystemHealth('down');
      }
      
      // ALWAYS save to sheet via Vercel (bulletproof)
      const response = await fetch('/api/pxp-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, timestamp, emailSent })
      });
      
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to save');
      
      setStatus('success');
      setMessage(emailSent ? 'Check your email! (including spam)' : "You're on the waitlist!");
      setEmail('');
      
      setTimeout(() => {
        setStatus('');
        setMessage('');
      }, 5000);
      
    } catch (error) {
      setStatus('error');
      setMessage('Connection failed. Try again.');
      console.error('Signup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHealthIndicator = () => {
    switch(emailSystemHealth) {
      case 'checking':
        return <span className="health-indicator checking">⚪ Checking email system...</span>;
      case 'healthy':
        return <span className="health-indicator healthy">🟢 Email system operational</span>;
      case 'down':
        return <span className="health-indicator down">🔴 Email system down, signups still saved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="pxp-flip">
      <div className="pxp-description">
        <p>
          <ScrambleText 
            text="Remember when phones were just phones?" 
            speed={10} 
            key={`pxp-1-${focusKey}`}
          />
        </p>
        <p>
          <ScrambleText 
            text="PxP Flip is a hardware wallet disguised as a flip phone." 
            speed={10} 
            key={`pxp-2-${focusKey}`}
          />
        </p>
        <p>
          <ScrambleText 
            text="Calls, texts, the satisfying snap shut." 
            speed={10} 
            key={`pxp-3-${focusKey}`}
          />
        </p>
        <p className="pxp-tagline">
          <ScrambleText 
            text="The phone you wanted back. The future is stuck in 2005." 
            speed={10} 
            key={`pxp-4-${focusKey}`}
          />
        </p>
      </div>

      <div className="pxp-waitlist-section">
        <div className="pxp-system-health">
          {getHealthIndicator()}
        </div>
        
        <form onSubmit={handleSubmit} className="pxp-waitlist-form">
          <div className="pxp-form-group">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="pxp-email-input"
              disabled={isSubmitting}
              required
            />
            <button 
              type="submit" 
              className="pixel-button pxp-submit-btn"
              disabled={isSubmitting}
            >
              <span className="whitepaper-button-text">
                {status === 'loading' ? 'JOINING...' : 'JOIN WAITLIST'}
              </span>
            </button>
          </div>
          {message && (
            <div className={`pxp-status-message ${status}`}>
              <ScrambleText text={message} speed={15} />
            </div>
          )}
        </form>
      </div>

      <div className="pxp-learn-more">
        <a 
          href="https://pixelnauts.gitbook.io/pixel-cryptonauts-whitepaper/pixelnauts/future-plans/pxp-flip" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="pixel-button"
        >
          <span className="whitepaper-button-text">LEARN MORE</span>
        </a>
      </div>
    </div>
  );
};

// Donation Milestones tab content
const DonationMilestonesTab = ({ currentUsdValue, focusKey }) => {
  const milestones = [
    { name: "3D Printer", amount: 500, selfFunded: 500, description: "Physical prototyping capabilities" },
    { name: "Flip Phone", amount: 30, selfFunded: 0, description: "PCB & turnkey cost TBD" },
    { name: "Mango Cube", amount: 150, selfFunded: 0, description: "Portable AI cube" },
    { name: "Project: Cosmos alpha release", amount: 3200, selfFunded: 0, description: "Blockchain integration, multiplayer, UGS backend, performance optimizations" },
    { name: "Coming Soon", amount: null, selfFunded: 0, description: "Future milestone to be announced" }
  ];

  // Calculate cumulative totals and status for each milestone
  const processedMilestones = [];
  let remainingDonations = currentUsdValue; // Track how much donation money is left to allocate

  milestones.forEach((milestone, index) => {
    if (milestone.amount === null) {
      processedMilestones.push({
        ...milestone,
        cumulativeTotal: 0,
        status: 'locked',
        progress: 0,
        isComingSoon: true
      });
      return;
    }

    const selfFunded = milestone.selfFunded || 0;
    const neededFromDonations = Math.max(0, milestone.amount - selfFunded);
    
    // How much of the remaining donations goes to this milestone
    const donationsAllocated = Math.min(remainingDonations, neededFromDonations);
    const totalFunded = selfFunded + donationsAllocated;
    
    // Calculate progress and status
    const progress = Math.min(100, (totalFunded / milestone.amount) * 100);
    let status;
    
    if (totalFunded >= milestone.amount) {
      status = 'completed';
      // Subtract what we used and let the rest spill over
      remainingDonations -= donationsAllocated;
    } else if (donationsAllocated > 0 || selfFunded > 0) {
      status = 'in-progress';
      // Use up all remaining donations for this incomplete milestone
      remainingDonations = 0;
    } else {
      status = 'locked';
    }

    processedMilestones.push({
      ...milestone,
      cumulativeTotal: milestone.amount,
      status,
      progress,
      donationsAllocated,
      totalFunded
    });
  });

  return (
    <div className="donation-milestones">
      <div className="milestones-header">
        <p>
          <ScrambleText 
            text="Track our progress towards key development milestones funded by community donations." 
            speed={10} 
            key={`milestones-1-${focusKey}`}
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
const TabsManager = ({ openCustomizer, currentUsdValue, focusKey }) => {
  const [openTab, setOpenTab] = useState(null);

  // Open the Introduction tab with a short delay so the animation plays visibly
  useEffect(() => {
    const t = setTimeout(() => setOpenTab(0), 400);
    return () => clearTimeout(t);
  }, []);
  
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
        focusKey={focusKey}
      >
        <IntroductionTab focusKey={focusKey} />
      </Tab>
      <Tab 
        title="SOCIALS" 
        isOpen={openTab === 1} 
        toggleTab={() => toggleTab(1)}
        focusKey={focusKey}
      >
        <SocialsTab focusKey={focusKey} />
      </Tab>
      <Tab 
        title="ASTRONAUT TRAINING PROGRAM" 
        isOpen={openTab === 2} 
        toggleTab={() => toggleTab(2)}
        focusKey={focusKey}
      >
        <GamesTab focusKey={focusKey} />
      </Tab>
      <Tab 
        title="BUILD-A-BEEBO" 
        isOpen={openTab === 3} 
        toggleTab={() => toggleTab(3)}
        focusKey={focusKey}
      >
        <BeeboCustomizerTab onLaunch={openCustomizer} focusKey={focusKey} />
      </Tab>
      <Tab 
        title="THE QUIRKIEST USELESS APP" 
        isOpen={openTab === 4} 
        toggleTab={() => toggleTab(4)}
        focusKey={focusKey}
      >
        <QuirkiestAppTab focusKey={focusKey} />
      </Tab>
      <Tab 
        title="PXP FLIP" 
        isOpen={openTab === 5} 
        toggleTab={() => toggleTab(5)}
        focusKey={focusKey}
      >
        <PxPFlipTab focusKey={focusKey} />
      </Tab>
      <Tab 
        title="DONATION MILESTONES" 
        isOpen={openTab === 6} 
        toggleTab={() => toggleTab(6)}
        focusKey={focusKey}
      >
        <DonationMilestonesTab currentUsdValue={currentUsdValue} focusKey={focusKey} />
      </Tab>
      <Tab 
        title="SUPPORT US" 
        isOpen={openTab === 7} 
        toggleTab={() => toggleTab(7)}
        focusKey={focusKey}
      >
        <SupportUsTab focusKey={focusKey} />
      </Tab>
    </div>
  );
};

// Footer component
const Footer = ({ focusKey }) => {
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
          compact
          key={`footer-auth-${focusKey}`}
        />
      </div>
      <div className="secret-message">
        <ScrambleText 
          text="If you found the loading screens to be too long, they are completely skippable. Just press any button it doesn't matter. I just wanted you to experience it at least one time before letting you know this :D" 
          speed={200}
          intensity={0.5}
          key={`footer-secret-${focusKey}`}
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
const GlobalDashboard = ({ onUsdValueChange, focusKey }) => {
  const { data } = useDonations();
  const { address, isConnected } = useAccount();

  // Display state for the cycling panels (unchanged behaviour)
  const [leftViewIndex, setLeftViewIndex] = useState(0);
  const [rightViewIndex, setRightViewIndex] = useState(0);
  const [isLeftHighlighted, setIsLeftHighlighted] = useState(false);
  const [isRightHighlighted, setIsRightHighlighted] = useState(false);
  const [isLeftHovered, setIsLeftHovered] = useState(false);
  const [isRightHovered, setIsRightHovered] = useState(false);
  const cycleIntervalRef = useRef(null);

  const walletAddress = address || '';
  const polPrice = data?.polPriceNow || 0;
  const lastUpdated = data ? new Date(data.updatedAt) : 'LOADING...';

  // Global stats, shaped exactly how the render code below already expects
  const stats = useMemo(() => {
    if (!data) return { totalDonations: 0, totalAmount: 0, totalUsd: 0, carbonOffset: 0, topDonors: [], loading: true };
    return {
      totalDonations: data.totals.count,
      totalAmount: data.totals.totalPOL,
      totalUsd: data.totals.totalUsd,
      carbonOffset: data.totals.co2MetricTons,
      topDonors: data.topDonors.map(d => ({ address: d.address, amount: d.amountPOL })),
      loading: false,
    };
  }, [data]);

  // Per-user stats, derived from the same payload filtered to the connected wallet
  const userStats = useMemo(() => {
    if (!data || !address) return { userAmount: 0, userUsd: 0, userCo2: 0, userRank: 0, loading: !data };
    const me = address.toLowerCase();
    const myRows = data.donations.filter(d => d.from === me);
    const userAmount = myRows.reduce((s, r) => s + r.amountPOL, 0);
    const userUsd = myRows.reduce((s, r) => s + r.usdAtTime, 0);
    // CO2 is computed from the unrounded USD (1 USD worth = 1 tree-equivalent),
    // not the floored tree count, so sub-dollar donations still show CO2 instead
    // of rounding to zero. Keep 10 in sync with CO2_KG_PER_TREE on the server.
    const userCo2 = (userUsd * 10) / 1000;

    const byDonor = new Map();
    for (const d of data.donations) byDonor.set(d.from, (byDonor.get(d.from) || 0) + d.amountPOL);
    const sorted = [...byDonor.entries()].sort((a, b) => b[1] - a[1]);
    const userRank = sorted.findIndex(([addr]) => addr === me) + 1;

    return { userAmount, userUsd, userCo2, userRank, loading: false };
  }, [data, address]);

  // When disconnected, the left panel only shows the global view
  useEffect(() => { if (!isConnected) setLeftViewIndex(0); }, [isConnected]);

  // Auto-cycle panels every 10 seconds
  useEffect(() => {
    cycleIntervalRef.current = setInterval(() => {
      if (isConnected && !isLeftHovered) {
        setIsLeftHighlighted(true);
        setTimeout(() => {
          setIsLeftHighlighted(false);
          setLeftViewIndex(prev => prev === 0 ? 1 : 0);
        }, 500);
      }
      const delay = isConnected && !isLeftHovered ? 1500 : 0;
      setTimeout(() => {
        if (!isRightHovered) {
          setIsRightHighlighted(true);
          setTimeout(() => {
            setIsRightHighlighted(false);
            setRightViewIndex(prev => prev === 0 ? 1 : 0);
          }, 500);
        }
      }, delay);
    }, 10000);
    return () => clearInterval(cycleIntervalRef.current);
  }, [isConnected, isLeftHovered, isRightHovered]);

  // Emit total donated USD (historical) to the parent, for the milestones tab
  useEffect(() => {
    if (onUsdValueChange && data) onUsdValueChange(data.totals.totalUsd);
  }, [data, onUsdValueChange]);

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

  const renderLeftPanel = () => {
    const isGlobalView = leftViewIndex === 0;
    const isLoading = isGlobalView ? stats.loading : userStats.loading;

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
                <span className="stat-value">{isLoading ? 'LOADING...' : `$${stats.totalUsd.toFixed(2)}`}</span>
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
                <span className="stat-value">{isLoading ? 'LOADING...' : `$${userStats.userUsd.toFixed(2)}`}</span>
              </div>
              <div className="stat-item carbon-impact">
                <span className="stat-label">YOUR CO2 OFFSET:</span>
                <span className="stat-value">{isLoading ? 'LOADING...' : `${userStats.userCo2.toFixed(3)} METRIC TONS`}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

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
          <span>PIXLNAUTS GLOBAL IMPACT</span>
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
            compact
            key={`dashboard-impact-${focusKey}`}
          />
        </div>
      </div>
    </div>
  );
};

// Main component
const App = () => {
  const [currentState, setCurrentState] = useState(() => {
    // Skip the boot sequence if we disconnected within the last few seconds.
    // A timestamp window (not a one-shot flag) survives wallets that reload the
    // page more than once on disconnect, so the boot screen doesn't replay.
    try {
      const skipUntil = parseInt(localStorage.getItem('skipBootUntil') || '0', 10);
      if (Date.now() < skipUntil) {
        return 'content'; // within the window — keep the flag so extra reloads skip too
      }
      if (skipUntil) localStorage.removeItem('skipBootUntil'); // stale — clean up
    } catch (e) {
      // localStorage unavailable; just boot normally
    }
    return 'systemCheck'; // Normal boot sequence
  });
  const [tabsVisible] = useState(true); 
  const [showContent, setShowContent] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [currentUsdValue, setCurrentUsdValue] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  
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
    window.scrollTo(0, 0);
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setFocusKey(prev => prev + 1);
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
      <Logo focusKey={focusKey} />
      <div className={`tabs-section ${tabsVisible ? 'open' : 'closed'}`}>
        <TabsManager openCustomizer={handleOpenCustomizer} currentUsdValue={currentUsdValue} focusKey={focusKey} />
      </div>
      <GlobalDashboard onUsdValueChange={setCurrentUsdValue} focusKey={focusKey} />
      <Footer focusKey={focusKey} />
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
    background-color: #111;
    border-left: 4px solid #555;
    border-right: 4px solid #555;
    border-bottom: 4px solid #555;
  }

  .tab.open .tab-content-wrapper {
    border-color: #0f0;   /* keep your green-when-open border; drop grid-template-rows: 1fr */
  }

  .tab-content-clip {
    height: 0;
    overflow: hidden;
    transition: height 0.4s ease-in-out;
  }

  .tab-content {
    padding: 20px;
    background-color: #111;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .tab.open .tab-content {
    opacity: 1;
    transition: opacity 0.25s ease 0.4s;   /* the 0.4s delay = wait for the frame to finish opening */
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

  /* RainbowKit custom styling */
  .rainbow-connect-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  /* Override RainbowKit button to match our pixel theme */
  .rainbow-connect-wrapper button {
    background-color: #0f0 !important;
    color: #000 !important;
    border: none !important;
    font-family: 'PixelFont', monospace !important;
    font-weight: bold !important;
    font-size: 18px !important;
    letter-spacing: 1px !important;
    padding: 15px 30px !important;
    box-shadow: 4px 4px 0 #086 !important;
    clip-path: polygon(
      0 0, 
      100% 0, 
      100% calc(100% - 4px), 
      calc(100% - 4px) 100%, 
      0 100%
    ) !important;
    transition: all 0.2s ease !important;
    image-rendering: pixelated !important;
  }

  .rainbow-connect-wrapper button:hover {
    background-color: #0c0 !important;
    transform: translate(2px, 2px) !important;
    box-shadow: 2px 2px 0 #086 !important;
  }

  .rainbow-connect-wrapper button:active {
    transform: translate(4px, 4px) !important;
    box-shadow: none !important;
  }

  /* Mango button styling */
  .mango-button {
    background-color: #ff8c00 !important;
    box-shadow: 4px 4px 0 #cc7000 !important;
  }

  .mango-button:hover {
    background-color: #ffa500 !important;
    box-shadow: 2px 2px 0 #cc7000 !important;
  }

  /* Discord button styling */
  .discord-button {
    background-color: #7289da !important;
    box-shadow: 4px 4px 0 #5b6eae !important;
  }

  .discord-button:hover {
    background-color: #8ea1e1 !important;
    box-shadow: 2px 2px 0 #5b6eae !important;
  }

  .discord-button .whitepaper-button-text {
    color: #fff !important;
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
    max-height: 6969px;
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
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 30px;
  }
  
  .app-download .pixel-button {
    position: relative;
    overflow: hidden;
  }

  .app-download .pixel-button:last-child::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg, 
      rgba(0, 255, 0, 0) 0%,
      rgba(0, 255, 0, 0.6) 50%,
      rgba(0, 255, 0, 0) 100%
    );
    animation: shimmer 2s infinite linear;
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
    color: #f55;
    cursor: pointer;
    font-family: monospace;
    font-size: 14px;
    padding: 2px 4px;
  }

  .disconnect-btn:hover {
    color: #f88;
    text-shadow: 0 0 5px rgba(255, 85, 85, 0.6);
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
    border-left: 4px solid #aa00ff;
  }

  .global-dashboard .right-panel.leaderboard-panel {
    border-left: 4px solid #fff;
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

  /* PxP Flip tab styles */
  .pxp-flip {
    color: #0f0;
  }

  .pxp-description {
    margin-bottom: 30px;
  }

  .pxp-description p {
    line-height: 1.6;
    margin-bottom: 15px;
    font-size: 16px;
    text-shadow: 0 0 3px #0f03;
    color: #0f0;
  }

  .pxp-tagline {
    margin-top: 25px;
    font-weight: bold;
    font-size: 18px;
    text-align: center;
    padding: 15px;
    border: 2px solid #0f0;
    background-color: rgba(0, 50, 0, 0.3);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }

  .pxp-waitlist-section {
    margin: 40px 0;
    padding: 30px;
    border: 4px solid #0f0;
    background-color: rgba(0, 20, 0, 0.3);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  }

  .pxp-waitlist-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .pxp-form-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    width: 100%;
    max-width: 500px;
  }

  .pxp-email-input {
    width: 100%;
    background-color: #111;
    border: 2px solid #0f0;
    color: #0f0;
    padding: 12px 15px;
    font-family: monospace;
    font-size: 16px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .pxp-email-input:focus {
    outline: none;
    border-color: #5f5;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }

  .pxp-email-input::placeholder {
    color: #555;
    font-style: italic;
  }

  .pxp-email-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pxp-submit-btn {
    width: 100%;
    max-width: 300px;
    background-color: #fff !important;
    box-shadow: 4px 4px 0 #999 !important;
  }

  .pxp-submit-btn:hover:not(:disabled) {
    background-color: #eee !important;
    box-shadow: 2px 2px 0 #999 !important;
  }

  .pxp-submit-btn:active:not(:disabled) {
    box-shadow: none !important;
  }

  .pxp-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #555 !important;
    box-shadow: 4px 4px 0 #333 !important;
  }

  .pxp-status-message {
    padding: 10px 20px;
    border-radius: 0;
    font-family: monospace;
    font-size: 14px;
    text-align: center;
    animation: fadeIn 0.3s ease;
  }

  .pxp-status-message.success {
    color: #0f0;
    border: 2px solid #0f0;
    background-color: rgba(0, 50, 0, 0.5);
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
  }

  .pxp-status-message.error {
    color: #f55;
    border: 2px solid #f55;
    background-color: rgba(50, 0, 0, 0.5);
    text-shadow: 0 0 5px rgba(255, 85, 85, 0.7);
  }

  .pxp-learn-more {
    display: flex;
    justify-content: center;
    margin-top: 30px;
  }

  .pxp-system-health {
    text-align: center;
    margin-bottom: 15px;
    font-family: monospace;
    font-size: 12px;
  }

  .health-indicator {
    display: inline-block;
    padding: 5px 10px;
    border-radius: 0;
    font-weight: bold;
  }

  .health-indicator.checking {
    color: #aaa;
  }

  .health-indicator.healthy {
    color: #0f0;
  }

  .health-indicator.down {
    color: #f55;
  }

  /* Mobile responsive for PxP Flip */
  @media (max-width: 768px) {
    .pxp-description p {
      font-size: 14px;
    }

    .pxp-tagline {
      font-size: 16px;
      padding: 12px;
    }

    .pxp-waitlist-section {
      padding: 20px;
      margin: 30px 0;
    }

    .pxp-email-input {
      font-size: 14px;
      padding: 10px 12px;
    }
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
      transition: grid-template-rows 0.4s ease-in-out;
    }
    
    /* Add some extra space at the bottom of tab content on mobile */
    .tab-content {
      padding-bottom: 20px;
    }
  }

  /* Donation history button + overlay */
  .history-open-btn {
    display: block;
    width: 100%;
    margin-top: 12px;
    background: none;
    border: 2px solid #0f0;
    color: #0f0;
    font-family: monospace;
    font-weight: bold;
    font-size: 14px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .history-open-btn:hover {
    background-color: rgba(0, 255, 0, 0.1);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.4);
  }

  .history-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.92);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  .history-modal {
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    background-color: #000;
    border: 4px solid #0f0;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
    padding: 20px;
    display: flex;
    flex-direction: column;
    font-family: monospace;
    color: #0f0;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 2px solid #0f0;
  }

  .history-title {
    font-weight: bold;
    font-size: 16px;
  }

  .history-close-btn {
    background: none;
    border: none;
    color: #f55;
    font-family: monospace;
    font-size: 14px;
    cursor: pointer;
  }

  .history-close-btn:hover {
    color: #f88;
    text-shadow: 0 0 5px rgba(255, 85, 85, 0.6);
  }

  .history-wallet {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 15px;
    word-break: break-all;
  }

  .history-empty {
    text-align: center;
    padding: 40px 0;
    opacity: 0.7;
  }

  .history-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .history-row {
    border: 1px solid #333;
    border-left: 3px solid #0f0;
    padding: 10px 12px;
    background-color: #0a0a0a;
  }

  .history-row.pending {
    border-left-color: #ff5;
    background-color: rgba(40, 40, 0, 0.2);
  }

  .history-row-top,
  .history-row-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .history-row-top {
    margin-bottom: 6px;
  }

  .history-date {
    color: #0f0;
    font-weight: bold;
    font-size: 13px;
  }

  .history-amount {
    color: #fff;
    font-size: 14px;
  }

  .history-usd {
    color: #5f5;
    font-size: 13px;
  }

  .history-pending-tag {
    margin-top: 6px;
    font-size: 11px;
    color: #ff5;
    opacity: 0.9;
  }

  .history-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 2px solid #333;
  }

  .page-btn {
    background: none;
    border: 2px solid #0f0;
    color: #0f0;
    font-family: monospace;
    font-weight: bold;
    font-size: 13px;
    padding: 6px 12px;
    cursor: pointer;
  }

  .page-btn:hover:not(:disabled) {
    background-color: rgba(0, 255, 0, 0.1);
  }

  .page-btn:disabled {
    border-color: #444;
    color: #444;
    cursor: not-allowed;
  }

  .page-indicator {
    font-size: 13px;
  }

  /* Receive-POL QR (direct donation, no wallet connect) */
  .pol-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 30px;
    padding: 25px 20px;
    border: 4px solid #0f0;
    background-color: rgba(0, 20, 0, 0.3);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  }

  .pol-qr-title {
    color: #aa00ff;
    font-weight: bold;
    font-size: 18px;
    font-family: monospace;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(170, 0, 255, 0.5);
  }

  .pol-qr-frame {
    background-color: #000;
    padding: 12px;
    border: 2px solid #0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 284px;
    min-height: 284px;
  }

  .pol-qr-canvas {
    display: block;
  }

  .pol-qr-fallback {
    color: #0f0;
    font-family: monospace;
    font-weight: bold;
    width: 260px;
    height: 260px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .pol-qr-warning {
    text-align: center;
    padding: 12px 14px;
    border: 2px solid #f55;
    background-color: rgba(50, 0, 0, 0.4);
    max-width: 380px;
  }

  .pol-qr-warning-main {
    color: #f55;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(255, 85, 85, 0.6);
    margin-bottom: 8px;
  }

  .pol-qr-warning-sub {
    color: #f88;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 600px) {
    .pol-qr-frame {
      min-width: 0;
      min-height: 0;
      width: 100%;
    }

    .pol-qr-canvas {
      width: 100% !important;
      height: auto !important;
      max-width: 260px;
    }
  }
`;

// Add the styles to the document
const StyleSheet = () => {
  return <style>{styles}</style>;
};

// ---- Donations data layer: one fetch of /api/donations, shared app-wide ----
const DonationsContext = createContext({ data: null, loading: true, error: null, refetch: () => {} });
const useDonations = () => useContext(DonationsContext);

// Rich sample data for local UI work (npm start can't run the api/ function). Shape matches /api/donations.
const MOCK_DONATIONS = {
  updatedAt: Date.now(),
  polPriceNow: 0.077,
  totals: { count: 5, totalPOL: 195, totalUsd: 47.35, trees: 47, co2MetricTons: 0.987 },
  topDonors: [
    { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', amountPOL: 100 },
    { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', amountPOL: 62 },
    { address: '0xcccccccccccccccccccccccccccccccccccccccc', amountPOL: 33 },
  ],
  donations: [
    { hash: '0xmock1', from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', date: '2025-08-01T10:00:00.000Z', amountPOL: 50, usdAtTime: 12.5, trees: 12, link: 'https://polygonscan.com/tx/0xmock1' },
    { hash: '0xmock2', from: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', date: '2025-07-15T10:00:00.000Z', amountPOL: 100, usdAtTime: 24, trees: 24, link: 'https://polygonscan.com/tx/0xmock2' },
    { hash: '0xmock3', from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', date: '2025-06-10T10:00:00.000Z', amountPOL: 12, usdAtTime: 3.1, trees: 3, link: 'https://polygonscan.com/tx/0xmock3' },
    { hash: '0xmock4', from: '0xcccccccccccccccccccccccccccccccccccccccc', date: '2025-05-20T10:00:00.000Z', amountPOL: 25, usdAtTime: 5.75, trees: 5, link: 'https://polygonscan.com/tx/0xmock4' },
    { hash: '0xmock5', from: '0xcccccccccccccccccccccccccccccccccccccccc', date: '2025-04-02T10:00:00.000Z', amountPOL: 8, usdAtTime: 2.0, trees: 2, link: 'https://polygonscan.com/tx/0xmock5' },
  ],
};

const FORCE_MOCK = false; // flip to true to force the mock locally; ignored in production builds

const DonationsProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (process.env.NODE_ENV === 'development' && FORCE_MOCK) {
      setData(MOCK_DONATIONS); setError(null); setLoading(false); return;
    }
    try {
      const res = await fetch('/api/donations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      // npm start doesn't run api/ functions, so /api/donations returns index.html and res.json() throws.
      // In dev, fall back to the mock instead of spinning forever.
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock donations (dev fallback):', e.message);
        setData(MOCK_DONATIONS); setError(null);
      } else {
        console.error('Failed to load /api/donations:', e);
        setError(e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <DonationsContext.Provider value={{ data, loading, error, refetch }}>
      {children}
    </DonationsContext.Provider>
  );
};

// Wrap everything together
const PixlnautsWebsite = () => {
  return (
    <WalletProvider>
      <StyleSheet />
      <DonationsProvider>
        <App />
      </DonationsProvider>
    </WalletProvider>
  );
};

export default PixlnautsWebsite;