import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QrCode, RefreshCw, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const QRGenerator = () => {
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(5);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const generateQR = () => {
      const timestamp = Date.now();
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const randomId = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const newCode = `attendance-${timestamp}-${randomId}`;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      
      <div className="flex justify-center gap-2">
        <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-500">
          <Copy className="w-4 h-4 mr-2" />
          Copy Code
        </Button>
        <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-500">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

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
