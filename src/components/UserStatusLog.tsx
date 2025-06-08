import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface InternStatus {
  id: string;
  name: string;
  email: string;
  required_hours: number;
  completed_hours: number;
  status: string;
  is_online: boolean;
  last_activity?: string | null;
}

const UserStatusLog = () => {
  const [interns, setInterns] = useState<InternStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [totalInterns, setTotalInterns] = useState(0);

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

  const fetchInternData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('*')
        .order('name', { ascending: true });

      if (profilesError) throw profilesError;
      
      setTotalInterns(profiles?.length || 0);

      const internData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get total hours from monthly_salary_history for current month
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          const { data: monthlyRecord } = await supabase
            .from('monthly_salary_history')
            .select('total_hours')
            .eq('user_id', profile.user_id)
            .eq('month', month)
            .eq('year', year)
            .single();

          let completedHours = monthlyRecord?.total_hours || 0;

          // Check if user is currently online (has time_in but no time_out today)
          const today = new Date().toISOString().split('T')[0];
          const { data: todayLog } = await supabase
            .from('time_logs')
            .select('time_in, time_out')
            .eq('user_id', profile.user_id)
            .eq('date', today)
            .single();

          let isOnline = false;
          if (todayLog && todayLog.time_in && !todayLog.time_out) {
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

          const progressStatus = completedHours >= profile.required_hours ? "Completed" : "In Progress";

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            required_hours: profile.required_hours,
            completed_hours: completedHours,
            status: progressStatus,
            is_online: isOnline,
            last_activity: recentActivity?.time_in || null
          };
        })
      );

      setInterns(internData);
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

  const calculateSalary = (hours: number) => {
    // Calculate salary based on completed 8-hour blocks
    const rate = 200; // 200 pesos per 8 hours
    const blocks = Math.floor(hours / 8);
    return blocks * rate;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading intern data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Status Log
              </CardTitle>
              <CardDescription className="text-slate-400">
                Total Interns: {totalInterns}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {interns.map((intern, index) => {
              const progressPercentage = (intern.completed_hours / intern.required_hours) * 100;
              const hoursLeft = Math.max(0, intern.required_hours - intern.completed_hours);
              const salary = calculateSalary(intern.completed_hours);
              
              return (
                <div key={index} className="bg-slate-700/30 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{intern.name}</h3>
                      <p className="text-slate-400 text-sm">{intern.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        intern.is_online 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {intern.is_online ? "Online" : "Offline"}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        intern.status === "Completed" 
                          ? "bg-blue-500/20 text-blue-400" 
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {intern.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Hours Progress</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-400">{intern.completed_hours}h completed</span>
                        <span className="text-slate-400">{hoursLeft}h left</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-slate-400 text-sm">Required Hours</div>
                      <div className="text-white font-semibold">{intern.required_hours}h</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <DollarSign className="w-4 h-4" />
                        Salary Earned
                      </div>
                      <div className="text-green-400 font-semibold">₱{salary.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">
                        {Math.floor(intern.completed_hours / 8)} × 8hr blocks
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {interns.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No intern data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatusLog;
