import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'qr-scanner';
import type { ScanResult as QrScannerScanResult } from 'qr-scanner';
import { getLocalDateString } from "@/lib/dateUtils";

interface QRScannerProps {
  onClose: () => void;
}

const QRScannerComponent = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    console.log('cleanup: Called');
    
    // Clear health check timer
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
    
    // Stop the QR scanner
    if (qrScannerRef.current) {
      try {
        console.log('cleanup: Destroying QrScanner instance.');
        qrScannerRef.current.destroy();
      } catch (err) {
        console.warn('cleanup: Error destroying scanner:', err);
      }
      qrScannerRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      console.log('cleanup: Stopping media tracks.');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video src
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    console.log('cleanup: Finished.');
  }, []);

  const handleScan = useCallback(async (qrData: string) => {
    if (scanInProgress || !mountedRef.current) {
      console.log('handleScan: Scan in progress or component unmounted, ignoring scan');
      return;
    }

    console.log(`handleScan: Called at ${new Date().toISOString()} with data: '${qrData}'`);
    setScanInProgress(true);

    // Pause scanner temporarily
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.pause();
      } catch (pauseError) {
        console.warn('handleScan: Error pausing scanner:', pauseError);
      }
    }

    try {
      console.log(`handleScan: Processing QR data: ${qrData}`);
      if (!qrData.startsWith("attendance-")) {
        toast({ 
          title: "Invalid QR Code", 
          description: "This QR code is not valid for attendance.", 
          variant: "destructive" 
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ 
          title: "Authentication Error", 
          description: "You must be logged in to record attendance.", 
          variant: "destructive" 
        });
        return;
      }

      const today = getLocalDateString();
      const { data: existingLog, error: fetchError } = await supabase
        .from('time_logs')
        .select('id, time_in, time_out')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (fetchError) {
        console.error("handleScan: Error fetching existing time log:", fetchError);
        toast({ 
          title: "Database Error", 
          description: "Could not check existing logs.", 
          variant: "destructive" 
        });
        return;
      }

      if (existingLog) {
        if (existingLog.time_in && existingLog.time_out) {
          toast({ 
            title: "Already Complete", 
            description: "You have already timed in and out for today.", 
            variant: "default" 
          });
          onClose();
          return;
        } else if (existingLog.time_in && !existingLog.time_out) {
          // Time out
          const { error: updateError } = await supabase
            .from('time_logs')
            .update({ time_out: new Date().toISOString() })
            .eq('id', existingLog.id);

          if (updateError) {
            console.error("Time out update error:", updateError);
            toast({ 
              title: "Time Out Error", 
              description: `Failed to record your time out: ${updateError.message || 'Unknown error'}`, 
              variant: "destructive" 
            });
          } else {
            toast({ 
              title: "Time Out Successful", 
              description: "You have successfully timed out.", 
              variant: "default" 
            });
            onClose();
          }
        }
      } else {
        // Time in
        const { error: insertError } = await supabase
          .from('time_logs')
          .insert({ 
            user_id: user.id, 
            date: today, 
            time_in: new Date().toISOString() 
          });

        if (insertError) {
          toast({ 
            title: "Time In Error", 
            description: "Failed to record your time in.", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Time In Successful", 
            description: "You have successfully timed in.", 
            variant: "default" 
          });
          onClose();
        }
      }
    } catch (e) {
      console.error("handleScan: Unexpected error:", e);
      toast({ 
        title: "Scan Processing Error", 
        description: "An unexpected error occurred.", 
        variant: "destructive" 
      });
    } finally {
      if (mountedRef.current) {
        setScanInProgress(false);
        
        // Restart scanner after a brief delay
        setTimeout(() => {
          if (qrScannerRef.current && isScanning && mountedRef.current) {
            try {
              qrScannerRef.current.start();
            } catch (err) {
              console.error('Error restarting scanner:', err);
            }
          }
        }, 1000);
      }
    }
  }, [scanInProgress, isScanning, toast, onClose]);

  const initializeScanner = useCallback(async () => {
    console.log('initializeScanner: Starting camera initialization');
    setError(null);
    setIsInitializing(true);
    setNeedsUserInteraction(false);

    if (!videoRef.current || !mountedRef.current) {
      console.error('initializeScanner: Video element not available or component unmounted');
      setError("Video element not available.");
      setIsInitializing(false);
      return;
    }

    try {
      // Clean up any existing scanner/stream first
      cleanup();

      // Reduced wait time for faster initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser');
      }

      // Optimized progressive fallback constraints - faster initialization
      const constraintOptions = [
        // First try: Simple environment camera (fastest)
        {
          video: {
            facingMode: 'environment'
          }
        },
        // Second try: Any camera
        {
          video: true
        },
        // Third try: User facing camera if environment fails
        {
          video: {
            facingMode: 'user'
          }
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      console.log('initializeScanner: Trying camera access with fallback constraints');
      
      for (const constraints of constraintOptions) {
        try {
          console.log('initializeScanner: Trying constraints:', constraints);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) {
            console.log('initializeScanner: Camera access successful');
            break;
          }
        } catch (err) {
          console.warn('initializeScanner: Constraint failed:', err);
          lastError = err as Error;
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with all constraint options');
      }
      
      if (!mountedRef.current) {
        // Component was unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        // Set video properties for maximum mobile compatibility
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.controls = false;
        video.defaultMuted = true;
        
        // Critical mobile attributes
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        
        // Force video dimensions to prevent mobile layout issues
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // Force play video immediately on mobile - critical for iOS
        console.log('initializeScanner: Forcing video to play immediately');
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          console.log('initializeScanner: Video is playing');
        } catch (playError) {
          console.warn('initializeScanner: Initial video play failed:', playError);
          // On some mobile browsers, we need user interaction first
          if ((playError as Error).name === 'NotAllowedError') {
            console.log('initializeScanner: Requiring user interaction for video play');
            setNeedsUserInteraction(true);
            setIsInitializing(false);
            return;
          }
          // Continue anyway - some browsers work without explicit play
        }
        
        // Wait for video to be ready with faster approach
        console.log('initializeScanner: Waiting for video to be ready');
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          let resolved = false;
          
          const cleanupListeners = () => {
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('canplay', onReady);
            video.removeEventListener('error', onError);
          };
          
          const onReady = () => {
            if (!resolved && video.readyState >= 1) { // Reduced readyState requirement for faster init
              resolved = true;
              cleanupListeners();
              console.log('initializeScanner: Video is ready, readyState:', video.readyState);
              resolve();
            }
          };
          
          const onError = (e: Event) => {
            if (!resolved) {
              resolved = true;
              cleanupListeners();
              console.error('initializeScanner: Video error event:', e);
              reject(new Error('Video failed to load'));
            }
          };
          
          // Fewer event listeners for faster initialization
          video.addEventListener('loadedmetadata', onReady);
          video.addEventListener('canplay', onReady);
          video.addEventListener('error', onError);
          
          // Shorter timeout for faster user feedback - 3 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              cleanupListeners();
              console.warn('initializeScanner: Video loading timeout, proceeding anyway');
              resolve(); // Don't reject, try to continue
            }
          }, 3000);
          
          // Check if already ready
          if (video.readyState >= 1) {
            onReady();
          }
        });

        // Reduced delay for faster initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize QR Scanner with mobile-optimized settings
        console.log('initializeScanner: Creating QR scanner with mobile optimizations');
        qrScannerRef.current = new QrScanner(
          video,
          (result: QrScannerScanResult | string) => {
            let qrData: string;
            if (typeof result === 'string') {
              qrData = result;
            } else if (result && typeof result.data === 'string') {
              qrData = result.data;
            } else {
              console.warn('Received scan result in unexpected format:', result);
              return;
            }
            
            console.log(`QR Code detected: ${qrData}`);
            if (qrData && qrData.trim() !== "") {
              handleScan(qrData);
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 2, // Lower for mobile performance
            returnDetailedScanResult: false
          }
        );

        console.log('initializeScanner: Starting QR scanner');
        await qrScannerRef.current.start();
        setIsScanning(true);
        console.log('initializeScanner: QR scanner started successfully');
        
        // Start health check mechanism for mobile reliability
        startHealthCheck();
      }
    } catch (err) {
      console.error('initializeScanner: Error initializing scanner:', err);
      let message = "Failed to start QR scanner.";
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No camera found. Please ensure your device has a camera.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'Camera is already in use by another application. Please close other camera apps and try again.';
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          message = 'Camera constraints not supported. Trying to use any available camera.';
        } else if (err.message.includes('timeout')) {
          message = 'Camera initialization timeout. Please try again.';
        } else {
          message = `Camera error: ${err.message}`;
        }
      }
      setError(message);
      cleanup();
    } finally {
      setIsInitializing(false);
    }
  }, [cleanup, handleScan]);

  // Health check mechanism to ensure scanner stays active on mobile
  const startHealthCheck = useCallback(() => {
    // Clear any existing health check
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
    }
    
    console.log('startHealthCheck: Starting scanner health monitoring');
    healthCheckRef.current = setInterval(() => {
      if (!mountedRef.current || !qrScannerRef.current || !isScanning) {
        return;
      }
      
      try {
        // Check if video stream is still active
        const video = videoRef.current;
        if (!video || !streamRef.current) {
          console.warn('healthCheck: Video or stream missing, reinitializing');
          initializeScanner();
          return;
        }
        
        // Check if video is playing
        if (video.paused || video.ended) {
          console.warn('healthCheck: Video paused or ended, attempting to restart');
          video.play().catch((err) => {
            console.warn('healthCheck: Failed to restart video:', err);
            initializeScanner();
          });
          return;
        }
        
        // Check if stream tracks are active
        const tracks = streamRef.current.getTracks();
        const activeVideoTracks = tracks.filter(track => track.kind === 'video' && track.readyState === 'live');
        
        if (activeVideoTracks.length === 0) {
          console.warn('healthCheck: No active video tracks, reinitializing');
          initializeScanner();
          return;
        }
        
        // Verify scanner is not paused/stopped (if we can check)
        if (qrScannerRef.current && 'hasCamera' in qrScannerRef.current) {
          const hasCamera = (qrScannerRef.current as any).hasCamera;
          if (!hasCamera) {
            console.warn('healthCheck: Scanner reports no camera, reinitializing');
            initializeScanner();
            return;
          }
        }
        
        console.log('healthCheck: Scanner appears healthy');
      } catch (err) {
        console.error('healthCheck: Error during health check:', err);
        // If health check itself fails, try to reinitialize
        initializeScanner();
      }
    }, 10000); // Check every 10 seconds
  }, [isScanning, initializeScanner]);

  // Stop health check
  const stopHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      console.log('stopHealthCheck: Stopping health monitoring');
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopHealthCheck();
      cleanup();
    };
  }, [cleanup, stopHealthCheck]);

  // Initialize scanner when component mounts
  useEffect(() => {
    initializeScanner();
  }, [initializeScanner]);

  // Handle visibility change (browser tab focus/blur) - Enhanced for mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden, pausing scanner');
        if (qrScannerRef.current) {
          try {
            qrScannerRef.current.pause();
          } catch (err) {
            console.warn('Error pausing scanner on visibility change:', err);
          }
        }
      } else {
        console.log('Page visible, restarting scanner');
        if (qrScannerRef.current && mountedRef.current) {
          setTimeout(() => {
            if (qrScannerRef.current && mountedRef.current) {
              try {
                qrScannerRef.current.start();
              } catch (err) {
                console.warn('Error restarting scanner on visibility change:', err);
                // If restart fails, reinitialize
                initializeScanner();
              }
            }
          }, 300); // Increased delay for mobile
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initializeScanner]);

  // Enhanced mobile focus/blur handling
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, ensuring scanner is active');
      if (qrScannerRef.current && mountedRef.current) {
        setTimeout(() => {
          if (qrScannerRef.current && mountedRef.current) {
            try {
              qrScannerRef.current.start();
            } catch (err) {
              console.warn('Error starting scanner on focus:', err);
              initializeScanner();
            }
          }
        }, 500); // Longer delay for mobile stability
      }
    };

    const handleBlur = () => {
      console.log('Window blurred');
      // On mobile, brief pauses can help with resource management
      if (qrScannerRef.current) {
        setTimeout(() => {
          if (qrScannerRef.current && document.hidden) {
            try {
              qrScannerRef.current.pause();
            } catch (err) {
              console.warn('Error pausing scanner on blur:', err);
            }
          }
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [initializeScanner]);

  // Mobile-specific orientation change handler
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('Orientation changed, reinitializing scanner');
      setTimeout(() => {
        if (mountedRef.current) {
          initializeScanner();
        }
      }, 1000); // Wait for orientation change to complete
    };

    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [initializeScanner]);

  const stopScanningAndClose = () => {
    console.log('stopScanningAndClose: User triggered stop.');
    setIsScanning(false);
    stopHealthCheck();
    onClose();
  };

  const retryCamera = () => {
    console.log('retryCamera: User triggered retry.');
    setError(null);
    setScanInProgress(false); 
    setNeedsUserInteraction(false);
    initializeScanner();
  };

  const startManually = () => {
    console.log('startManually: User triggered manual start.');
    setNeedsUserInteraction(false);
    setError(null);
    initializeScanner();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={stopScanningAndClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close scanner"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-white">Scan QR Code</h2>
        
        {error && (
          <div className="my-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            <p><strong>Error:</strong> {error}</p>
            <Button onClick={retryCamera} className="w-full mt-2">
              Try Again
            </Button>
          </div>
        )}

        {needsUserInteraction && !error && (
          <div className="my-3 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm">
            <p><strong>Camera needs permission:</strong> Tap the button below to start the camera.</p>
            <Button onClick={startManually} className="w-full mt-2">
              Start Camera
            </Button>
          </div>
        )}

        <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }} // Mirror display
          />
          {!error && !needsUserInteraction && (isInitializing || !isScanning) && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-3" />
                <p className="text-white text-lg">Initializing Camera...</p>
              </div>
          )}
           {isScanning && !error && ( // Visual cue for active scanning area
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-[70%] h-[70%] border-4 border-dashed border-green-500 dark:border-green-400 rounded-lg opacity-75"
                style={{ animation: 'pulse 2s infinite ease-in-out' }}
              ></div>
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Position the QR code within the frame.
        </p>

        <Button onClick={stopScanningAndClose} className="w-full mt-4" variant="outline">
          Cancel
        </Button>
      </div>
      {/* Simple CSS for pulse animation if not using Tailwind's animate-pulse effectively for border */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default QRScannerComponent;
