import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const QRGenerator = () => {
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(5);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const generateQR = async () => {
      const timestamp = Date.now();
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const randomId = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const newCode = `attendance-${timestamp}-${randomId}`;
      
      try {
        // Create QR code in database with expiration
        const { data, error } = await supabase.rpc('create_qr_code', {
          qr_data: newCode,
          expiry_seconds: 5
        });

        if (error) {
          console.error('Error creating QR code in database:', error);
          // Fallback to client-side timestamp validation
          console.log(`Generated QR code (fallback): ${newCode}, expires after 5 seconds`);
        } else if (data) {
          // Handle JSON response from database function
          const qrResult = typeof data === 'object' ? data : JSON.parse(data as string);
          console.log(`Generated QR code in database: ${newCode}, expires at:`, qrResult?.expires_at);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
      
      setQrCode(newCode);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(newCode)}&size=200x200`);
      setTimeLeft(5);
    };

    generateQR();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateQR();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const progressValue = ((5 - timeLeft) / 5) * 100;

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm p-8 mx-auto w-fit">
        <CardContent className="p-0">
          <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Expires in:</span>
          <span className="text-blue-400 font-semibold">{timeLeft}s</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>
      
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <RefreshCw className="w-3 h-3" />
        <span>Code: {qrCode.substring(0, 20)}...</span>
      </div>
    </div>
  );
};

export default QRGenerator;
