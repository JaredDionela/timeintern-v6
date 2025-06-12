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
import { Search, Filter, Download, Users, Clock, TrendingUp, AlertCircle } from "lucide-react";
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
      'Required Hours', 'Salary (Regular Days Only)', 'Last Activity'
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

  const calculateSalary = (daysWorked: number) => {
    // FIXED DAILY SALARY: ₱200 per day worked, regardless of hours
    const dailyRate = 200;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-white">{stats.totalHours.toFixed(1)}</p>
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
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                        <div className="text-xs text-slate-400 mt-1">
                          (Excludes OT/WFH)
                        </div>
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
