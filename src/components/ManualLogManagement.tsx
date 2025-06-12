import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Plus, Trash2, Edit, Save, X, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getLocalDateString, formatLocalTime, createLocalTimestamp } from "@/lib/dateUtils";

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

interface InternProfile {
  user_id: string;
  name: string;
  email: string;
}

const ManualLogManagement = () => {
  const [logs, setLogs] = useState<TimeLogEntry[]>([]);
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<TimeLogEntry[]>([]);
  
  // Add log form state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLog, setNewLog] = useState({
    user_id: '',
    date: getLocalDateString(),
    time_in: '',
    time_out: '',
    log_type: 'regular'
  });
  
  // Edit log state
  const [editingLog, setEditingLog] = useState<TimeLogEntry | null>(null);
  const [editForm, setEditForm] = useState({
    time_in: '',
    time_out: '',
    log_type: 'regular'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchInterns();
    fetchLogs();
  }, [selectedDate]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

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
  };

  const fetchLogs = async () => {
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

      const formattedLogs = (timeLogsData || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        date: log.date,
        time_in: log.time_in,
        time_out: log.time_out,
        total_hours: log.total_hours,
        log_type: log.log_type,
        intern_name: profilesMap[log.user_id] || 'Unknown'
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
    } else {
      const filtered = logs.filter(log =>
        log.intern_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    }
  };  const handleAddLog = async () => {
    try {
      if (!newLog.user_id || !newLog.date) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }      // Convert time inputs to proper timestamps using createLocalTimestamp
      const timeInTimestamp = newLog.time_in ? createLocalTimestamp(newLog.date, newLog.time_in) : null;
      const timeOutTimestamp = newLog.time_out ? createLocalTimestamp(newLog.date, newLog.time_out) : null;

      const logData = {
        user_id: newLog.user_id,
        date: newLog.date,
        time_in: timeInTimestamp,
        time_out: timeOutTimestamp,
        log_type: newLog.log_type || 'regular'
      };

      const { error } = await supabase
        .from('time_logs')
        .insert([logData]);

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Log added successfully",
      });

      setShowAddDialog(false);
      setNewLog({
        user_id: '',
        date: getLocalDateString(),
        time_in: '',
        time_out: '',
        log_type: 'regular'
      });
      fetchLogs();    } catch (error) {
      console.error('Error adding log:', error);
      const errorMessage = (error as any)?.message || 'Failed to add log';
      toast({
        title: "Error",
        description: `Failed to add log: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };
  const handleEditLog = async () => {
    if (!editingLog) return;

    try {      // Convert time inputs to proper timestamps using createLocalTimestamp
      const timeInTimestamp = editForm.time_in ? createLocalTimestamp(editingLog.date, editForm.time_in) : null;
      const timeOutTimestamp = editForm.time_out ? createLocalTimestamp(editingLog.date, editForm.time_out) : null;

      const { error } = await supabase
        .from('time_logs')
        .update({
          time_in: timeInTimestamp,
          time_out: timeOutTimestamp,
          log_type: editForm.log_type
        })
        .eq('id', editingLog.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Log updated successfully",
      });

      setEditingLog(null);
      fetchLogs();
    } catch (error) {
      console.error('Error updating log:', error);
      toast({
        title: "Error",
        description: "Failed to update log",
        variant: "destructive",
      });
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

      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "Error",
        description: "Failed to delete log",
        variant: "destructive",
      });
    }
  };

  const startEdit = (log: TimeLogEntry) => {
    setEditingLog(log);
    setEditForm({
      time_in: log.time_in ? formatLocalTime(log.time_in) : '',
      time_out: log.time_out ? formatLocalTime(log.time_out) : '',
      log_type: log.log_type || 'regular'
    });
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
    link.setAttribute('download', `manual_logs_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Manual logs for ${selectedDate} exported successfully`,
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-white">Loading manual logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Manual Log Management
              </CardTitle>
              <CardDescription className="text-slate-400">
                Add, edit, and manage time logs manually ({filteredLogs.length} entries for {selectedDate})
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
                Export CSV
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Add New Time Log</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a new time log entry for an intern.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="intern-select">Intern</Label>
                      <Select onValueChange={(value) => setNewLog({...newLog, user_id: value})}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select an intern" />
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
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newLog.date}
                        onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time_in">Time In</Label>
                      <Input
                        id="time_in"
                        type="time"
                        value={newLog.time_in}
                        onChange={(e) => setNewLog({...newLog, time_in: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time_out">Time Out</Label>
                      <Input
                        id="time_out"
                        type="time"
                        value={newLog.time_out}
                        onChange={(e) => setNewLog({...newLog, time_out: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="log_type">Log Type</Label>
                      <Select onValueChange={(value) => setNewLog({...newLog, log_type: value})} defaultValue="regular">
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="overtime">Overtime</SelectItem>
                          <SelectItem value="wfh">Work From Home</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => setShowAddDialog(false)}
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddLog} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Log
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-slate-200">{log.date}</td>
                    <td className="py-3 px-4 text-white font-medium">{log.intern_name}</td>
                    <td className="py-3 px-4 text-green-400">
                      {editingLog?.id === log.id ? (
                        <Input
                          type="time"
                          value={editForm.time_in}
                          onChange={(e) => setEditForm({...editForm, time_in: e.target.value})}
                          className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                        />
                      ) : (
                        log.time_in ? formatLocalTime(log.time_in) : 'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4 text-red-400">
                      {editingLog?.id === log.id ? (
                        <Input
                          type="time"
                          value={editForm.time_out}
                          onChange={(e) => setEditForm({...editForm, time_out: e.target.value})}
                          className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                        />
                      ) : (
                        log.time_out ? formatLocalTime(log.time_out) : 'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-semibold">
                      {log.total_hours?.toFixed(2) || '0.00'}h
                    </td>
                    <td className="py-3 px-4">
                      {editingLog?.id === log.id ? (
                        <Select onValueChange={(value) => setEditForm({...editForm, log_type: value})} defaultValue={editForm.log_type}>
                          <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="overtime">Overtime</SelectItem>
                            <SelectItem value="wfh">WFH</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={log.log_type === 'wfh' ? 'outline' : log.log_type === 'overtime' ? 'destructive' : 'default'}>
                          {log.log_type || 'Regular'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {editingLog?.id === log.id ? (
                          <>
                            <Button
                              onClick={handleEditLog}
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => setEditingLog(null)}
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-slate-300 hover:bg-slate-400/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => startEdit(log)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Delete Log Entry</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Are you sure you want to delete this log entry for {log.intern_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
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
    </div>
  );
};

export default ManualLogManagement;
