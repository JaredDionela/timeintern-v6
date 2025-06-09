import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Scan, Camera, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner, { ScanResult as QrScannerScanResult } from 'qr-scanner'; // Adjusted import
import { useNavigate } from 'react-router-dom';

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
        qrScannerRef.current.destroy();
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
    if (!videoRef.current || !hasCamera) {
      console.log('startScanner: videoRef or camera not available. Exiting.');
      return;
    }

    try {
      setError(null);
      console.log('startScanner: Attempting to start QR scanner...');
      
      if (qrScannerRef.current) {
        console.log('startScanner: Destroying existing QrScanner instance.');
        try {
          qrScannerRef.current.destroy();
        } catch (error) {
          console.error('startScanner: Error destroying existing QR scanner:', error);
        }
        qrScannerRef.current = null;
      }
      
      console.log('startScanner: Requesting camera stream...');
      let stream;
      try {
        console.log('startScanner: Attempting to access back camera (environment)...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          } 
        });
        console.log('startScanner: Back camera stream obtained.');
      } catch (err) {
        console.warn('startScanner: Back camera failed, trying any available camera...', err);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          } 
        });
        console.log('startScanner: Fallback camera stream obtained.');
      }
      
      if (!stream) {
        console.error("startScanner: Failed to obtain camera stream.");
        throw new Error("Failed to obtain camera stream.");
      }
      console.log('startScanner: Camera stream active:', stream.active, 'Stream ID:', stream.id);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setPermissionGranted(true); 
      
      console.log('startScanner: Waiting for video metadata and playback...');
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          console.error("startScanner: videoRef.current is null before setting up video play promise.");
          return reject(new Error("videoRef.current is null before play promise"));
        }
        const videoElement = videoRef.current;

        const onCanPlay = () => {
          console.log('startScanner: Video event "canplay" triggered.');
          videoElement.play()
            .then(() => {
              console.log('startScanner: Video is playing.');
              videoElement.removeEventListener('canplay', onCanPlay);
              videoElement.removeEventListener('error', onVideoError);
              setTimeout(resolve, 300); 
            })
            .catch(playError => {
              console.error('startScanner: Video play() failed:', playError);
              reject(playError);
            });
        };

        const onVideoError = (e: Event) => {
          console.error('startScanner: Video element error:', e);
          reject(new Error('Video element error'));
        };

        if (videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
           console.log('startScanner: Video already has enough data, attempting to play.');
           onCanPlay();
        } else {
          console.log('startScanner: Adding "canplay" and "error" event listeners to video element.');
          videoElement.addEventListener('canplay', onCanPlay);
          videoElement.addEventListener('error', onVideoError);
        }
      });
      
      // Initialize QR Scanner
      console.log('Initializing QR Scanner...');

      if (videoRef.current) {
        console.log('startScanner: Creating new QrScanner instance.');
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result: QrScannerScanResult | string) => { // Use the imported type alias
            const currentScanTime = new Date().toISOString();
            console.log(`[${currentScanTime}] QR SCANNER DETECTED: `, result); 
            
            let qrData: string; 
            if (typeof result === 'string') {
              qrData = result;
            } else {
              qrData = result.data; 
            }
            console.log(`[${currentScanTime}] Extracted QR Data: '${qrData}'`);

            if (qrData && qrData.trim() !== "") {
              console.log(`[${currentScanTime}] Valid QR Data found. Current scanInProgress state: ${scanInProgress}`);
              if (!scanInProgress) {
                handleScan(qrData);
              } else {
                console.log(`[${currentScanTime}] Scan already in progress. Ignoring this detection.`);
              }
            } else {
              console.log(`[${currentScanTime}] QR Scanner detected empty or undecodable result.`);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true, 
            highlightCodeOutline: true,
          }
        );

        console.log('startScanner: QrScanner instance created.');

        if (qrScannerRef.current) {
          console.log('startScanner: Attempting to call qrScanner.start()...');
          setIsScanning(true); // Set isScanning to true to make video visible before starting
          qrScannerRef.current.start()
            .then(() => {
              console.log('startScanner: qrScanner.start() resolved successfully.');
              // isScanning is already true, no need to set it again here
            })
            .catch((error: any) => {
              console.error('startScanner: Error calling qrScanner.start():', error);
              setError(`Failed to start QR scanner: ${error instanceof Error ? error.message : String(error)}`);
              setIsScanning(false); // Set isScanning back to false if start() fails
            });
        } else {
          console.error('startScanner: qrScannerRef.current is null after instantiation.');
          setError('Failed to initialize QR scanner component.');
        }
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
    console.log(`handleScan: Called at ${new Date().toISOString()} with data: '${qrData}'`);
    if (scanInProgress) {
        console.log('handleScan: Scan already in progress, returning immediately.');
        return;
    }
    setScanInProgress(true);
    console.log('handleScan: scanInProgress set to true.');

    if (qrScannerRef.current) {
      try {
        console.log('handleScan: Pausing QR scanner for processing.');
        qrScannerRef.current.pause(); 
      } catch (error) {
        console.error('handleScan: Error pausing QR scanner:', error);
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
      console.log(`handleScan: finally block executing at ${new Date().toISOString()}. Setting scanInProgress to false.`);
      setScanInProgress(false);
      
      setTimeout(() => {
        if (qrScannerRef.current && isScanning && videoRef.current && videoRef.current.srcObject) {
          const mediaStream = videoRef.current.srcObject as MediaStream;
          if (mediaStream.active) {
            console.log(`handleScan: (setTimeout) Attempting to restart scanner at ${new Date().toISOString()}.`);
            qrScannerRef.current.start().then(() => {
              console.log(`handleScan: (setTimeout) QR Scanner restarted successfully at ${new Date().toISOString()}.`);
            }).catch((e: any) => console.error("handleScan: (setTimeout) Error restarting scanner:", e));
          } else {
            console.log("handleScan: (setTimeout) Video stream inactive, not restarting scanner.");
          }
        } else {
          console.log(`handleScan: (setTimeout) Conditions not met to restart scanner at ${new Date().toISOString()}. isScanning: ${isScanning}`);
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
