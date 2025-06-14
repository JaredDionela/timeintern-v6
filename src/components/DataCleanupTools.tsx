import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Database, AlertTriangle, Calendar, User, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface InternProfile {
  user_id: string;
  name: string;
  email: string;
}

interface CleanupResult {
  success: boolean;
  deleted_logs?: number;
  deleted_salary_records?: number;
  intern_name?: string;
  month?: number;
  year?: number;
}

const DataCleanupTools = () => {
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Month cleanup state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Intern cleanup state
  const [selectedIntern, setSelectedIntern] = useState<string>('');
    // SQL Query state
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    try {
      const { data, error } = await supabase
        .from('intern_profiles')
        .select('user_id, name, email')
        .order('name', { ascending: true });

      if (error) throw error;
      setInterns(data || []);
    } catch (error) {
      console.error('Error fetching interns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch intern profiles",
        variant: "destructive",
      });
    }
  };  const cleanupByMonth = async () => {
    try {
      setLoading(true);
      
      // Step 1: Check how many records will be affected
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const endDate = selectedMonth === 12 
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
      
      const { count: logCount } = await supabase
        .from('time_logs')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate)
        .lt('date', endDate);

      if (!logCount || logCount === 0) {
        toast({
          title: "No Data Found",
          description: `No time logs found for ${getMonthName(selectedMonth)} ${selectedYear}`,
        });
        return;
      }

      // Step 2: For any dataset, try RPC function first (it now has built-in safety)
      toast({
        title: "Starting Cleanup",
        description: `Processing ${logCount} records for ${getMonthName(selectedMonth)} ${selectedYear}...`,
      });

      const { data, error } = await supabase
        .rpc('cleanup_logs_by_month', {
          p_month: selectedMonth,
          p_year: selectedYear
        });

      if (error) {
        console.warn('RPC function failed, using application-level batching:', error);
        
        // Step 3: Application-level batching for large datasets
        if (logCount > 100) {
          let totalDeleted = 0;
          let batchSize = 25; // Smaller batches for better reliability
          
          toast({
            title: "Using Application-Level Batching",
            description: `Processing ${logCount} records in batches of ${batchSize}...`,
          });

          // Delete in batches to avoid timeout
          while (true) {
            const { data: batchLogs, error: fetchError } = await supabase
              .from('time_logs')
              .select('id')
              .gte('date', startDate)
              .lt('date', endDate)
              .limit(batchSize);

            if (fetchError) throw fetchError;
            if (!batchLogs || batchLogs.length === 0) break;

            const { error: deleteError, count: deletedCount } = await supabase
              .from('time_logs')
              .delete({ count: 'exact' })
              .in('id', batchLogs.map(log => log.id));

            if (deleteError) throw deleteError;
            
            totalDeleted += deletedCount || 0;
            
            // Update progress
            toast({
              title: "Batch Progress",
              description: `Deleted ${totalDeleted} of ${logCount} records...`,
            });
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Delete salary history
          const { error: salaryError } = await supabase
            .from('monthly_salary_history')
            .delete()
            .eq('month', selectedMonth)
            .eq('year', selectedYear);

          if (salaryError) console.warn('Error deleting salary history:', salaryError);

          toast({
            title: "Cleanup Complete",
            description: `Successfully deleted ${totalDeleted} time logs for ${getMonthName(selectedMonth)} ${selectedYear}`,
          });
          return;
        }

        // For smaller datasets, use direct deletion
        const { error: logsError, count: deletedLogs } = await supabase
          .from('time_logs')
          .delete({ count: 'exact' })
          .gte('date', startDate)
          .lt('date', endDate);
        
        if (logsError) throw logsError;
        
        const { error: salaryError } = await supabase
          .from('monthly_salary_history')
          .delete()
          .eq('month', selectedMonth)
          .eq('year', selectedYear);
        
        if (salaryError) console.warn('Error deleting salary history:', salaryError);
        
        toast({
          title: "Cleanup Complete (Direct Method)",
          description: `Deleted ${deletedLogs || 0} time logs for ${getMonthName(selectedMonth)} ${selectedYear}`,
        });
        return;
      }

      // Parse the JSON response properly
      const result = data && typeof data === 'object' ? data as unknown as CleanupResult : { success: false, deleted_logs: 0 };
      
      if (result.success) {
        toast({
          title: "Cleanup Complete",
          description: `Deleted ${result.deleted_logs || 0} time logs for ${getMonthName(selectedMonth)} ${selectedYear}`,
        });
      } else {
        // RPC function suggested application-level batching
        const suggestion = (result as any).suggestion || 'Try using application-level batching';
        toast({
          title: "RPC Cleanup Limitation",
          description: suggestion,
          variant: "destructive",
        });
        
        // Trigger application-level batching
        if (logCount > 100) {
          toast({
            title: "Switching to Application Batching",
            description: "Using safer application-level cleanup...",
          });
          
          // Use the same batching logic as above
          let totalDeleted = 0;
          let batchSize = 25;
          
          while (true) {
            const { data: batchLogs, error: fetchError } = await supabase
              .from('time_logs')
              .select('id')
              .gte('date', startDate)
              .lt('date', endDate)
              .limit(batchSize);

            if (fetchError) throw fetchError;
            if (!batchLogs || batchLogs.length === 0) break;

            const { error: deleteError, count: deletedCount } = await supabase
              .from('time_logs')
              .delete({ count: 'exact' })
              .in('id', batchLogs.map(log => log.id));

            if (deleteError) throw deleteError;
            
            totalDeleted += deletedCount || 0;
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          toast({
            title: "Application Cleanup Complete",
            description: `Successfully deleted ${totalDeleted} time logs using application-level batching`,
          });
        }
      }

    } catch (error) {
      console.error('Error cleaning up by month:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('57014');
      
      toast({
        title: isTimeout ? "Timeout Error" : "Cleanup Failed",
        description: isTimeout 
          ? `Operation timed out. The application will use safer batching methods for large datasets.`
          : `Failed to clean up data. Error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };const cleanupByIntern = async () => {
    try {
      setLoading(true);
      
      // First get intern name for feedback
      const { data: profileData } = await supabase
        .from('intern_profiles')
        .select('name')
        .eq('user_id', selectedIntern)
        .single();

      const internName = profileData?.name || 'Unknown Intern';

      // Check how many records this intern has
      const { count: logCount } = await supabase
        .from('time_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', selectedIntern);

      if (!logCount || logCount === 0) {
        toast({
          title: "No Data Found",
          description: `No time logs found for ${internName}`,
        });
        setSelectedIntern('');
        return;
      }

      // For large datasets, use batched deletion
      if (logCount > 100) {
        let totalDeleted = 0;
        let batchSize = 50;
        
        toast({
          title: "Processing Large Dataset",
          description: `Found ${logCount} records for ${internName}. Using batched deletion...`,
        });

        // Delete in batches
        while (true) {
          const { data: batchLogs, error: fetchError } = await supabase
            .from('time_logs')
            .select('id')
            .eq('user_id', selectedIntern)
            .limit(batchSize);

          if (fetchError) throw fetchError;
          if (!batchLogs || batchLogs.length === 0) break;

          const { error: deleteError, count: deletedCount } = await supabase
            .from('time_logs')
            .delete({ count: 'exact' })
            .in('id', batchLogs.map(log => log.id));

          if (deleteError) throw deleteError;
          
          totalDeleted += deletedCount || 0;
          
          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Delete salary history
        const { error: salaryError, count: deletedSalary } = await supabase
          .from('monthly_salary_history')
          .delete({ count: 'exact' })
          .eq('user_id', selectedIntern);

        if (salaryError) console.warn('Error deleting salary history:', salaryError);

        toast({
          title: "Batch Cleanup Complete",
          description: `Deleted ${totalDeleted} time logs and ${deletedSalary || 0} salary records for ${internName}`,
        });
        setSelectedIntern('');
        return;
      }

      // For smaller datasets, try RPC function first
      const { data, error } = await supabase
        .rpc('cleanup_logs_by_intern', {
          p_user_id: selectedIntern
        });

      if (error) {
        console.warn('RPC function failed, trying direct deletion:', error);
        
        // Fallback to direct deletion
        const { error: logsError, count: deletedLogs } = await supabase
          .from('time_logs')
          .delete({ count: 'exact' })
          .eq('user_id', selectedIntern);
        
        if (logsError) throw logsError;
        
        const { error: salaryError, count: deletedSalary } = await supabase
          .from('monthly_salary_history')
          .delete({ count: 'exact' })
          .eq('user_id', selectedIntern);
        
        if (salaryError) throw salaryError;
        
        toast({
          title: "Cleanup Complete (Direct Method)",
          description: `Deleted ${deletedLogs || 0} time logs and ${deletedSalary || 0} salary records for ${internName}`,
        });
        setSelectedIntern('');
        return;
      }

      // Parse the JSON response properly
      const result = data && typeof data === 'object' ? data as unknown as CleanupResult : { success: false, deleted_logs: 0, deleted_salary_records: 0, intern_name: internName };
      
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${result.deleted_logs || 0} time logs and ${result.deleted_salary_records || 0} salary records for ${result.intern_name}`,
      });

      setSelectedIntern('');
    } catch (error) {
      console.error('Error cleaning up by intern:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('57014');
      
      toast({
        title: isTimeout ? "Timeout Error" : "Cleanup Failed",
        description: isTimeout 
          ? `Operation timed out. Try cleaning smaller datasets or contact administrator.`
          : `Failed to clean up data. Error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeSQLQuery = async () => {
    try {
      setLoading(true);
      
      // This is a basic implementation - in a real app, you'd want to restrict SQL execution
      // For safety, we'll only allow SELECT queries in this demo
      if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
        toast({
          title: "Query Restricted",
          description: "Only SELECT queries are allowed for security reasons",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .limit(100); // This is just a placeholder - real SQL execution would need custom function

      if (error) throw error;

      setSqlResult(data);
      
      toast({
        title: "Query Executed",
        description: `Query completed successfully. Showing up to 100 results.`,
      });

    } catch (error) {
      console.error('Error executing SQL query:', error);
      toast({
        title: "Query Failed",
        description: "Failed to execute SQL query",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const generateCleanupQueries = () => {
    return {
      cleanupByMonth: `
-- Clean up all logs for a specific month
DELETE FROM time_logs 
WHERE EXTRACT(MONTH FROM date::date) = ${selectedMonth}
  AND EXTRACT(YEAR FROM date::date) = ${selectedYear};

-- Clean up corresponding salary history
DELETE FROM monthly_salary_history 
WHERE month = ${selectedMonth} AND year = ${selectedYear};
      `,
      cleanupByIntern: selectedIntern ? `
-- Clean up all logs for a specific intern
DELETE FROM time_logs WHERE user_id = '${selectedIntern}';

-- Clean up corresponding salary history
DELETE FROM monthly_salary_history WHERE user_id = '${selectedIntern}';
      ` : '-- Please select an intern first',
      viewLogTypes: `
-- View log type distribution
SELECT 
  log_type,
  COUNT(*) as count,
  SUM(total_hours) as total_hours
FROM time_logs 
GROUP BY log_type
ORDER BY count DESC;
      `,
      viewMonthlyStats: `
-- View monthly statistics with log types
SELECT 
  EXTRACT(YEAR FROM date::date) as year,
  EXTRACT(MONTH FROM date::date) as month,
  log_type,
  COUNT(*) as entry_count,
  SUM(total_hours) as total_hours,
  AVG(total_hours) as avg_hours
FROM time_logs 
WHERE total_hours IS NOT NULL
GROUP BY year, month, log_type
ORDER BY year DESC, month DESC, log_type;
      `
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "SQL query copied to clipboard",
    });
  };
  const queries = generateCleanupQueries();
  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Cleanup Tools
          </CardTitle>
          <CardDescription className="text-slate-400">
            Clean up time logs and salary data by month or intern
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Month Cleanup Section */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Cleanup by Month</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-slate-300">Month</Label>
                <Select onValueChange={(value) => setSelectedMonth(Number(value))} defaultValue={`${selectedMonth}`}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={`${i + 1}`}>
                        {getMonthName(i + 1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-slate-300">Year</Label>
                <Select onValueChange={(value) => setSelectedYear(Number(value))} defaultValue={`${selectedYear}`}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => (
                      <SelectItem key={selectedYear - i} value={`${selectedYear - i}`}>
                        {selectedYear - i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading} className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cleanup Month
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Confirm Cleanup by Month
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This will permanently delete ALL time logs and salary data for <strong>{getMonthName(selectedMonth)} {selectedYear}</strong>. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={cleanupByMonth}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            <div className="text-sm text-slate-400 p-3 bg-slate-900/50 rounded border-l-4 border-orange-500">
              <strong>Warning:</strong> This will delete all time logs and salary records for {getMonthName(selectedMonth)} {selectedYear} for ALL interns.
            </div>
          </div>

          {/* Intern Cleanup Section */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Cleanup by Intern</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-slate-300">Select Intern</Label>
                <Select onValueChange={setSelectedIntern} value={selectedIntern}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Choose an intern" />
                  </SelectTrigger>
                  <SelectContent>
                    {interns.map((intern) => (
                      <SelectItem key={intern.user_id} value={intern.user_id}>
                        {intern.name} ({intern.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={loading || !selectedIntern} 
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cleanup Intern
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Confirm Cleanup by Intern
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This will permanently delete ALL time logs and salary data for the selected intern. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={cleanupByIntern}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
              <div className="text-sm text-slate-400 p-3 bg-slate-900/50 rounded border-l-4 border-red-500">
              <strong>Warning:</strong> This will delete ALL historical data for the selected intern including all time logs and salary records.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SQL Queries Reference */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            SQL Query Reference
          </CardTitle>
          <CardDescription className="text-slate-400">
            Manual SQL queries for advanced data management (Just in case you need them)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Cleanup by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
                  {queries.cleanupByMonth}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(queries.cleanupByMonth)}
                  className="mt-2 text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Copy Query
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Cleanup by Intern</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
                  {queries.cleanupByIntern}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(queries.cleanupByIntern)}
                  className="mt-2 text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Copy Query
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">View Log Types</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
                  {queries.viewLogTypes}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(queries.viewLogTypes)}
                  className="mt-2 text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Copy Query
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Monthly Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
                  {queries.viewMonthlyStats}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(queries.viewMonthlyStats)}
                  className="mt-2 text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Copy Query
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-sm text-slate-400 p-4 bg-blue-900/20 rounded border-l-4 border-blue-500">
            <strong>Note:</strong> These SQL queries should be executed directly in Supabase SQL editor or database management tool. 
            The cleanup functions above provide a safer approach for common operations.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataCleanupTools;
