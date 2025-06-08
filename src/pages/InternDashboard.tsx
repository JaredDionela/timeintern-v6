import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QrCode, LogOut, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRScanner from "@/components/QRScanner";
import { supabase } from "@/integrations/supabase/client";

const InternDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [internName, setInternName] = useState("");
  const [hoursWorked, setHoursWorked] = useState(0);
  const [requiredHours, setRequiredHours] = useState(120);
  const [currentMonthSalary, setCurrentMonthSalary] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signInTime, setSignInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    checkAuth();
    fetchInternProfile();
    fetchTodayStatus();
    fetchTotalHours(); // Added this call
    
    // Set up real-time subscription for time_logs
    const channel = supabase
      .channel('time_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchTodayStatus();
          fetchTotalHours();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
    }
  };

  const fetchInternProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        navigate('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('intern_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (profile) {
        setInternName(profile.name);
        setRequiredHours(profile.required_hours);
      } else {
        // Set default values if no profile exists
        setInternName("Intern");
        setRequiredHours(120);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set default values on error
      setInternName("Intern");
      setRequiredHours(120);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        navigate('/');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: timeLog, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
        throw error;
      }

      if (timeLog) {
        setIsSignedIn(!!timeLog.time_in && !timeLog.time_out);
        setSignInTime(timeLog.time_in);
      } else {
        setIsSignedIn(false);
        setSignInTime(null);
      }
    } catch (error) {
      console.error('Error checking today status:', error);
      // Set safe default values on error
      setIsSignedIn(false);
      setSignInTime(null);
    }
  };

  const fetchTotalHours = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month's data
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const { data: monthlyRecord } = await supabase
        .from('monthly_salary_history')
        .select('total_hours, total_salary')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .single();

      if (monthlyRecord) {
        setHoursWorked(monthlyRecord.total_hours);
        setCurrentMonthSalary(monthlyRecord.total_salary);
      } else {
        // Initialize with zero values if no record exists for the current month
        setHoursWorked(0);
        setCurrentMonthSalary(0);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching total hours:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const progressPercentage = (hoursWorked / requiredHours) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Hi, {internName}!
            </h1>
            <p className="text-slate-400">Track your internship progress</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-white font-semibold">{currentTime.toLocaleTimeString()}</div>
              <div className="text-slate-400 text-sm">{currentTime.toLocaleDateString()}</div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Hours Progress</CardTitle>
            <CardDescription className="text-slate-400">
              Total hours completed towards requirement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-3 bg-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </Progress>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                {hoursWorked.toFixed(2)} hours completed
              </span>
              <span className="text-slate-400">
                {requiredHours} hours required
              </span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-white">
                {progressPercentage.toFixed(1)}%
              </span>
              <p className="text-slate-400 text-sm">Complete</p>
            </div>
          </CardContent>
        </Card>

        {/* Time Tracking Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Time Tracking
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isSignedIn 
                ? `Signed in at ${new Date(signInTime!).toLocaleTimeString()}`
                : "Ready to start your work day"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowScanner(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {isSignedIn ? "Scan to Time Out" : "Scan to Time In"}
            </Button>
            {isSignedIn && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm font-medium">✓ Currently signed in</p>
                <p className="text-slate-400 text-xs">Remember to scan out when you finish work</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Earnings Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Monthly Earnings
            </CardTitle>
            <CardDescription className="text-slate-400">
              Current month's earnings based on hours worked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-white">
              ₱{currentMonthSalary.toFixed(2)}
            </div>
            <div className="text-sm text-slate-400 space-y-1">
              <p>Based on ₱200 per 8 hours</p>
              <p>Days completed: {Math.floor(hoursWorked / 8)}</p>
              <p>Partial hours: {(hoursWorked % 8).toFixed(2)}h</p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm font-medium">
                Potential this month: ₱{Math.floor(requiredHours / 8) * 200}
              </p>
            </div>
          </CardContent>
        </Card>

        {showScanner && (
          <QRScanner onClose={() => setShowScanner(false)} />
        )}
      </div>
    </div>
  );
};

export default InternDashboard;
