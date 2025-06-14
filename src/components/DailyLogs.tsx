import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getLocalDateString, formatLocalTime } from "@/lib/dateUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TimeLogEntry {
  id: string;
  user_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number | null;
  log_type: string | null;
  intern_name: string;
}

const DailyLogs = () => {
  const [dailyLogs, setDailyLogs] = useState<TimeLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDailyLogs();
  }, [selectedDate]);

  useEffect(() => {
    // Filter logs based on search term
    if (searchTerm.trim() === '') {
      setFilteredLogs(dailyLogs);
    } else {
      const filtered = dailyLogs.filter(log =>
        log.intern_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    }
  }, [dailyLogs, searchTerm]);

  const fetchDailyLogs = async () => {
    try {
      setLoading(true);
      
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('date', selectedDate)
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

      const formattedData = (timeLogsData || []).map(entry => ({
        id: entry.id,
        user_id: entry.user_id,
        date: entry.date,
        time_in: entry.time_in,
        time_out: entry.time_out,
        total_hours: entry.total_hours,
        log_type: entry.log_type,
        intern_name: profilesMap[entry.user_id] || 'Unknown'
      }));

      setDailyLogs(formattedData);
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Log deleted successfully",
      });

      fetchDailyLogs(); // Refresh the logs
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "Error",
        description: "Failed to delete log",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Intern Name', 'Time In', 'Time Out', 'Total Hours', 'Log Type'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(entry => [
        entry.date,
        `"${entry.intern_name}"`,
        entry.time_in ? formatLocalTime(entry.time_in) : 'N/A',
        entry.time_out ? formatLocalTime(entry.time_out) : 'N/A',
        entry.total_hours?.toFixed(2) || '0.00',
        entry.log_type || 'Regular'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_logs_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Daily logs for ${selectedDate} exported successfully`,
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading daily logs...</div>
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
              Daily Logs
            </CardTitle>
            <CardDescription className="text-slate-400">
              ({filteredLogs.length} entries)
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
        <div className="mt-4 flex gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto bg-slate-700 border-slate-600 text-white"
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by intern name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
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
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Total Hours</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Log Type</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-slate-200">{entry.date}</td>
                  <td className="py-3 px-4 text-white font-medium">{entry.intern_name}</td>
                  <td className="py-3 px-4 text-green-400">
                    {entry.time_in ? formatLocalTime(entry.time_in) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-red-400">
                    {entry.time_out ? formatLocalTime(entry.time_out) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-blue-400 font-semibold">
                    {entry.total_hours?.toFixed(2) || '0.00'}h
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={entry.log_type === 'wfh' ? 'outline' : entry.log_type === 'overtime' ? 'destructive' : 'default'}>
                      {entry.log_type || 'Regular'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete Log Entry</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Are you sure you want to delete this log entry for {entry.intern_name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteLog(entry.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              {searchTerm ? `No logs found for "${searchTerm}"` : `No logs available for ${selectedDate}`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyLogs;
