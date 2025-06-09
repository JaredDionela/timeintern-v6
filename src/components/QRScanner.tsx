import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Scan, Camera, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from "qr-scanner";
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface QRScannerProps {
  onClose: () => void;
}

const QRScanner = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    // Check if camera is available and request permissions
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          setError('Camera not supported in this browser');
          return;
        }
        
        // Test camera permissions
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setPermissionGranted(true);
          setHasCamera(true);
        } catch (err) {
          console.log('Camera permission not yet granted');
          setPermissionGranted(false);
          setHasCamera(true); // Camera exists but permission not granted
        }
      } catch (err) {
        console.error('Error checking camera:', err);
        setHasCamera(false);
        setError('Camera not available');
      }
    };
    
    checkCamera();
    
    return () => {
      cleanup();
    };
  }, []);

  // Start scanner when isScanning becomes true
  useEffect(() => {
    if (isScanning) {
      startScanner();
    } else {
      cleanup();
    }
  }, [isScanning]);

  const cleanup = () => {
    console.log('Cleaning up QR scanner...');
    if (qrScannerRef.current) {
      try {
        (qrScannerRef.current as QrScanner).destroy();
      } catch (error) {
        console.error('Error destroying QR scanner:', error);
      }
      qrScannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  };

  const startScanner = async () => {
    if (!videoRef.current || !hasCamera) return;

    try {
      setError(null);
      console.log('Starting QR scanner...');
      
      // Cleanup any existing scanner first
      if (qrScannerRef.current) {
        try {
          (qrScannerRef.current as QrScanner).destroy();
        } catch (error) {
          console.error('Error destroying existing QR scanner during start:', error);
        }
        qrScannerRef.current = null;
      }
      
      // Get camera stream with fallback constraints
      let stream;
      try {
        console.log('Attempting to access back camera...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (err) {
        console.log('Back camera failed, trying any camera...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      }
      
      console.log('Camera stream obtained:', stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setPermissionGranted(true);
      
      // Wait for video to be ready and actually start playing
      console.log('Waiting for video to load...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('Video load timeout');
          reject(new Error('Video load timeout'));
        }, 10000);
        
        const onLoadedMetadata = () => {
          console.log('Video metadata loaded, starting playback...');
          clearTimeout(timeout);
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            videoRef.current.removeEventListener('canplay', onCanPlay);
            videoRef.current.play()
              .then(() => {
                console.log('Video is now playing');
                setTimeout(() => resolve(), 500); // Small delay to ensure video is actually playing
              })
              .catch((playError) => {
                console.error('Video play error:', playError);
                // Still resolve as camera access is working for some cases, or reject if critical
                setTimeout(() => resolve(), 500); 
              });
          } else {
            reject(new Error("videoRef.current is null in onLoadedMetadata"));
          }
        };
        
        const onCanPlay = () => {
          console.log('Video can play');
          onLoadedMetadata();
        };
        
        if (videoRef.current) {
          if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or more
            onLoadedMetadata();
          } else {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
            videoRef.current.addEventListener('canplay', onCanPlay);
          }
        } else {
           reject(new Error("videoRef.current is null before event listeners"));
        }
      });
      
      // Initialize QR Scanner
      console.log('Initializing QR Scanner...');
      // Ensure worker path is correctly set (assuming it's in public folder)
      QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
      
      if (videoRef.current) {
        qrScannerRef.current = new QrScanner(
          videoRef.current, 
          (result) => { // This is the direct callback from the qr-scanner library
            const qrData = typeof result === 'string' ? result : result.data;
            
            // Log immediately when the library detects something
            console.log('QR Scanner library detected raw result:', result);
            
            if (qrData) {
              console.log('QR Code data extracted:', qrData);
              // Call handleScan only if data is valid and no other scan is in progress
              if (!scanInProgress) {
                handleScan(qrData);
              } else {
                console.log('Scan already in progress. Ignoring new QR data:', qrData);
              }
            } else {
              // This might happen if the library fires an event with no decodable QR code
              console.log('QR Scanner detected an empty or undecodable result.');
            }
          },
          {
            returnDetailedScanResult: true, 
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 2,
            // calculateScanRegion: (video) => { // Example: scan only center 50%
            //   const videoWidth = video.videoWidth;
            //   const videoHeight = video.videoHeight;
            //   const regionSize = Math.min(videoWidth, videoHeight) * 0.5;
            //   return {
            //     x: (videoWidth - regionSize) / 2,
            //     y: (videoHeight - regionSize) / 2,
            //     width: regionSize,
            //     height: regionSize
            //   };
            // }
          }
        );
      
        await qrScannerRef.current.start();
        console.log('QR Scanner started.');
        toast({
          title: "Camera Active",
          description: "Point your camera at a QR code to scan.",
        });
      } else {
        throw new Error("videoRef.current is null before initializing QrScanner");
      }
      
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera.');
      setIsScanning(false); 
      
      let errorMessage = 'Failed to start camera';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure a camera is connected and enabled.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleScan = async (qrData: string) => {
    // The initial check for scanInProgress is now handled before calling handleScan
    // if (scanInProgress) return; 

    // Add a check for empty qrData at the beginning of handleScan (should be redundant if checked in callback)
    if (!qrData) {
      console.log('handleScan called with empty qrData. Aborting.');
      // setScanInProgress(false); // Not needed here as it's handled by the caller or finally block
      return;
    }
    
    console.log('handleScan called with:', qrData);
    setScanInProgress(true);

    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.pause(); // Corrected: pause takes no arguments
        console.log('QR Scanner paused for processing.');
      } catch (error) {
        console.error('Error pausing QR scanner:', error);
      }
    }

    try {
      if (!qrData || !qrData.startsWith("attendance-")) {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not a valid attendance code.",
          variant: "destructive",
        });
        // No need to call setScanInProgress(false) here, finally block will handle it
        return; 
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to record attendance.",
          variant: "destructive",
        });
        navigate('/'); 
        return; 
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

      const { data: existingLog, error: fetchError } = await supabase
        .from('time_logs')
        .select('id, time_in, time_out, date')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { 
        console.error("Error fetching existing log:", fetchError);
        throw new Error(fetchError.message || "Could not fetch existing log.");
      }

      if (!existingLog) {
        // Time in
        const { error: insertError } = await supabase
          .from('time_logs')
          .insert({
            user_id: user.id,
            date: today,
            time_in: currentTime,
          });
        if (insertError) {
          console.error("Error inserting time_in:", insertError);
          throw new Error(insertError.message || "Failed to record time-in.");
        }
        toast({
          title: "Time In Successful",
          description: `You have successfully timed in at ${currentTime}.`,
        });
      } else if (existingLog.time_in && !existingLog.time_out) {
        // Time out
        const timeInDate = new Date(`${existingLog.date}T${existingLog.time_in}`);
        const timeOutDate = now;
        const diffMilliseconds = timeOutDate.getTime() - timeInDate.getTime();
        
        if (diffMilliseconds < 0) {
          toast({
            title: "Time Out Error",
            description: "Time-out cannot be earlier than time-in. Please check system time.",
            variant: "destructive",
          });
          return; 
        }

        const hoursWorked = parseFloat((diffMilliseconds / (1000 * 60 * 60)).toFixed(2));

        const { error: updateError } = await supabase
          .from('time_logs')
          .update({ time_out: currentTime, total_hours: hoursWorked })
          .eq('id', existingLog.id);

        if (updateError) {
          console.error("Error updating time_out:", updateError);
          throw new Error(updateError.message || "Failed to record time-out.");
        }
        toast({
          title: "Time Out Successful",
          description: `You have successfully timed out at ${currentTime}. Hours worked: ${hoursWorked.toFixed(2)}.`
        });
      } else if (existingLog.time_in && existingLog.time_out) {
        // Already timed in and out
        toast({
          title: "Attendance Recorded",
          description: "You have already timed in and out for today.",
          variant: "default", 
        });
      } else {
         console.warn("Unexpected time log state:", existingLog);
         toast({
          title: "Unknown Attendance State",
          description: "Could not determine your current time-in/out status. Please contact support if this persists.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error processing scan:', error);
      toast({
        title: "Scan Processing Error",
        description: error.message || "An unexpected error occurred while processing the scan.",
        variant: "destructive",
      });
    } finally {
      setScanInProgress(false);
      setTimeout(() => {
        if (qrScannerRef.current && isScanning && videoRef.current && videoRef.current.srcObject) { 
          try {
            if ((videoRef.current.srcObject as MediaStream).active) {
              qrScannerRef.current.start().then(() => {
                console.log('QR Scanner restarted after processing.');
              }).catch(e => console.error("Error restarting scanner after processing:", e));
            } else {
              console.log("Video stream inactive, not restarting scanner immediately after processing.");
            }
          } catch(e) {
            console.error("Error trying to restart scanner after processing:", e);
          }
        } else {
          console.log("Conditions not met to restart scanner after processing.");
        }
      }, 1500); 
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    cleanup();
  };

  const retryCamera = async () => {
    setError(null);
    setIsScanning(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-700 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Scan className="w-5 h-5" />
            QR Code Scanner
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!hasCamera ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-white font-medium">No Camera Available</p>
                <p className="text-slate-400 text-sm mt-1">
                  Camera not supported or available on this device
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-white font-medium">Camera Error</p>
                <p className="text-slate-400 text-sm mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={retryCamera}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  disabled={scanInProgress}
                >
                  Retry Camera
                </Button>
              </div>
            </div>
          ) : isScanning ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ 
                    minHeight: '300px'
                  }}
                />
                <div className="absolute inset-4 border-2 border-blue-500 rounded-lg pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                  <p className="text-white text-sm bg-black/70 px-3 py-2 rounded">
                    {scanInProgress ? 'Processing...' : 'Point camera at QR code'}
                  </p>
                </div>
                {scanInProgress && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  disabled={scanInProgress}
                >
                  Stop Camera
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-white font-medium">Ready to Scan</p>
                <p className="text-slate-400 text-sm mt-1">
                  Click below to start the camera and scan a QR code
                </p>
              </div>
              <Button
                onClick={() => setIsScanning(true)}
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={scanInProgress}
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
