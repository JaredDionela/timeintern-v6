import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [filteredHistory, setFilteredHistory] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSalaryHistory();
  }, []);

  useEffect(() => {
    filterSalaryHistory();
  }, [salaryHistory, selectedMonth, selectedYear]);

  const filterSalaryHistory = () => {
    let filtered = salaryHistory;
    
    if (selectedMonth) {
      filtered = filtered.filter(record => record.month === selectedMonth);
    }
    
    if (selectedYear) {
      filtered = filtered.filter(record => record.year === selectedYear);
    }
    
    setFilteredHistory(filtered);
  };

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
      ...filteredHistory.map(record => [
        getMonthName(record.month),
        record.year,
        `"${record.intern_name}"`,
        record.total_hours.toFixed(2),
        record.total_salary.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = selectedMonth && selectedYear 
      ? `salary_history_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`
      : `salary_history_all.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Salary history exported successfully`,
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
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

  const availableYears = Array.from(new Set(salaryHistory.map(record => record.year))).sort((a, b) => b - a);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading salary history...</div>
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
          <Select onValueChange={(value) => setSelectedMonth(value === "all" ? null : Number(value))} defaultValue="all">
            <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={`${month.value}`}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setSelectedYear(value === "all" ? null : Number(value))} defaultValue="all">
            <SelectTrigger className="w-[120px] bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
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
              {filteredHistory.map((record) => (
                <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-slate-200">{getMonthName(record.month)}</td>
                  <td className="py-3 px-4 text-slate-200">{record.year}</td>
                  <td className="py-3 px-4 text-white font-medium">{record.intern_name}</td>
                  <td className="py-3 px-4 text-blue-400">{record.total_hours.toFixed(2)}h</td>
                  <td className="py-3 px-4 text-green-400 font-semibold">₱{record.total_salary.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No salary records found for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySalaryHistory;
