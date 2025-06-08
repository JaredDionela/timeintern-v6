import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TimeLogEntry {
  date: string;
  intern_name: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number | null;
}

const MonthlySummary = () => {
  const [monthlyData, setMonthlyData] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMonthlyData();
  }, []);

  const fetchMonthlyData = async () => {
    try {
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .order('date', { ascending: false });

      if (timeLogsError) throw timeLogsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {} as Record<string, string>);

      const formattedData = (timeLogsData || []).map(entry => ({
        date: entry.date,
        intern_name: profilesMap[entry.user_id] || 'Unknown',
        time_in: entry.time_in ? new Date(entry.time_in).toLocaleTimeString() : null,
        time_out: entry.time_out ? new Date(entry.time_out).toLocaleTimeString() : null,
        total_hours: entry.total_hours
      }));

      setMonthlyData(formattedData);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monthly data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Intern', 'Time In', 'Time Out', 'Hours'];
    const csvContent = [
      headers.join(','),
      ...monthlyData.map(entry => [
        entry.date,
        entry.intern_name,
        entry.time_in || 'N/A',
        entry.time_out || 'N/A',
        entry.total_hours || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly_summary.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading monthly data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Summary
            </CardTitle>
            <CardDescription className="text-slate-400">
              Daily attendance logs for all interns
            </CardDescription>
          </div>
          <Button 
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Intern</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Time In</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Time Out</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((entry, index) => (
                <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-slate-200">{entry.date}</td>
                  <td className="py-3 px-4 text-white font-medium">{entry.intern_name}</td>
                  <td className="py-3 px-4 text-green-400">{entry.time_in || 'N/A'}</td>
                  <td className="py-3 px-4 text-red-400">{entry.time_out || 'N/A'}</td>
                  <td className="py-3 px-4 text-blue-400 font-semibold">{entry.total_hours || 0}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthlyData.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummary;
