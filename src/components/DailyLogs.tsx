import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DailyLogEntry {
  id: string;
  date: string;
  intern_name: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number | null;
  user_id: string;
}

const DailyLogs = () => {
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDailyLogs();
  }, [selectedDate]);

  useEffect(() => {
    filterLogs();
  }, [dailyLogs, searchTerm]);

  const fetchDailyLogs = async () => {
    try {
      setLoading(true);
      
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('date', selectedDate)
        .order('time_in', { ascending: true });

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
        date: entry.date,
        user_id: entry.user_id,
        intern_name: profilesMap[entry.user_id] || 'Unknown',
        time_in: entry.time_in ? new Date(entry.time_in).toLocaleTimeString() : null,
        time_out: entry.time_out ? new Date(entry.time_out).toLocaleTimeString() : null,
        total_hours: entry.total_hours
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

  const filterLogs = () => {
    if (!searchTerm) {
      setFilteredLogs(dailyLogs);
      return;
    }

    const filtered = dailyLogs.filter(log =>
      log.intern_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Intern Name', 'Time In', 'Time Out', 'Total Hours'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(entry => [
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
    a.download = `daily_logs_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Daily logs for ${selectedDate} exported successfully`,
    });
  };

  const exportAllLogs = async () => {
    try {
      setLoading(true);
      
      const { data: allTimeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .order('date', { ascending: false })
        .order('time_in', { ascending: true });

      if (timeLogsError) throw timeLogsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {} as Record<string, string>);

      const allFormattedData = (allTimeLogsData || []).map(entry => ({
        date: entry.date,
        intern_name: profilesMap[entry.user_id] || 'Unknown',
        time_in: entry.time_in ? new Date(entry.time_in).toLocaleTimeString() : 'N/A',
        time_out: entry.time_out ? new Date(entry.time_out).toLocaleTimeString() : 'N/A',
        total_hours: entry.total_hours || 0
      }));

      const headers = ['Date', 'Intern Name', 'Time In', 'Time Out', 'Total Hours'];
      const csvContent = [
        headers.join(','),
        ...allFormattedData.map(entry => [
          entry.date,
          entry.intern_name,
          entry.time_in,
          entry.time_out,
          entry.total_hours
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_daily_logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "All daily logs exported successfully",
      });
    } catch (error) {
      console.error('Error exporting all logs:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export all logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white/5 rounded-lg p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-300">Loading logs...</p>
        </div>
      </div>
    );
  }

  if (!dailyLogs || dailyLogs.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">No logs found for the selected date.</div>
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
              View and export daily attendance logs for all interns
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Date
            </Button>
            <Button 
              onClick={exportAllLogs}
              variant="outline"
              size="sm"
              className="bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">
                Select Date
              </label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-slate-300 mb-1">
                Search Intern
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by intern name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white pl-10"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Intern</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Time In</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Time Out</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((entry, index) => (
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
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                {searchTerm ? 'No interns found matching your search' : 'No logs found for this date'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyLogs;
