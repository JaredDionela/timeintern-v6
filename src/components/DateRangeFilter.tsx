import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, Search, Filter, RotateCcw } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onSearchChange: (searchTerm: string) => void;
  onLogTypeChange: (logType: string) => void;
  onExport: () => void;
  onReset: () => void;
  loading?: boolean;
  exportLabel?: string;
  showLogTypeFilter?: boolean;
  showExport?: boolean;
  totalRecords?: number;
  filteredRecords?: number;
}

const DateRangeFilter = ({
  onDateRangeChange,
  onSearchChange,
  onLogTypeChange,
  onExport,
  onReset,
  loading = false,
  exportLabel = "Export Data",
  showLogTypeFilter = true,
  showExport = true,
  totalRecords,
  filteredRecords
}: DateRangeFilterProps) => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogType, setSelectedLogType] = useState('all');
  
  // Predefined date ranges
  const [quickRange, setQuickRange] = useState('');

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    onDateRangeChange(date, endDate);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    onDateRangeChange(startDate, date);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleLogTypeChange = (value: string) => {
    setSelectedLogType(value);
    onLogTypeChange(value);
  };

  const handleQuickRangeChange = (range: string) => {
    setQuickRange(range);
    const today = new Date();
    let start: Date, end: Date = today;

    switch (range) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = start;
        break;
      case 'this-week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'last-week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'last-30-days':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      default:
        return;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange(startStr, endStr);
  };

  const handleReset = () => {
    const today = getLocalDateString();
    setStartDate(today);
    setEndDate(today);
    setSearchTerm('');
    setSelectedLogType('all');
    setQuickRange('');
    onDateRangeChange(today, today);
    onSearchChange('');
    onLogTypeChange('all');
    onReset();
  };

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'regular':
        return 'bg-green-500';
      case 'overtime':
        return 'bg-orange-500';
      case 'wfh':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Export
            </CardTitle>
            <CardDescription className="text-slate-400">
              Filter data by date range, search terms, and log types
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            {showExport && (
              <Button
                onClick={onExport}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportLabel}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Date Range Selection */}
        <div>
          <Label className="text-slate-300 text-sm font-medium mb-2 block">
            Quick Date Ranges
          </Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'this-week', label: 'This Week' },
              { value: 'last-week', label: 'Last Week' },
              { value: 'this-month', label: 'This Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'last-30-days', label: 'Last 30 Days' },
              { value: 'this-year', label: 'This Year' },
            ].map((range) => (
              <Button
                key={range.value}
                variant={quickRange === range.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickRangeChange(range.value)}
                className={`text-xs ${
                  quickRange === range.value
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date" className="text-slate-300 text-sm font-medium mb-1 block">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-slate-300 text-sm font-medium mb-1 block">
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>

        {/* Search and Log Type Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="search" className="text-slate-300 text-sm font-medium mb-1 block">
              Search Intern
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="search"
                type="text"
                placeholder="Search by intern name..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white pl-10"
              />
            </div>
          </div>
          
          {showLogTypeFilter && (
            <div>
              <Label htmlFor="log-type" className="text-slate-300 text-sm font-medium mb-1 block">
                Log Type
              </Label>
              <Select onValueChange={handleLogTypeChange} value={selectedLogType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="wfh">Work from Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-300">Active Filters:</span>
          
          <Badge variant="secondary" className="bg-slate-700 text-slate-200">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {startDate} to {endDate}
          </Badge>
          
          {searchTerm && (
            <Badge variant="secondary" className="bg-blue-700 text-white">
              <Search className="w-3 h-3 mr-1" />
              Search: {searchTerm}
            </Badge>
          )}
          
          {showLogTypeFilter && selectedLogType !== 'all' && (
            <Badge className={`${getLogTypeColor(selectedLogType)} text-white`}>
              Type: {selectedLogType.charAt(0).toUpperCase() + selectedLogType.slice(1)}
            </Badge>
          )}
        </div>

        {/* Results Summary */}
        {totalRecords !== undefined && (
          <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded">
            {filteredRecords !== undefined && filteredRecords !== totalRecords ? (
              <>
                Showing <span className="text-white font-medium">{filteredRecords}</span> of{' '}
                <span className="text-white font-medium">{totalRecords}</span> records
              </>
            ) : (
              <>
                Total records: <span className="text-white font-medium">{totalRecords}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;
