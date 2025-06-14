import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Download, Users, Clock, TrendingUp, AlertCircle, FileText, Calendar, DollarSign } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";

interface InternStatus {
  id: string;
  name: string;
  email: string;
  required_hours: number;
  completed_hours: number;
  regular_hours: number;
  overtime_hours: number;
  wfh_hours: number;
  calculated_salary: number;
  status: string;
  is_online: boolean;
  last_activity?: string | null;
}

interface DailyLog {
  date: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number;
  log_type: string | null;
}

interface LogBreakdown {
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  wfh_hours: number;
  days_worked: number;
  regular_days: number;
  calculated_salary: number;
}

interface DashboardStats {
  totalInterns: number;
  onlineInterns: number;
  completedInterns: number;
  totalHours: number;
}

const UserStatusLog = () => {
  const [interns, setInterns] = useState<InternStatus[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<InternStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [selectedIntern, setSelectedIntern] = useState<string>("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterns: 0,
    onlineInterns: 0,
    completedInterns: 0,
    totalHours: 0
  });
  const { toast } = useToast();

  // Set up real-time subscription
  useEffect(() => {
    fetchInternData();
    
    // Subscribe to time_logs changes
    const timeLogsSubscription = supabase
      .channel('time_logs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'time_logs' }, 
        () => {
          fetchInternData();
        }
      )
      .subscribe();

    return () => {
      timeLogsSubscription.unsubscribe();
    };
  }, []);

  // Filter interns based on search and filters
  useEffect(() => {
    let filtered = interns;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(intern => 
        intern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(intern => 
        statusFilter === "completed" ? intern.status === "Completed" : intern.status === "In Progress"
      );
    }

    // Online status filter
    if (onlineFilter !== "all") {
      filtered = filtered.filter(intern => 
        onlineFilter === "online" ? intern.is_online : !intern.is_online
      );
    }

    setFilteredInterns(filtered);
  }, [interns, searchTerm, statusFilter, onlineFilter]);

  const fetchInternData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('*')
        .order('name', { ascending: true });

      if (profilesError) throw profilesError;

      const internData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get detailed log breakdown for current month
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          // Get monthly breakdown using the new function
          const { data: breakdownResponse } = await supabase
            .rpc('get_monthly_log_breakdown', {
              p_user_id: profile.user_id,
              p_month: month,
              p_year: year
            });

          // Parse the JSON response
          let logBreakdown: LogBreakdown = {
            total_hours: 0,
            regular_hours: 0,
            overtime_hours: 0,
            wfh_hours: 0,
            days_worked: 0,
            regular_days: 0,
            calculated_salary: 0
          };

          if (breakdownResponse && typeof breakdownResponse === 'object') {
            const breakdown = breakdownResponse as any;
            logBreakdown = {
              total_hours: breakdown.total_hours || 0,
              regular_hours: breakdown.regular_hours || 0,
              overtime_hours: breakdown.overtime_hours || 0,
              wfh_hours: breakdown.wfh_hours || 0,
              days_worked: breakdown.days_worked || 0,
              regular_days: breakdown.regular_days || 0,
              calculated_salary: breakdown.calculated_salary || 0
            };
          }

          // Check if user is currently online (has time_in but no time_out today)
          const today = getLocalDateString();
          const { data: latestTodayLog } = await supabase
            .from('time_logs')
            .select('time_in, time_out')
            .eq('user_id', profile.user_id)
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let isOnline = false;
          if (latestTodayLog && latestTodayLog.time_in && !latestTodayLog.time_out) {
            isOnline = true;
          }

          // Get most recent activity (any time_in)
          const { data: recentActivity } = await supabase
            .from('time_logs')
            .select('time_in')
            .eq('user_id', profile.user_id)
            .not('time_in', 'is', null)
            .order('date', { ascending: false })
            .order('time_in', { ascending: false })
            .limit(1)
            .single();

          const progressStatus = logBreakdown.total_hours >= profile.required_hours ? "Completed" : "In Progress";

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            required_hours: profile.required_hours,
            completed_hours: logBreakdown.total_hours,
            regular_hours: logBreakdown.regular_hours,
            overtime_hours: logBreakdown.overtime_hours,
            wfh_hours: logBreakdown.wfh_hours,
            calculated_salary: logBreakdown.calculated_salary,
            status: progressStatus, 
            is_online: isOnline, 
            last_activity: recentActivity?.time_in || null
          };
        })
      );

      setInterns(internData);

      // Calculate dashboard stats
      const dashboardStats: DashboardStats = {
        totalInterns: internData.length,
        onlineInterns: internData.filter(intern => intern.is_online).length,
        completedInterns: internData.filter(intern => intern.status === "Completed").length,
        totalHours: internData.reduce((sum, intern) => sum + intern.completed_hours, 0)
      };
      setStats(dashboardStats);

    } catch (error) {
      console.error('Error fetching intern data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch intern data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvHeaders = [
      'Name', 'Email', 'Online Status', 'Progress Status', 
      'Regular Hours', 'Overtime Hours', 'WFH Hours', 'Total Hours', 
      'Required Hours', 'Salary (Regular Only)', 'Last Activity'
    ];
    
    const csvData = filteredInterns.map(intern => [
      intern.name,
      intern.email,
      intern.is_online ? 'Online' : 'Offline',
      intern.status,
      intern.regular_hours.toFixed(2),
      intern.overtime_hours.toFixed(2),
      intern.wfh_hours.toFixed(2),
      intern.completed_hours.toFixed(2),
      intern.required_hours,
      intern.calculated_salary.toLocaleString(),
      intern.last_activity ? new Date(intern.last_activity).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `intern_status_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportInternComprehensiveData = async (internId: string) => {
    if (internId === "all") {
      toast({
        title: "Please Select an Intern",
        description: "Please select a specific intern to export their data.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    
    try {
      const selectedInternData = interns.find(intern => intern.id === internId);
      if (!selectedInternData) throw new Error("Intern not found");

      // Get intern's user_id from intern_profiles
      const { data: profile, error: profileError } = await supabase
        .from('intern_profiles')
        .select('user_id, name, email, required_hours')
        .eq('id', internId)
        .single();

      if (profileError) throw profileError;

      // Get all daily logs for the intern
      const { data: dailyLogs, error: logsError } = await supabase
        .from('time_logs')
        .select('date, time_in, time_out, total_hours, log_type')
        .eq('user_id', profile.user_id)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      // Get monthly breakdown for current year
      const currentYear = new Date().getFullYear();
      const monthlyBreakdowns = [];
      
      for (let month = 1; month <= 12; month++) {
        const { data: breakdown } = await supabase
          .rpc('get_monthly_log_breakdown', {
            p_user_id: profile.user_id,
            p_month: month,
            p_year: currentYear
          });

        if (breakdown) {
          const breakdownData = breakdown as unknown as LogBreakdown;
          monthlyBreakdowns.push({
            month: month,
            year: currentYear,
            ...breakdownData
          });
        }
      }

      // Create comprehensive CSV content
      const csvSections = [];

      // 1. Intern Information
      csvSections.push("=== INTERN INFORMATION ===");
      csvSections.push(`Name,${profile.name}`);
      csvSections.push(`Email,${profile.email}`);
      csvSections.push(`Required Hours,${profile.required_hours}`);
      csvSections.push(`Current Status,${selectedInternData.status}`);
      csvSections.push("");

      // 2. Current Month Summary
      const currentMonth = new Date().getMonth() + 1;
      const currentMonthData = monthlyBreakdowns.find(m => m.month === currentMonth);
      csvSections.push("=== CURRENT MONTHLY SUMMARY ===");
      csvSections.push(`Month,${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}`);
      csvSections.push(`Total Hours,${currentMonthData?.total_hours?.toFixed(2) || '0.00'}`);
      csvSections.push(`Regular Hours,${currentMonthData?.regular_hours?.toFixed(2) || '0.00'}`);
      csvSections.push(`Overtime Hours,${currentMonthData?.overtime_hours?.toFixed(2) || '0.00'}`);
      csvSections.push(`WFH Hours,${currentMonthData?.wfh_hours?.toFixed(2) || '0.00'}`);
      csvSections.push(`Days Worked,${currentMonthData?.days_worked || 0}`);
      csvSections.push(`Regular Days,${currentMonthData?.regular_days || 0}`);
      csvSections.push(`Calculated Salary,₱${currentMonthData?.calculated_salary?.toFixed(2) || '0.00'}`);
      csvSections.push("");

      // 3. All Monthly Summaries
      csvSections.push("=== ALL MONTHLY SUMMARIES (Current Year) ===");
      csvSections.push("Month,Total Hours,Regular Hours,Overtime Hours,WFH Hours,Days Worked,Regular Days,Calculated Salary");
      monthlyBreakdowns.forEach(breakdown => {
        const monthName = new Date(breakdown.year, breakdown.month - 1).toLocaleString('default', { month: 'long' });
        csvSections.push(`${monthName} ${breakdown.year},${breakdown.total_hours?.toFixed(2) || '0.00'},${breakdown.regular_hours?.toFixed(2) || '0.00'},${breakdown.overtime_hours?.toFixed(2) || '0.00'},${breakdown.wfh_hours?.toFixed(2) || '0.00'},${breakdown.days_worked || 0},${breakdown.regular_days || 0},₱${breakdown.calculated_salary?.toLocaleString() || '0.00'}`);
      });
      csvSections.push("");

      // 4. All Daily Logs
      csvSections.push("=== ALL DAILY LOGS ===");
      csvSections.push("Date,Time In,Time Out,Total Hours,Log Type");
      (dailyLogs || []).forEach(log => {
        csvSections.push(`${log.date},${log.time_in || 'N/A'},${log.time_out || 'N/A'},${log.total_hours?.toFixed(2) || '0.00'},${log.log_type || 'Regular'}`);
      });
      csvSections.push("");

      const csvContent = csvSections.join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${profile.name.replace(/\s+/g, '_')}_ARIVA_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Comprehensive report for ${profile.name} exported successfully`,
      });

    } catch (error) {
      console.error('Error exporting comprehensive data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export comprehensive data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const calculateSalary = (daysWorked: number) => {
    // UPDATED HOURLY SALARY STRUCTURE:
    // This is for display purposes only - actual calculation is done in the database
    // ₱25/hour for regular hours up to 8 hours per day, unpaid for hours over 8
    const dailyRate = 200; // Maximum daily rate for reference
    return daysWorked * dailyRate;
  };

  // Update the component to fetch and use regular hours breakdown
  const fetchMonthlyBreakdown = async (userId: string) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_log_breakdown', {
          p_user_id: userId,
          p_month: currentMonth,
          p_year: currentYear
        });
    
      if (error) throw error;
    
      if (!data) {
        return { totalHours: 0, regularHours: 0, calculatedSalary: 0 };
      }

      const breakdownData = data as unknown as {
        total_hours: number;
        regular_hours: number;
        overtime_hours: number;
        wfh_hours: number;
        days_worked: number;
        calculated_salary: number;
      };
    
      return {
        totalHours: breakdownData.total_hours || 0,
        regularHours: breakdownData.regular_hours || 0,
        calculatedSalary: breakdownData.calculated_salary || 0
      };
    } catch (error) {
      console.error('Error fetching monthly breakdown:', error);
      return { totalHours: 0, regularHours: 0, calculatedSalary: 0 };
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>User Status Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 justify-center">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-400">Total Interns</p>
                <p className="text-2xl font-bold text-white">{stats.totalInterns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-slate-400">Online Now</p>
                <p className="text-2xl font-bold text-white">{stats.onlineInterns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-white">{stats.completedInterns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Status Log ({filteredInterns.length} of {stats.totalInterns})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export All CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Intern Selection and Comprehensive Export */}
          <div className="mb-6 p-4 bg-slate-700/20 rounded-lg border border-slate-600">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Individual Intern Report
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedIntern} onValueChange={setSelectedIntern}>
                  <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select an intern for comprehensive report" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select an intern...</SelectItem>
                    {interns.map((intern) => (
                      <SelectItem key={intern.id} value={intern.id}>
                        {intern.name} ({intern.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => exportInternComprehensiveData(selectedIntern)}
                disabled={selectedIntern === "all" || exportLoading}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                {exportLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Export Full Report
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Exports comprehensive data including daily logs, monthly summaries, salary calculations, and status information.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={onlineFilter} onValueChange={setOnlineFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Filter by online status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="online">Online Only</SelectItem>
                <SelectItem value="offline">Offline Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Hours</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Online Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Required Hours</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterns.map((intern) => (
                    <TableRow key={intern.id}>
                      <TableCell className="font-medium">{intern.name}</TableCell>
                      <TableCell>{intern.email}</TableCell>
                      <TableCell>
                        <Badge variant={intern.is_online ? "default" : "outline"}>
                          {intern.is_online ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={intern.status === "Completed" ? "default" : "secondary"}>
                          {intern.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{intern.completed_hours.toFixed(2)}</TableCell>
                      <TableCell>{intern.required_hours}</TableCell>
                      <TableCell>
                        {intern.last_activity 
                          ? new Date(intern.last_activity).toLocaleString() 
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="detailed" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>WFH Hours</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Salary (Regular Only)</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterns.map((intern) => (
                    <TableRow key={intern.id}>
                      <TableCell className="font-medium">{intern.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                          {intern.regular_hours.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                          {intern.overtime_hours.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {intern.wfh_hours.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {intern.completed_hours.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-400 font-bold">₱{intern.calculated_salary.toLocaleString()}</span>
                     
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${intern.status === "Completed" ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min((intern.completed_hours / intern.required_hours) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {((intern.completed_hours / intern.required_hours) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatusLog;
