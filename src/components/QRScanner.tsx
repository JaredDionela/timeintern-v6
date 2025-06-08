import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Scan, Camera, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from "qr-scanner";

interface QRScannerProps {
  onClose: () => void;
}

const QRScanner = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check camera permissions on mount
    checkCameraPermissions();
    
    return () => {
      // Cleanup on unmount
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);  const checkCameraPermissions = async () => {
    try {
      // Check if mediaDevices is available (required for camera access)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        toast({
          title: "Camera Not Supported",
          description: "Your browser does not support camera access.",
          variant: "destructive"
        });
        return;
      }

      // First check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setHasPermission(false);
        toast({
          title: "No Camera Found",
          description: "No camera device was found on this device.",
          variant: "destructive"
        });
        return;
      }

      // Request camera permissions explicitly with better mobile support
      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' }, // Prefer back camera
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Test if we can actually use the stream
        if (stream && stream.getVideoTracks().length > 0) {
          // Close the stream immediately as we just needed permission
          stream.getTracks().forEach(track => track.stop());
          setHasPermission(true);
          
          toast({
            title: "Camera Ready",
            description: "Camera access granted. You can now scan QR codes.",
          });
        } else {
          throw new Error('No video tracks available');
        }
      } catch (permissionError: any) {
        console.error('Camera permission denied:', permissionError);
        setHasPermission(false);
        
        let errorMessage = "Please allow camera access to scan QR codes.";
        if (permissionError.name === 'NotAllowedError') {
          errorMessage = "Camera permission was denied. Please enable camera access in your browser settings and refresh the page.";
        } else if (permissionError.name === 'NotFoundError') {
          errorMessage = "No camera was found on this device.";
        } else if (permissionError.name === 'NotReadableError') {
          errorMessage = "Camera is being used by another application. Please close other camera apps and try again.";
        }
        
        toast({
          title: "Camera Permission Required",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      setHasPermission(false);
      toast({
        title: "Camera Error",
        description: "Failed to initialize camera. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  const startScanning = async () => {
    if (!videoRef.current || !hasPermission) {
      toast({
        title: "Scanner Not Ready",
        description: "Camera permissions are required to start scanning.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Initialize QR Scanner with enhanced mobile support
      qrScannerRef.current = new QrScanner(
        videoRef.current!,
        (result: string) => handleScanResult(result)
      );
      
      // Configure scanner options
      qrScannerRef.current.setCamera('environment'); // Use back camera on mobile

      await qrScannerRef.current.start();
      setIsScanning(true);
      setIsLoading(false);
      
      toast({
        title: "Scanner Active",
        description: "Point your camera at a QR code. Make sure the code is well-lit and centered.",
      });
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      setIsScanning(false);
      setIsLoading(false);
      
      // Enhanced error handling with specific messages
      let errorTitle = "Scanner Error";
      let errorMessage = "Failed to start camera. Please try again.";
      
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permission Denied";
        errorMessage = "Camera access was denied. Please enable camera permissions in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorTitle = "No Camera Found";
        errorMessage = "No camera was found on this device.";
      } else if (error.name === 'NotReadableError') {
        errorTitle = "Camera Busy";
        errorMessage = "Camera is being used by another application. Please close other camera apps.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Camera Settings";
        errorMessage = "Camera doesn't support the required settings. Trying with default settings.";
        
        // Fallback: try with minimal constraints
        try {
          qrScannerRef.current = new QrScanner(
            videoRef.current!,
            (result: string) => handleScanResult(result)
          );
          await qrScannerRef.current.start();
          setIsScanning(true);
          setIsLoading(false);
          toast({
            title: "Scanner Started",
            description: "Scanner started with basic settings.",
          });
          return;
        } catch (fallbackError) {
          console.error('Fallback scanner also failed:', fallbackError);
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      setIsScanning(false);
      toast({
        title: "Scanner Stopped",
        description: "QR code scanning has been stopped.",
      });
    }
  };

  const handleScanResult = (qrData: string) => {
    console.log('QR Code detected:', qrData);
    stopScanning();
    handleAttendance(qrData);
  };

  const handleAttendance = async (qrData: string) => {
    try {
      setIsLoading(true);
      
      // Enhanced QR code validation
      if (!qrData || qrData.trim().length < 3) {
        toast({
          title: "Invalid QR Code",
          description: "The scanned QR code is not valid for attendance tracking.",
          variant: "destructive"
        });
        return;
      }

      // Optional: Add company-specific QR code validation
      // For example, check if QR code contains a specific prefix or pattern
      const validQRPattern = /^(TIMEINTERN|COMPANY|OFFICE)/i;
      if (!validQRPattern.test(qrData)) {
        toast({
          title: "Unauthorized QR Code",
          description: "This QR code is not authorized for time tracking. Please use the official company QR code.",
          variant: "destructive"
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to record attendance.",
          variant: "destructive"
        });
        return;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString();

      // Check for existing time log today
      const { data: existingLog } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (!existingLog) {
        // First scan of the day = TIME IN
        const { error: timeInError } = await supabase
          .from('time_logs')
          .insert([{
            user_id: user.id,
            date: today,
            time_in: now.toISOString(),
            qr_code_data: qrData
          }]);

        if (timeInError) {
          console.error('Time in error:', timeInError);
          throw new Error('Failed to record time in. Please try again.');
        }

        toast({
          title: "✅ Time In Recorded",
          description: `Successfully timed in at ${currentTime}. Have a productive day!`,
        });

      } else if (!existingLog.time_out) {
        // Second scan of the day = TIME OUT
        const timeIn = new Date(existingLog.time_in || now.toISOString());
        const totalHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

        // Minimum work session validation (optional)
        if (totalHours < 0.1) { // Less than 6 minutes
          toast({
            title: "Work Session Too Short",
            description: "Please work for at least a few minutes before timing out.",
            variant: "destructive"
          });
          return;
        }

        const { error: timeOutError } = await supabase
          .from('time_logs')
          .update({
            time_out: now.toISOString(),
            total_hours: totalHours
          })
          .eq('id', existingLog.id);

        if (timeOutError) {
          console.error('Time out error:', timeOutError);
          throw new Error('Failed to record time out. Please try again.');
        }

        // Update monthly salary calculation
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        
        const { data: monthlyRecord } = await supabase
          .from('monthly_salary_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', month)
          .eq('year', year)
          .single();

        const newTotalHours = (monthlyRecord?.total_hours || 0) + totalHours;
        const dailyRate = 200; // 200 pesos per 8-hour day
        const newTotalSalary = Math.floor(newTotalHours / 8) * dailyRate;

        const { error: salaryError } = await supabase
          .from('monthly_salary_history')
          .upsert([{
            user_id: user.id,
            month,
            year,
            total_hours: newTotalHours,
            total_salary: newTotalSalary
          }]);

        if (salaryError) {
          console.warn('Salary update error (non-critical):', salaryError);
          // Don't throw error for salary update failure
        }

        toast({
          title: "✅ Time Out Recorded",
          description: `Successfully timed out at ${currentTime}. Total hours today: ${totalHours.toFixed(2)}h`,
        });

      } else {
        // Already completed time log for today
        const timeOutTime = new Date(existingLog.time_out).toLocaleTimeString();
        toast({
          title: "Already Completed",
          description: `You already timed out today at ${timeOutTime}. See you tomorrow!`,
          variant: "destructive"
        });
      }

      // Close scanner after successful operation
      setTimeout(() => {
        onClose();
      }, 2000); // Give user time to read the success message

    } catch (error: any) {
      console.error('Error handling attendance:', error);
      toast({
        title: "Attendance Error",
        description: error.message || "Failed to record attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const renderCameraArea = () => {
    if (hasPermission === false) {
      return (
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 mb-2">Camera not available</p>
          <p className="text-slate-400 text-sm">Please check camera permissions or device.</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-slate-400">Starting camera...</p>
        </div>
      );
    }

    if (isScanning) {
      return (
        <video 
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          playsInline
          muted
        />
      );
    }

    return (
      <div className="text-center">
        <Camera className="w-16 h-16 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-400">Camera preview area</p>
        <p className="text-slate-500 text-sm mt-1">Click "Start Scan" to begin</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Scan className="w-5 h-5" />
            QR Scanner
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 text-slate-400" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 overflow-hidden">
            {renderCameraArea()}
          </div>
          
          <Button 
            onClick={toggleScanning}
            disabled={hasPermission === false || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Starting..." : isScanning ? "Stop Scanning" : "Start Scan"}
          </Button>
          
          <div className="text-xs text-slate-400 text-center space-y-2">
            <div className="bg-slate-700/30 rounded-lg p-3 space-y-1">
              <p className="font-medium text-slate-300">How to use:</p>
              <p>• Position QR code within the camera view</p>
              <p>• Ensure good lighting for best results</p>
              <p>• First scan = Time In, Second scan = Time Out</p>
            </div>
            {isScanning && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2">
                <p className="text-blue-400 font-medium">📷 Scanner Active</p>
                <p className="text-blue-300 text-xs">Hold steady and center the QR code</p>
              </div>
            )}
            {hasPermission === false && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2">
                <p className="text-red-400 font-medium">⚠️ Camera Access Required</p>
                <p className="text-red-300 text-xs">Please enable camera permissions to scan QR codes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
