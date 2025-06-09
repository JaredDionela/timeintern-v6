import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'qr-scanner';
import type { ScanResult as QrScannerScanResult } from 'qr-scanner';

interface QRScannerProps {
  onClose: () => void;
}

const QRScannerComponent = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    console.log('cleanup: Called');
    
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

      const today = new Date().toISOString().split('T')[0];
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

    if (!videoRef.current || !mountedRef.current) {
      console.error('initializeScanner: Video element not available or component unmounted');
      setError("Video element not available.");
      setIsInitializing(false);
      return;
    }

    try {
      // Clean up any existing scanner/stream first
      cleanup();

      // Request camera with specific constraints for better mobile compatibility
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      console.log('initializeScanner: Requesting camera access');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mountedRef.current) {
        // Component was unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          if (video.readyState >= 1) {
            onLoadedMetadata();
          }
        });

        await videoRef.current.play();
        console.log('initializeScanner: Video is playing');

        // Initialize QR Scanner
        qrScannerRef.current = new QrScanner(
          videoRef.current,
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
            maxScansPerSecond: 5
          }
        );

        console.log('initializeScanner: Starting QR scanner');
        await qrScannerRef.current.start();
        setIsScanning(true);
        console.log('initializeScanner: QR scanner started successfully');
      }
    } catch (err) {
      console.error('initializeScanner: Error initializing scanner:', err);
      let message = "Failed to start QR scanner.";
      if (err instanceof Error) {
        message += ` ${err.message}`;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No camera found. Please ensure your device has a camera.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'Camera is already in use by another application.';
        }
      }
      setError(message);
      cleanup();
    } finally {
      setIsInitializing(false);
    }
  }, [cleanup, handleScan]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Initialize scanner when component mounts
  useEffect(() => {
    initializeScanner();
  }, [initializeScanner]);

  // Handle visibility change (browser tab focus/blur)
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
          }, 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initializeScanner]);

  // Handle page focus/blur for additional reliability
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
        }, 200);
      }
    };

    const handleBlur = () => {
      console.log('Window blurred');
      // Don't pause on blur as it might interfere with QR scanning
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [initializeScanner]);

  const stopScanningAndClose = () => {
    console.log('stopScanningAndClose: User triggered stop.');
    setIsScanning(false);
    onClose();
  };

  const retryCamera = () => {
    console.log('retryCamera: User triggered retry.');
    setError(null);
    setScanInProgress(false); 
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
            { (error.includes("permissions") || error.includes("NotAllowedError") || error.includes("video element")) &&
              <Button onClick={retryCamera} className="w-full mt-2">
                Try Again
              </Button>
            }
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
          {!error && (isInitializing || !isScanning) && (
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
