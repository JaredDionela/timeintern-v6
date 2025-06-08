// Type definitions for the application
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
}

export interface InternProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  required_hours: number;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  user_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  total_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySalary {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_hours: number;
  total_salary: number;
  created_at: string;
  updated_at: string;
}

export interface InternData {
  id: string;
  name: string;
  email: string;
  required_hours: number;
  completed_hours: number;
  status: string;
}

export interface SalaryHistoryData {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_hours: number;
  total_salary: number;
  intern_name: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  requiredHours?: string;
  isAdmin?: boolean;
}

export interface DashboardStats {
  totalHours: number;
  requiredHours: number;
  completionPercentage: number;
  currentMonthSalary: number;
  isSignedIn: boolean;
  signInTime: string | null;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'checkbox';
  validation?: ValidationRule;
  placeholder?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Component props types
export interface DashboardCardProps {
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  className?: string;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  description?: string;
  className?: string;
}

// Hook return types
export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string, isAdmin?: boolean) => Promise<void>;
  signUp: (data: AuthFormData) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface UseInternProfileReturn {
  profile: InternProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseTimeLogsReturn {
  timeLogs: TimeLog[];
  isLoading: boolean;
  error: string | null;
  todayLog: TimeLog | null;
  totalHours: number;
  refetch: () => Promise<void>;
}
