import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentMonth, getCurrentYear, formatLocalTime } from "@/lib/dateUtils";

interface TimeLogEntry {
  date: string;
  intern_name: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number | null;
  log_type: string | null;
}

const MonthlySummary = () => {
  const [monthlyData, setMonthlyData] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const { toast } = useToast();

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      
      // Get time logs for selected month/year
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (timeLogsError) throw timeLogsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {} as Record<string, string>);      const formattedData = (timeLogsData || []).map(entry => ({
        date: entry.date,
        intern_name: profilesMap[entry.user_id] || 'Unknown',
        time_in: entry.time_in ? formatLocalTime(entry.time_in) : null,
        time_out: entry.time_out ? formatLocalTime(entry.time_out) : null,
        total_hours: entry.total_hours,
        log_type: entry.log_type
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
  };  const exportToCSV = () => {
    const headers = ['Date', 'Intern Name', 'Time In', 'Time Out', 'Total Hours', 'Log Type'];
    const csvContent = [
      headers.join(','),
      ...monthlyData.map(entry => [
        entry.date,
        `"${entry.intern_name}"`,
        entry.time_in || 'N/A',
        entry.time_out || 'N/A',
        entry.total_hours?.toFixed(2) || '0.00',
        entry.log_type || 'Regular'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly_summary_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Monthly summary for ${selectedMonth}/${selectedYear} exported successfully`,
    });
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
          <Select onValueChange={(value) => setSelectedMonth(Number(value))} defaultValue={`${selectedMonth}`}>
            <SelectTrigger className="w-[120px] bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={`${month.value}`}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setSelectedYear(Number(value))} defaultValue={`${selectedYear}`}>
            <SelectTrigger className="w-[100px] bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={`${year}`}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Intern</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Time In</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Time Out</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Total Hours</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Log Type</th>
              </tr>
            </thead>            <tbody>
              {monthlyData.map((entry, index) => (
                <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-slate-200">{entry.date}</td>
                  <td className="py-3 px-4 text-white font-medium">{entry.intern_name}</td>
                  <td className="py-3 px-4 text-green-400">{entry.time_in || 'N/A'}</td>
                  <td className="py-3 px-4 text-red-400">{entry.time_out || 'N/A'}</td>
                  <td className="py-3 px-4 text-blue-400 font-semibold">{entry.total_hours?.toFixed(2) || '0.00'}h</td>
                  <td className="py-3 px-4">
                    <Badge variant={entry.log_type === 'wfh' ? 'outline' : entry.log_type === 'overtime' ? 'destructive' : 'default'}>
                      {entry.log_type || 'Regular'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthlyData.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No data available for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummary;
