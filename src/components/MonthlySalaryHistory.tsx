import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SalaryRecord {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_hours: number;
  total_salary: number;
  intern_name?: string;
}

const MonthlySalaryHistory = () => {
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSalaryHistory();
  }, []);

  const fetchSalaryHistory = async () => {
    try {
      const { data: salaryData, error: salaryError } = await supabase
        .from('monthly_salary_history')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (salaryError) throw salaryError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('intern_profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {} as Record<string, string>);

      const formattedData = (salaryData || []).map(record => ({
        ...record,
        intern_name: profilesMap[record.user_id] || 'Unknown'
      }));

      setSalaryHistory(formattedData);
    } catch (error) {
      console.error('Error fetching salary history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salary history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Month', 'Year', 'Intern Name', 'Total Hours', 'Total Salary'];
    const csvContent = [
      headers.join(','),
      ...salaryHistory.map(record => [
        record.month,
        record.year,
        record.intern_name,
        record.total_hours,
        record.total_salary
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly_salary_history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="w-full bg-white/5 rounded-lg p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-300">Loading salary history...</p>
        </div>
      </div>
    );
  }

  if (!salaryHistory || salaryHistory.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">No salary history available</div>
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
              <DollarSign className="w-5 h-5" />
              Monthly Salary History
            </CardTitle>
            <CardDescription className="text-slate-400">
              Track monthly salary payments and hours
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
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Month</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Year</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Intern</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Total Hours</th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">Total Salary</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map((record, index) => (
                <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-slate-200">{getMonthName(record.month)}</td>
                  <td className="py-3 px-4 text-slate-200">{record.year}</td>
                  <td className="py-3 px-4 text-white font-medium">{record.intern_name}</td>
                  <td className="py-3 px-4 text-blue-400 font-semibold">{record.total_hours}h</td>
                  <td className="py-3 px-4 text-green-400 font-semibold">₱{record.total_salary.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySalaryHistory;
