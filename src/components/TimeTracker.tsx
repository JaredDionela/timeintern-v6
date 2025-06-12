import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLocalTime } from "@/lib/dateUtils";
import { Clock } from "lucide-react";

interface TimeTrackerProps {
  signInTime: string;
  onTimeUpdate?: (hours: number) => void;
}

const TimeTracker = ({ signInTime, onTimeUpdate }: TimeTrackerProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState({
    displayHours: 0,
    displayMinutes: 0,
    displaySeconds: 0,
    totalHours: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Handle both ISO format and local format timestamps
      let signInDateTime: Date;
      if (signInTime.includes('T')) {
        // ISO format
        signInDateTime = new Date(signInTime);
      } else {
        // Local format "YYYY-MM-DD HH:MM:SS"
        signInDateTime = new Date(signInTime.replace(' ', 'T'));
      }
      
      const elapsedMs = now.getTime() - signInDateTime.getTime();
      const totalHours = elapsedMs / (1000 * 60 * 60);
      
      setElapsedTime({
        displayHours: Math.floor(totalHours),
        displayMinutes: Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60)),
        displaySeconds: Math.floor((elapsedMs % (1000 * 60)) / 1000),
        totalHours
      });

      if (onTimeUpdate) {
        onTimeUpdate(totalHours);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [signInTime, onTimeUpdate]);

  return (
    <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Today's Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-sm">Sign In Time</p>
            <p className="text-white font-semibold">
              {formatLocalTime(signInTime)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Current Time</p>
            <p className="text-white font-semibold">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div>
          <p className="text-slate-400 text-sm mb-1">Time Elapsed</p>
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
            {elapsedTime.displayHours.toString().padStart(2, '0')}:
            {elapsedTime.displayMinutes.toString().padStart(2, '0')}:
            {elapsedTime.displaySeconds.toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Total Hours: {elapsedTime.totalHours.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeTracker;
