import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'qr-scanner';
import type { ScanResult as QrScannerScanResult } from 'qr-scanner';
import { getLocalDateString, createLocalTimestamp } from "@/lib/dateUtils";

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
  const initializingRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    console.log('cleanup: Starting cleanup');
    
    // Stop the QR scanner first
    if (qrScannerRef.current) {
      try {
        console.log('cleanup: Destroying QrScanner instance');
        qrScannerRef.current.destroy();
      } catch (err) {
        console.warn('cleanup: Error destroying scanner:', err);
      }
      qrScannerRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      console.log('cleanup: Stopping media tracks');
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('cleanup: Error stopping track:', err);
        }
      });
      streamRef.current = null;
    }
    
    // Reset video element
    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = null;
      video.pause();
      video.load();
      
      // Clear attributes
      video.removeAttribute('autoplay');
      video.removeAttribute('webkit-playsinline');
      video.removeAttribute('playsinline');
    }
    
    // Reset states
    setIsScanning(false);
    setError(null);
    setScanInProgress(false);
    
    console.log('cleanup: Cleanup completed');
  }, []);

  const handleScan = useCallback(async (qrData: string) => {
    if (scanInProgress || !mountedRef.current) {
      console.log('handleScan: Scan in progress or component unmounted, ignoring');
      return;
    }

    console.log(`handleScan: Processing QR data: ${qrData}`);
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
      // Validate QR code format
      if (!qrData.startsWith("attendance-")) {
        toast({ 
          title: "Invalid QR Code", 
          description: "This QR code is not valid for attendance.", 
          variant: "destructive" 
        });
        return;
      }

      // Database validation with fallback
      let isValid = false;
      let validationMessage = "";

      try {
        const { data: validation, error: validationError } = await supabase.rpc('validate_qr_code', {
          qr_data: qrData
        });

        if (validationError) {
          console.warn('Database validation failed, using fallback:', validationError);
          
          // Fallback to client-side timestamp validation
          const parts = qrData.split('-');
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[1]);
            if (!isNaN(timestamp)) {
              const now = Date.now();
              const qrAge = now - timestamp;
              const maxAge = 5000; // 5 seconds
              
              isValid = qrAge <= maxAge;
              validationMessage = isValid ? "Valid (timestamp)" : "Expired (timestamp)";
            }
          }
        } else if (validation) {
          const result = typeof validation === 'string' ? JSON.parse(validation) : validation;
          isValid = result.is_valid;
          validationMessage = result.message;
          console.log('Database validation result:', result);
        }
      } catch (validationError) {
        console.warn('QR validation error, using fallback:', validationError);
        
        // Fallback validation
        const parts = qrData.split('-');
        if (parts.length >= 2) {
          const timestamp = parseInt(parts[1]);
          if (!isNaN(timestamp)) {
            const now = Date.now();
            const qrAge = now - timestamp;
            const maxAge = 5000; // 5 seconds
            
            isValid = qrAge <= maxAge;
            validationMessage = isValid ? "Valid (fallback)" : "Expired (fallback)";
          }
        }
      }

      if (!isValid) {
        toast({ 
          title: "Invalid QR Code", 
          description: validationMessage || "This QR code has expired or is invalid.", 
          variant: "destructive" 
        });
        return;
      }

      console.log(`handleScan: QR code is valid - ${validationMessage}`);

      // Mark QR code as used in database
      try {
        const { data: useResult, error: useError } = await supabase.rpc('use_qr_code', {
          qr_data: qrData
        });

        if (useError) {
          console.warn('Could not mark QR code as used:', useError);
        } else if (useResult) {
          const result = typeof useResult === 'string' ? JSON.parse(useResult) : useResult;
          console.log('QR code marked as used:', result);
        }
      } catch (useError) {
        console.warn('Error marking QR code as used:', useError);
      }

      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("handleScan: User not authenticated:", userError);
        toast({ 
          title: "Authentication Error", 
          description: "You must be logged in to scan QR codes.", 
          variant: "destructive" 
        });
        return;
      }

      // Handle time logging
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
          return;        } else if (existingLog.time_in && !existingLog.time_out) {          // Time out
          const now = new Date();
          const timeOutStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const timeOutTimestamp = createLocalTimestamp(today, timeOutStr);
          
          console.log('QR Scanner Time Out Debug:', {
            now: now.toString(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            timeOutStr,
            timeOutTimestamp,
            today
          });
          
          const { error: updateError } = await supabase
            .from('time_logs')
            .update({ time_out: timeOutTimestamp })
            .eq('id', existingLog.id);

          if (updateError) {
            toast({ 
              title: "Time Out Error", 
              description: "Failed to record your time out.", 
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
        }      } else {        // Time in
        const now = new Date();
        const timeInStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const timeInTimestamp = createLocalTimestamp(today, timeInStr);
        
        console.log('QR Scanner Time In Debug:', {
          now: now.toString(),
          hours: now.getHours(),
          minutes: now.getMinutes(),
          timeInStr,
          timeInTimestamp,
          today
        });
        
        const { error: insertError } = await supabase
          .from('time_logs')
          .insert({ 
            user_id: user.id, 
            date: today, 
            time_in: timeInTimestamp
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
        
        // Resume scanner after a delay
        setTimeout(() => {
          if (qrScannerRef.current && mountedRef.current && !scanInProgress) {
            try {
              qrScannerRef.current.start();
            } catch (resumeError) {
              console.warn('handleScan: Error resuming scanner:', resumeError);
            }
          }
        }, 1000);
      }
    }
  }, [scanInProgress, toast, onClose]);

  const initializeScanner = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      console.log('initializeScanner: Already initializing, waiting for current initialization');
      if (initPromiseRef.current) {
        await initPromiseRef.current;
      }
      return;
    }

    // Create initialization promise
    const initPromise = (async () => {
      initializingRef.current = true;
      console.log('initializeScanner: Starting initialization');
      
      setError(null);
      setIsInitializing(true);
      setNeedsUserInteraction(false);

      if (!videoRef.current || !mountedRef.current) {
        console.error('initializeScanner: Video element not available or component unmounted');
        setError("Video element not available.");
        setIsInitializing(false);
        initializingRef.current = false;
        return;
      }

      try {
        // Clean up first
        cleanup();
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!mountedRef.current) return;

        // Check camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported on this browser');
        }

        // Reset video element
        if (videoRef.current) {
          const video = videoRef.current;
          video.pause();
          video.srcObject = null;
          video.load();
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Try to get camera stream
        const constraints = { video: { facingMode: 'environment' } };
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Environment camera failed, trying any camera:', err);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!mountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // Setup video
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          
          // Mobile attributes
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Video initialization timeout'));
            }, 5000);

            const onReady = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onReady);
              video.removeEventListener('canplay', onReady);
              resolve();
            };

            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('canplay', onReady);

            if (video.readyState >= 1) {
              onReady();
            }
          });

          if (!mountedRef.current) return;

          // Initialize QR Scanner
          qrScannerRef.current = new QrScanner(
            video,
            (result: QrScannerScanResult | string) => {
              const qrData = typeof result === 'string' ? result : result.data;
              if (qrData && qrData.trim()) {
                handleScan(qrData);
              }
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: 'environment',
              maxScansPerSecond: 1,
              returnDetailedScanResult: false
            }
          );

          await qrScannerRef.current.start();
          setIsScanning(true);
          console.log('initializeScanner: QR scanner started successfully');
        }
      } catch (err) {
        console.error('initializeScanner: Error:', err);
        let message = "Failed to start QR scanner.";
        
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            message = 'Camera permission denied. Please allow camera access and try again.';
          } else if (err.name === 'NotFoundError') {
            message = 'No camera found. Please ensure your device has a camera.';
          } else if (err.name === 'NotReadableError') {
            message = 'Camera is already in use. Please close other camera apps and try again.';
          } else {
            message = `Camera error: ${err.message}`;
          }
        }
        
        setError(message);
        cleanup();
      } finally {
        setIsInitializing(false);
        initializingRef.current = false;
        initPromiseRef.current = null;
      }
    })();

    initPromiseRef.current = initPromise;
    await initPromise;
  }, [cleanup, handleScan]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Initialize scanner once on mount
  useEffect(() => {
    initializeScanner();
  }, []); // Empty dependency array - only run once on mount

  // Handle close
  const stopScanningAndClose = useCallback(() => {
    console.log('stopScanningAndClose: User closed scanner');
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Handle retry
  const retryCamera = useCallback(() => {
    console.log('retryCamera: User requested retry');
    setError(null);
    setRetryCount(prev => prev + 1);
    initializeScanner();
  }, [initializeScanner]);

  // Handle manual start
  const startManually = useCallback(() => {
    console.log('startManually: User granted permission');
    setNeedsUserInteraction(false);
    setError(null);
    initializeScanner();
  }, [initializeScanner]);

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
        
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-white">
          Scan QR Code
        </h2>
        
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
            
          />
          
          {!error && !needsUserInteraction && (isInitializing || !isScanning) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
              <Loader2 className="w-12 h-12 text-white animate-spin mb-3" />
              <p className="text-white text-lg">Initializing Camera...</p>
            </div>
          )}
          
          {isScanning && !error && (
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
