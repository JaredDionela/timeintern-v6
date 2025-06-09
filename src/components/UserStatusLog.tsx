import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
          const { data: latestTodayLog, error: latestTodayLogError } = await supabase
            .from('time_logs')
            .select('time_in, time_out')
            .eq('user_id', profile.user_id)
            .eq('date', today)
            .order('created_at', { ascending: false }) // Get the latest log for the day
            .limit(1)
            .maybeSingle(); // Use maybeSingle to handle cases where there's no log for today

          // Optional: Log error if fetching latest log fails
          // if (latestTodayLogError) {
          //   console.error(`Error fetching latest log for ${profile.name}:`, latestTodayLogError);
          // }

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

          const progressStatus = completedHours >= profile.required_hours ? "Completed" : "In Progress";

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            required_hours: profile.required_hours,
            completed_hours: completedHours, // This was missing, ensure it's defined from your existing logic
            status: progressStatus, 
            is_online: isOnline, 
            last_activity: recentActivity?.time_in || null // This was missing, ensure it's defined
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
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>User Status Log ({totalInterns} Interns)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Online Status</TableHead>
                <TableHead>Progress Status</TableHead>
                <TableHead>Completed Hours</TableHead>
                <TableHead>Required Hours</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interns.map((intern) => (
                <TableRow key={intern.id}>
                  <TableCell className="font-medium">{intern.name}</TableCell>
                  <TableCell>{intern.email}</TableCell>
                  <TableCell>
                    <Badge variant={intern.is_online ? "default" : "outline"}> {/* Changed "success" to "default" */}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatusLog;
