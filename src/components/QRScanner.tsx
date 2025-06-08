import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Scan, Camera } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QRScannerProps {
  onClose: () => void;
}

const QRScanner = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isScanning && !stream) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef) {
        videoRef.srcObject = mediaStream;
        videoRef.onloadedmetadata = () => {
          videoRef.play();
          startScanning(videoRef);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsScanning(false);
      toast({
        title: "Error",
        description: "Failed to access camera. Please make sure you have granted camera permissions.",
        variant: "destructive"
      });
    }
  };

  const startScanning = (video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const scanInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        try {
          // Here you would normally use a QR code decoder library
          // For now, let's simulate a successful scan every 5 seconds
          setTimeout(() => {
            const timestamp = Date.now();
            const qrData = `attendance-${timestamp}`;
            handleScan(qrData);
          }, 5000);
        } catch (error) {
          console.error('QR scanning error:', error);
        }
      }
    }, 500);

    return () => clearInterval(scanInterval);
  };

  const handleScan = async (qrData: string) => {
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
        const { error: timeInError } = await supabase
          .from('time_logs')
          .insert([{
            user_id: user.id,
            date: today,
            time_in: now.toISOString(),
          }]);

        if (timeInError) throw timeInError;

        toast({
          title: "Time In Recorded",
          description: `Successfully timed in at ${now.toLocaleTimeString()}`,
        });
      } else if (!existingLog.time_out) {
        // Time out
        const timeIn = new Date(existingLog.time_in!);
        const totalHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

        const { error: timeOutError } = await supabase
          .from('time_logs')
          .update({
            time_out: now.toISOString(),
            total_hours: totalHours
          })
          .eq('id', existingLog.id);

        if (timeOutError) throw timeOutError;

        // Update monthly salary
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
        const newTotalSalary = Math.floor(newTotalHours / 8) * 200; // 200 pesos per 8 hours

        const { error: salaryError } = await supabase
          .from('monthly_salary_history')
          .upsert([{
            user_id: user.id,
            month,
            year,
            total_hours: newTotalHours,
            total_salary: newTotalSalary
          }]);

        if (salaryError) throw salaryError;

        toast({
          title: "Time Out Recorded",
          description: `Successfully timed out at ${now.toLocaleTimeString()}. Hours worked: ${totalHours.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Already Timed Out",
          description: "You have already completed your time log for today.",
          variant: "destructive"
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error handling scan:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">QR Scanner</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 text-slate-400" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
            {isScanning ? (
              <video 
                ref={(ref) => setVideoRef(ref)}
                className="w-full h-full object-cover rounded-lg"
                autoPlay
                playsInline
              />
            ) : (
              <div className="text-center">
                <Camera className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400">Camera preview area</p>
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => setIsScanning(!isScanning)} 
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isScanning ? "Stop Scanning" : "Start Scan"}
          </Button>
          
          <p className="text-xs text-slate-400 text-center">
            Position the QR code within the camera view to scan
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
