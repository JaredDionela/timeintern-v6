import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Scan, Camera, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from "qr-scanner";

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
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      
      // Get camera stream with fallback constraints
      let stream;
      try {
        // Try back camera first (mobile)
        console.log('Attempting to access back camera...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (err) {
        // Fallback to any available camera
        console.log('Back camera failed, trying any camera...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      }
      
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setPermissionGranted(true);
      
      // Wait for video to be ready and actually start playing
      console.log('Waiting for video to load...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('Video load timeout');
          reject(new Error('Video load timeout'));
        }, 10000);
        
        const onLoadedMetadata = () => {
          console.log('Video metadata loaded, starting playback...');
          clearTimeout(timeout);
          videoRef.current!.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current!.removeEventListener('canplay', onCanPlay);
          
          // Force video to play
          videoRef.current!.play()
            .then(() => {
              console.log('Video is now playing');
              setTimeout(() => resolve(void 0), 500); // Small delay to ensure video is actually playing
            })
            .catch((playError) => {
              console.error('Video play error:', playError);
              // Still resolve as camera access is working
              setTimeout(() => resolve(void 0), 500);
            });
        };
        
        const onCanPlay = () => {
          console.log('Video can play');
          onLoadedMetadata();
        };
        
        if (videoRef.current!.readyState >= 2) {
          // Video is already loaded
          onLoadedMetadata();
        } else {
          videoRef.current!.addEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current!.addEventListener('canplay', onCanPlay);
        }
      });
      
      // Initialize QR Scanner
      console.log('Initializing QR Scanner...');
      if (qrScannerRef.current) {
        try {
          (qrScannerRef.current as QrScanner).destroy();
        } catch (error) {
          console.error('Error destroying existing QR scanner:', error);
        }
      }
      
      // Set worker path for QR scanner
      QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const qrData = typeof result === 'string' ? result : result.data;
          console.log('QR Code detected:', qrData);
          handleScan(qrData);
        },
        {
          returnDetailedScanResult: false,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      
      await qrScannerRef.current.start();
      
      toast({
        title: "Camera Active",
        description: "Point your camera at a QR code to scan",
      });
      
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setIsScanning(false);
      
      let errorMessage = 'Failed to start camera';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        setPermissionGranted(false);
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
        setHasCamera(false);
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser. Try using a different browser.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints could not be satisfied.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked by security settings.';
      }
      
      setError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleManualScan = () => {
    // Generate realistic QR code data for demo purposes
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];
    const qrData = JSON.stringify({
      type: "attendance",
      location: "Office",
      timestamp: timestamp,
      date: dateStr,
      id: Math.random().toString(36).substr(2, 9)
    });
    
    toast({
      title: "QR Code Detected",
      description: "Processing attendance data...",
    });
    
    handleScan(qrData);
  };

  const handleScan = async (qrData: string) => {
    if (scanInProgress) return;
    setScanInProgress(true);

    // Pause scanning while processing (don't completely stop)
    if (qrScannerRef.current) {
      try {
        (qrScannerRef.current as QrScanner).pause();
      } catch (error) {
        console.error('Error pausing QR scanner:', error);
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Check for existing time log today
      const { data: existingLog } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (!existingLog) {
        // Time in
        const { error } = await supabase
          .from('time_logs')
          .insert({
            user_id: user.id,
            date: today,
            time_in: now.toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Time In Recorded",
          description: `Clocked in at ${now.toLocaleTimeString()}`,
        });
      } else if (!existingLog.time_out) {
        // Time out
        const timeIn = new Date(existingLog.time_in!);
        const totalHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

        const { error } = await supabase
          .from('time_logs')
          .update({ 
            time_out: now.toISOString(),
            total_hours: totalHours
          })
          .eq('id', existingLog.id);

        if (error) throw error;

        toast({
          title: "Time Out Recorded",
          description: `Clocked out at ${now.toLocaleTimeString()}. Hours worked: ${totalHours.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Already Timed Out",
          description: "You have already completed your time for today.",
          variant: "destructive"
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error handling scan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record time",
        variant: "destructive"
      });
    } finally {
      setScanInProgress(false);
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
              <Button
                onClick={handleManualScan}
                className="w-full bg-green-600 hover:bg-green-500"
                disabled={scanInProgress}
              >
                {scanInProgress && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manual Check-in (Demo)
              </Button>
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
                <Button
                  onClick={handleManualScan}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                  disabled={scanInProgress}
                >
                  {scanInProgress && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Manual Demo
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
                <Button
                  onClick={handleManualScan}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                  disabled={scanInProgress}
                >
                  {scanInProgress && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Manual Scan (Demo)
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
              <Button
                onClick={handleManualScan}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={scanInProgress}
              >
                {scanInProgress && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manual Check-in (Demo)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
