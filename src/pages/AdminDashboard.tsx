import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  QrCode,
  ListChecks,
  CalendarDays,
  History,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// Import dashboard components
import RecentActivity from "@/components/RecentActivity";
import QRGenerator from "@/components/QRGenerator";
import DailyLogs from "@/components/DailyLogs";
import MonthlySummary from "@/components/MonthlySummary";
import MonthlySalaryHistory from "@/components/MonthlySalaryHistory";
import UserStatusLog from "@/components/UserStatusLog";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile(); // Use the hook
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // State for mobile nav
  const [adminName, setAdminName] = useState("Admin"); // Default admin name
  const [adminAvatar, setAdminAvatar] = useState(""); // Default or no avatar

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No valid session, redirecting to login');
          navigate('/');
          return;
        }
        
        if (!session.user?.email?.includes('admin')) {
          console.log('User is not admin, redirecting');
          navigate('/');
          return;
        }
        
        console.log('Auth check passed for admin:', session.user.email);
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/');
      }
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

  const navItems = [
    { value: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { value: "qr-generator", label: "QR Generator", icon: <QrCode className="w-4 h-4 mr-2" /> },
    { value: "daily-logs", label: "Daily Logs", icon: <ListChecks className="w-4 h-4 mr-2" /> },
    { value: "monthly-summary", label: "Monthly Summary", icon: <CalendarDays className="w-4 h-4 mr-2" /> },
    { value: "salary-history", label: "Salary History", icon: <History className="w-4 h-4 mr-2" /> },
    { value: "user-status", label: "User Status", icon: <Users className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      
      {/* Header */}
      <header className="max-w-full mx-auto w-full mb-4 sm:mb-6 relative z-10 bg-slate-800/30 backdrop-blur-md rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
           
            <Avatar className="h-10 w-10 border-2 border-blue-500">
              <AvatarImage src={adminAvatar} alt={adminName} />
              <AvatarFallback className="bg-blue-600 text-white">
                {adminName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Welcome, {adminName}.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="text-slate-400 hover:text-white md:hidden"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer/Panel */}
      {isMobile && mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="fixed top-0 left-0 h-full w-64 bg-slate-800 p-4 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <img 
        src="/app-logo.png" 
        alt="TimeIntern Logo" 
        className="h-16 w-16 object-contain"
      />
              <h2 className="text-lg font-semibold text-white">Time Intern</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.value}
                  variant={activeTab === item.value ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab(item.value);
                    setMobileNavOpen(false);
                  }}
                  className="w-full justify-start text-white"
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-full mx-auto w-full flex-grow relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Desktop Navigation Tabs */}
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 bg-slate-800/50 border-slate-700 h-auto p-1 gap-1">
              {navItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  {item.icon}
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-6">
            <RecentActivity />
          </TabsContent>

          <TabsContent value="qr-generator">
            <QRGenerator />
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
      </main>
    </div>
  );
};

export default AdminDashboard;
