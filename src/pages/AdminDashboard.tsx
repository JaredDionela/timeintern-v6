import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, QrCode, Users, Calendar, DollarSign, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import QRGenerator from "@/components/QRGenerator";
import MonthlySummary from "@/components/MonthlySummary";
import UserStatusLog from "@/components/UserStatusLog";
import MonthlySalaryHistory from "@/components/MonthlySalaryHistory";
import DailyLogs from "@/components/DailyLogs";
import RecentActivity from "@/components/RecentActivity";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">Welcome, Admin.</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="text-left sm:text-right">
              <div className="text-white font-semibold text-sm sm:text-base">{currentTime.toLocaleTimeString()}</div>
              <div className="text-slate-400 text-xs sm:text-sm">{currentTime.toLocaleDateString()}</div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile Navigation Dropdown */}
          <div className="block sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-slate-800/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">🏠 Home</SelectItem>
                <SelectItem value="qr-generator">📱 QR Generator</SelectItem>
                <SelectItem value="daily-logs">📅 Daily Logs</SelectItem>
                <SelectItem value="monthly-summary">📄 Monthly Summary</SelectItem>
                <SelectItem value="salary-history">💰 Salary History</SelectItem>
                <SelectItem value="user-status">👥 User Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Navigation Tabs */}
          <TabsList className="hidden sm:grid w-full grid-cols-3 lg:grid-cols-6 bg-slate-800/50 border-slate-700 h-auto p-1 gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="qr-generator" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0">
              <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">QR Generator</span>
            </TabsTrigger>
            <TabsTrigger value="daily-logs" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Daily Logs</span>
            </TabsTrigger>
            <TabsTrigger value="monthly-summary" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0 lg:flex hidden">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Monthly Summary</span>
            </TabsTrigger>
            <TabsTrigger value="salary-history" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0 lg:flex hidden">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Salary History</span>
            </TabsTrigger>
            <TabsTrigger value="user-status" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs sm:text-sm px-1 sm:px-2 py-2 flex-shrink-0 min-w-0 lg:flex hidden">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">User Status</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RecentActivity />
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
