import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
// Card components are imported but not used in the current JSX. Keep if planned for future.
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { X, /* Scan, Camera, AlertCircle, */ Loader2 } from "lucide-react"; // Scan, Camera, AlertCircle not used
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'qr-scanner'; // Corrected import
import type { ScanResult as QrScannerScanResult } from 'qr-scanner';
// import { useNavigate } from 'react-router-dom'; // useNavigate was not used

interface QRScannerProps {
  onClose: () => void;
}

const QRScannerComponent = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(true); // Start scanning by default
  const [error, setError] = useState<string | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scannerActive, setScannerActive] = useState(false); // Track scanner state manually
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    console.log('cleanup: Called');
    if (qrScannerRef.current) {
      console.log('cleanup: Destroying QrScanner instance.');
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
      setScannerActive(false);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      console.log('cleanup: Stopping media tracks.');
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    console.log('cleanup: Finished.');
  }, []); // Dependencies: videoRef, qrScannerRef (refs are stable)

  const handleScan = useCallback(async (qrData: string) => {
    console.log(`handleScan: Called at ${new Date().toISOString()} with data: \'${qrData}\'`);

    if (qrScannerRef.current) {
      try {
        console.log('handleScan: Pausing scanner.');
        qrScannerRef.current.pause();
        setScannerActive(false);
      } catch (pauseError) {
        console.warn('handleScan: Error pausing scanner, it might have been destroyed:', pauseError);
      }
    }

    try {
      console.log(`handleScan: Processing QR data: ${qrData}`);
      if (!qrData.startsWith("attendance-")) {
        console.warn("handleScan: Invalid QR code format.");
        toast({ title: "Invalid QR Code", description: "This QR code is not valid for attendance.", variant: "destructive" });
        setError("Invalid QR code scanned.");
        return;
      }

      const user = await supabase.auth.getUser();
      if (!user || !user.data.user) {
        console.error("handleScan: User not authenticated.");
        toast({ title: "Authentication Error", description: "You must be logged in to record attendance.", variant: "destructive" });
        setError("User not authenticated.");
        return;
      }
      const userId = user.data.user.id;
      console.log(`handleScan: Authenticated user ID: ${userId}`);

      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog, error: fetchError } = await supabase
        .from('time_logs')
        .select('id, time_in, time_out') // Select only necessary fields
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(); // Expect at most one row

      if (fetchError) {
        console.error("handleScan: Error fetching existing time log:", fetchError);
        toast({ title: "Database Error", description: "Could not check existing logs.", variant: "destructive" });
        setError(`Error fetching logs: ${fetchError.message}`);
        return;
      }

      console.log("handleScan: Existing log for today:", existingLog);

      if (existingLog) {
        if (existingLog.time_in && existingLog.time_out) {
          console.log("handleScan: Attendance already recorded for today (both time-in and time-out).");
          toast({ title: "Attendance Recorded", description: "You have already timed in and out for today.", variant: "default" });
          onClose();
          return;
        } else if (existingLog.time_in && !existingLog.time_out) {
          console.log("handleScan: User is timing out.");
          const { error: updateError } = await supabase
            .from('time_logs')
            .update({ time_out: new Date().toISOString() })
            .eq('id', existingLog.id);

          if (updateError) {
            console.error("handleScan: Error updating time_out:", updateError);
            toast({ title: "Time Out Error", description: "Failed to record your time out.", variant: "destructive" });
            setError(`Time out error: ${updateError.message}`);
          } else {
            console.log("handleScan: Time out recorded successfully.");
            toast({ title: "Time Out Successful", description: "You have successfully timed out.", variant: "default" });
            onClose();
          }
        }
        // Case: existingLog.time_in is null (should not happen if inserted correctly) - treat as new time_in or error
      } else {
        console.log("handleScan: User is timing in.");
        const { error: insertError } = await supabase
          .from('time_logs')
          .insert({ user_id: userId, date: today, time_in: new Date().toISOString() });

        if (insertError) {
          console.error("handleScan: Error inserting time_in:", insertError);
          toast({ title: "Time In Error", description: "Failed to record your time in.", variant: "destructive" });
          setError(`Time in error: ${insertError.message}`);
        } else {
          console.log("handleScan: Time in recorded successfully.");
          toast({ title: "Time In Successful", description: "You have successfully timed in.", variant: "default" });
          // Consider if onClose() should be called here or if user stays to see confirmation.
          // For now, keeping it open after time-in.
        }
      }
    } catch (e) {
      console.error("handleScan: Unexpected error during scan processing:", e);
      toast({ title: "Scan Processing Error", description: "An unexpected error occurred.", variant: "destructive" });
      setError(`Processing error: ${(e as Error).message}`);
    } finally {
      console.log(`handleScan: finally block executing at ${new Date().toISOString()}.`);
      setScanInProgress(false);
      console.log('handleScan: scanInProgress set to false.');
      
      // Restart scanner after a short delay if still scanning and scanner exists
      if (isScanning && qrScannerRef.current) {
        setTimeout(() => {
          if (qrScannerRef.current && isScanning) {
            console.log('handleScan finally (delayed): Restarting scanner');
            qrScannerRef.current.start()
              .then(() => {
                console.log('Scanner restarted successfully after scan processing.');
                setScannerActive(true);
              })
              .catch(err => {
                console.error('Error restarting scanner after scan processing:', err);
                setError("Failed to restart scanner.");
                setScannerActive(false);
              });
          }
        }, 500); // Give a bit more time for processing
      }
    }
  }, [toast, onClose, setError, setScanInProgress, isScanning, supabase]);

  const startScanner = useCallback(async () => {
    console.log('startScanner: Called');
    setError(null);
    if (!videoRef.current) {
      console.error('startScanner: Video element not available.');
      setError("Video element not available.");
      return;
    }
    if (qrScannerRef.current) {
      console.log('startScanner: Scanner already initialized. Ensuring it is started.');
      try {
        if (!scannerActive) {
          await qrScannerRef.current.start();
          setScannerActive(true);
        }
        setIsScanning(true); // Ensure state reflects scanner is active
        console.log('startScanner: Existing scanner confirmed/started successfully.');
      } catch (err) {
        console.error('startScanner: Error starting existing scanner:', err);
        setError(`Error starting existing scanner: ${(err as Error).message}`);
        cleanup();
      }
      return;
    }

    console.log('startScanner: Attempting to access camera.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays, muted and playsinline are important
        videoRef.current.muted = true; 
        videoRef.current.playsInline = true;
        await videoRef.current.play();
        console.log('startScanner: Camera stream acquired and video playing.');

        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result: QrScannerScanResult | string) => {
            const currentScanTime = new Date().toISOString();
            console.log(`[${currentScanTime}] QR SCANNER RAW DETECTED: `, result);
            let qrData: string;
            if (typeof result === 'string') {
              qrData = result;
            } else if (result && typeof result.data === 'string') {
              qrData = result.data;
            } else {
              console.warn(`[${currentScanTime}] Received scan result in unexpected format:`, result);
              return;
            }
            console.log(`[${currentScanTime}] Extracted QR Data: \'${qrData}\'`);

            if (qrData && qrData.trim() !== "") {
              setScanInProgress(currentVal => {
                if (currentVal) {
                  console.log(`[${currentScanTime}] Scan result \'${qrData}\' received, but another scan is already in progress. Ignoring.`);
                  return true;
                }
                console.log(`[${currentScanTime}] Processing QR Data: \'${qrData}\'. Setting scanInProgress to true.`);
                handleScan(qrData);
                return true;
              });
            } else {
              console.warn(`[${currentScanTime}] Scanned QR data is empty or invalid after extraction.`);
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment'
          }
        );

        console.log('startScanner: New QrScanner instance created. Attempting to start it.');
        await qrScannerRef.current.start();
        setScannerActive(true);
        setIsScanning(true); // Set state after successful start
        console.log('startScanner: New QrScanner started successfully.');
      } else {
         console.warn('startScanner: Video ref became null after stream acquisition.');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error('startScanner: Error initializing scanner or accessing camera:', err);
      let message = "Failed to start QR scanner.";
      if (err instanceof Error) {
        message += ` ${err.name}: ${err.message}.`;
      }
      if ((err as Error).name === 'NotAllowedError') {
        message += ' Please grant camera permissions.';
      }
      setError(message);
      setIsScanning(false); // Ensure isScanning is false if start fails
      cleanup();
    }
  }, [handleScan, setScanInProgress, setError, setIsScanning, cleanup]); // Removed supabase, it's a dep of handleScan

  useEffect(() => {
    if (isScanning) {
      console.log('useEffect [isScanning]: isScanning is true, calling startScanner.');
      startScanner();
    } else {
      // This will be called if isScanning is set to false (e.g., by stopScanning or if startScanner fails)
      console.log('useEffect [isScanning]: isScanning is false, calling cleanup.');
      cleanup();
    }

    // Cleanup function for this effect:
    // This runs when isScanning changes, or when the component unmounts.
    return () => {
      console.log('useEffect [isScanning]: cleanup phase. Current isScanning value before this cleanup was:', isScanning);
      // If the component is unmounting, or if isScanning just became false,
      // we want to ensure cleanup happens. The 'else' block above handles when isScanning becomes false.
      // This specific return function is crucial for unmount.
      // Call cleanup directly to be certain. cleanup() is idempotent.
      cleanup();
    };
  }, [isScanning, startScanner, cleanup]); // Dependencies for the effect

  const stopScanningAndClose = () => {
    console.log('stopScanningAndClose: User triggered stop.');
    setIsScanning(false); // This will trigger cleanup via the useEffect
    onClose();
  };

  const retryCamera = () => {
    console.log('retryCamera: User triggered retry.');
    setError(null);
    // scanInProgress should be false before retrying
    setScanInProgress(false); 
    setIsScanning(true); // This will trigger startScanner via the useEffect
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
          {!error && !isScanning && !scannerActive && (
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
