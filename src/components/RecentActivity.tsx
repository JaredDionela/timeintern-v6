import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getLocalDateString } from "@/lib/dateUtils";

interface ActivityLog {
  id: string;
  intern_name: string;
  action: string;
  time: string;
  date: string;
}

const RecentActivity = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodaysActivity();

    // Set up real-time subscription for today's activity
    const channel = supabase
      .channel('todays_activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        () => {
          fetchTodaysActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchTodaysActivity = async () => {
    try {
      const today = getLocalDateString();
      
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (timeLogsError) throw timeLogsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {} as Record<string, string>);

      // Create activity logs from time logs
      const activityLogs: ActivityLog[] = [];
      
      (timeLogsData || []).forEach(log => {
        const internName = profilesMap[log.user_id] || 'Unknown Intern';
        
        if (log.time_in) {
          activityLogs.push({
            id: `${log.id}-in`,
            intern_name: internName,
            action: 'Time In',
            time: new Date(log.time_in).toLocaleTimeString(),
            date: log.date
          });
        }
        
        if (log.time_out) {
          activityLogs.push({
            id: `${log.id}-out`,
            intern_name: internName,
            action: 'Time Out',
            time: new Date(log.time_out).toLocaleTimeString(),
            date: log.date
          });
        }
      });

      // Sort by time (most recent first)
      activityLogs.sort((a, b) => {
        const timeA = new Date(`${a.date} ${a.time}`).getTime();
        const timeB = new Date(`${b.date} ${b.time}`).getTime();
        return timeB - timeA;
      });

      setActivities(activityLogs.slice(0, 10)); // Show only last 10 activities
    } catch (error) {
      console.error('Error fetching today\'s activity:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recent activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading recent activity...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-slate-400">
          Today's check-ins and check-outs (resets daily)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    activity.action === 'Time In' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{activity.intern_name}</div>
                    <div className="text-slate-400 text-sm">{activity.action}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-sm">{activity.time}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              No activity today yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
