import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogOut, QrCode } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLocalDateString, getCurrentMonth, getCurrentYear } from "@/lib/dateUtils";

const InternDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [internName, setInternName] = useState("");
  const [internEmail, setInternEmail] = useState("");
  const [internAvatar, setInternAvatar] = useState("");
  const [hoursWorked, setHoursWorked] = useState(0);
  const [requiredHours, setRequiredHours] = useState(120);
  const [currentMonthSalary, setCurrentMonthSalary] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signInTime, setSignInTime] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchInternProfile();
    fetchTodayStatus();
    fetchTotalHours();

    // Enhanced real-time subscription for immediate updates
    const channel = supabase
      .channel('intern_dashboard_updates', {
        config: {
          broadcast: { self: true },
          presence: { key: 'intern_dashboard' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        (payload) => {
          console.log('Time logs change received!', payload);
          // Immediate refresh of status and hours
          fetchTodayStatus();
          fetchTotalHours();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_salary_history'
        },
        (payload) => {
          console.log('Monthly salary change received!', payload);
          // Refresh total hours when monthly record updates
          fetchTotalHours();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Also set up a periodic refresh as backup
    const intervalId = setInterval(() => {
      fetchTodayStatus();
      fetchTotalHours();
    }, 30000); // Refresh every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No valid session, redirecting to login');
        navigate('/');
        return;
      }
      
      console.log('Auth check passed for intern:', session.user.email);
    } catch (error) {
      console.error('Auth check error:', error);
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

      if (error && error.code !== 'PGRST116') throw error;
      
      if (profile) {
        setInternName(profile.name);
        setRequiredHours(profile.required_hours);
        setInternEmail(profile.email || "");
        // setInternAvatar(profile.avatar_url || ""); 
      } else {
        setInternName("Intern");
        setRequiredHours(120);
        const { data: { user: authUser } } = await supabase.auth.getUser(); // Renamed to avoid conflict
        setInternEmail(authUser?.email || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setInternName("Intern");
      setRequiredHours(120);
      const { data: { user: authUser } } = await supabase.auth.getUser(); // Renamed to avoid conflict
      setInternEmail(authUser?.email || "");
    } finally {
      // Ensure loading is set to false in all paths of profile fetching
      // setLoading(false); // This might be too early if other fetches are pending
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // setLoading(false); // Moved to fetchTotalHours finally block
        // navigate('/'); // Avoid navigating away if other fetches are still running
        return;
      }

      const today = getLocalDateString();
      const { data: timeLog, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to handle no logs for today

      if (error && error.code !== 'PGRST116') {
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
      setIsSignedIn(false);
      setSignInTime(null);
    }
  };

  const fetchTotalHours = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const month = getCurrentMonth();
      const year = getCurrentYear();

      const { data: monthlyRecord, error: monthlyError } = await supabase
        .from('monthly_salary_history')
        .select('total_hours, total_salary')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle(); // Use maybeSingle as record might not exist

      if (monthlyError && monthlyError.code !== 'PGRST116') throw monthlyError;

      if (monthlyRecord) {
        setHoursWorked(monthlyRecord.total_hours || 0); // Ensure fallback to 0 if null
        setCurrentMonthSalary(monthlyRecord.total_salary || 0); // Ensure fallback to 0 if null
      } else {
        setHoursWorked(0);
        setCurrentMonthSalary(0);
      }

    } catch (error) {
      console.error('Error fetching total hours:', error);
      setHoursWorked(0); // Set defaults on error
      setCurrentMonthSalary(0);
    } finally {
      setLoading(false); // Set loading to false after all essential data is fetched or attempted
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

  const progressPercentage = requiredHours > 0 ? (hoursWorked / requiredHours) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-slate-800/30 backdrop-blur-md rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-blue-500">
              <AvatarImage src={internAvatar} alt={internName} />
              <AvatarFallback className="bg-blue-600 text-white">
                {internName?.charAt(0).toUpperCase() || internEmail?.charAt(0).toUpperCase() || 'I'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Hi, {internName || 'Intern'}!
              </h1>
              <p className="text-slate-400">Track your internship progress</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Hours Progress</CardTitle>
            <CardDescription className="text-slate-400">
              Total hours completed: {hoursWorked.toFixed(2)} / {requiredHours}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-3 rounded-full bg-slate-700" /> 
            {/* Removed explicit indicator class, rely on default Progress styling or customize via its own props/variant */}
            <div className="flex justify-between text-sm text-slate-400">
              <span>{hoursWorked.toFixed(2)} hours</span>
              <span>{requiredHours} hours</span>
            </div>
          </CardContent>
        </Card>

        {/* Time Tracking Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status indicator */}
              <div className="text-center">
                {isSignedIn ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-green-400 text-sm font-medium">Currently signed in</span>
                    </div>
                    {signInTime && (
                      <p className="text-xs text-slate-400">
                        Signed in at {new Date(signInTime).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20">
                    <div className="w-2 h-2 bg-slate-500 rounded-full mr-2"></div>
                    <span className="text-slate-400 text-sm font-medium">Currently signed out</span>
                  </div>
                )}
              </div>
              
              {/* Dynamic QR scan button */}
              <Button 
                onClick={() => setShowScanner(true)}
                className={`w-full font-semibold py-3 rounded-lg shadow-md transition duration-150 ease-in-out ${
                  isSignedIn 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={showScanner} 
              >
                <QrCode className="w-5 h-5 mr-2" />
                {isSignedIn ? "Time Out" : "Time In"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Earnings Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Monthly Earnings</CardTitle>
            <CardDescription className="text-slate-400">
              Your estimated salary for the current month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              ₱{currentMonthSalary.toFixed(2)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Based on {hoursWorked.toFixed(2)} hours completed this month.
            </p>
          </CardContent>
        </Card>

        {showScanner && (
          <QRScanner 
            onClose={() => {
              setShowScanner(false);
              // Immediately refresh data after scanner closes
              setTimeout(() => {
                fetchTodayStatus();
                fetchTotalHours();
              }, 500);
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default InternDashboard;
