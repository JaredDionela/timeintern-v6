import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, QrCode, Users, Calendar, DollarSign, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import QRGenerator from "@/components/QRGenerator";
import MonthlySummary from "@/components/MonthlySummary";
import UserStatusLog from "@/components/UserStatusLog";
import MonthlySalaryHistory from "@/components/MonthlySalaryHistory";
import DailyLogs from "@/components/DailyLogs";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate('/');
        return;
      }
      
      // Verify if user is admin by checking email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email?.includes('admin')) {
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
          <div className="text-white">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">Welcome, Admin.</p>
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6" >
          <TabsList className="grid w-full grid-cols-6 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="qr-generator" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <QrCode className="w-4 h-4 mr-2" />
              QR Generator
            </TabsTrigger>
            <TabsTrigger value="daily-logs" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Daily Logs
            </TabsTrigger>
            <TabsTrigger value="monthly-summary" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Monthly Summary
            </TabsTrigger>
            <TabsTrigger value="salary-history" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Salary History
            </TabsTrigger>
            <TabsTrigger value="user-status" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              User Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Quick QR Generator
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Generate QR codes for intern time tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QRGenerator />
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Today's Activity
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Current user status and recent activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserStatusLog />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="qr-generator">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code Generator
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Generate secure QR codes that expire every 5 seconds
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <QRGenerator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily-logs">
            <DailyLogs />
          </TabsContent>

          <TabsContent value="monthly-summary">
            <MonthlySummary />
          </TabsContent>

          <TabsContent value="salary-history">
            <MonthlySalaryHistory />
          </TabsContent>

          <TabsContent value="user-status">
            <UserStatusLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
