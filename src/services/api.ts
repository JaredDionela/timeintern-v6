// Service layer for Supabase operations
import { supabase } from '@/integrations/supabase/client';
import { 
  InternProfile, 
  TimeLog, 
  MonthlySalary, 
  AuthFormData 
} from '@/types';
import { 
  APP_CONFIG, 
  ERROR_MESSAGES 
} from '@/constants/app';
import { 
  isAdminUser, 
  formatDate, 
  calculateHours 
} from '@/utils/helpers';

export class AuthService {
  /**
   * Sign in user with email and password
   */
  static async signIn(email: string, password: string, isAdmin: boolean = false) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error(ERROR_MESSAGES.AUTH.EMAIL_NOT_CONFIRMED);
      }
      throw error;
    }

    if (!data.user) {
      throw new Error(ERROR_MESSAGES.AUTH.NO_USER);
    }

    if (!data.user.email_confirmed_at) {
      throw new Error(ERROR_MESSAGES.AUTH.EMAIL_NOT_CONFIRMED);
    }

    // Validate admin access
    const isUserAdmin = isAdminUser(data.user.email || '');
    if (isAdmin && !isUserAdmin) {
      throw new Error(ERROR_MESSAGES.AUTH.INVALID_LOGIN);
    }

    return { user: data.user, isAdmin: isUserAdmin };
  }

  /**
   * Sign up new user
   */
  static async signUp(formData: AuthFormData) {
    const { email, password, name, requiredHours } = formData;

    // Prevent admin email signup as intern
    if (isAdminUser(email)) {
      throw new Error(ERROR_MESSAGES.AUTH.INVALID_ADMIN_SIGNUP);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${APP_CONFIG.AUTH.EMAIL_REDIRECT_PATH}`,
        data: {
          name: name,
          required_hours: parseInt(requiredHours || String(APP_CONFIG.DEFAULT_REQUIRED_HOURS))
        }
      }
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error('Failed to create user');
    }

    // Create intern profile
    await InternService.createProfile({
      user_id: data.user.id,
      name: name || 'New Intern',
      email,
      required_hours: parseInt(requiredHours || String(APP_CONFIG.DEFAULT_REQUIRED_HOURS)),
    });

    return data.user;
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current user session
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Get current session
   */
  static async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
}

export class InternService {
  /**
   * Create intern profile
   */
  static async createProfile(profileData: Omit<InternProfile, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('intern_profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      throw new Error(ERROR_MESSAGES.AUTH.FAILED_PROFILE_CREATE);
    }

    return data;
  }

  /**
   * Get intern profile by user ID
   */
  static async getProfile(userId: string): Promise<InternProfile | null> {
    const { data, error } = await supabase
      .from('intern_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_PROFILE);
    }

    return data;
  }

  /**
   * Get all intern profiles
   */
  static async getAllProfiles(): Promise<InternProfile[]> {
    const { data, error } = await supabase
      .from('intern_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_PROFILE);
    }

    return data || [];
  }

  /**
   * Update intern profile
   */
  static async updateProfile(userId: string, updates: Partial<InternProfile>) {
    const { data, error } = await supabase
      .from('intern_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_UPDATE);
    }

    return data;
  }
}

export class TimeLogService {
  /**
   * Get time logs for a user
   */
  static async getUserTimeLogs(userId: string): Promise<TimeLog[]> {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_LOGS);
    }

    return data || [];
  }

  /**
   * Get today's time log for a user
   */
  static async getTodayTimeLog(userId: string): Promise<TimeLog | null> {
    const today = formatDate();
    
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_LOGS);
    }

    return data;
  }

  /**
   * Sign in (create or update time log)
   */
  static async signIn(userId: string): Promise<TimeLog> {
    const today = formatDate();
    const currentTime = new Date().toISOString();

    // Check if there's already a log for today
    const existingLog = await this.getTodayTimeLog(userId);

    if (existingLog) {
      if (existingLog.time_in && !existingLog.time_out) {
        // User is already signed in
        return existingLog;
      } else if (existingLog.time_out) {
        // User already completed the day, create new entry or update
        const { data, error } = await supabase
          .from('time_logs')
          .update({
            time_in: currentTime,
            time_out: null,
            total_hours: null,
          })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    }

    // Create new time log
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        user_id: userId,
        date: today,
        time_in: currentTime,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Sign out (update time log with time_out)
   */  static async signOut(userId: string): Promise<TimeLog> {
    const currentTime = new Date().toISOString();

    const existingLog = await this.getTodayTimeLog(userId);

    if (!existingLog || !existingLog.time_in) {
      throw new Error('No active sign-in found for today');
    }

    const totalHours = calculateHours(existingLog.time_in, currentTime);

    const { data, error } = await supabase
      .from('time_logs')
      .update({
        time_out: currentTime,
        total_hours: totalHours,
      })
      .eq('id', existingLog.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Calculate total hours for a user
   */
  static async calculateTotalHours(userId: string): Promise<number> {
    const timeLogs = await this.getUserTimeLogs(userId);
    
    let totalHours = 0;
    const currentTime = new Date();

    for (const log of timeLogs) {
      if (log.total_hours) {
        totalHours += log.total_hours;
      } else if (log.time_in && !log.time_out) {
        // Calculate ongoing session hours
        const sessionHours = calculateHours(log.time_in, currentTime.toISOString());
        totalHours += sessionHours;
      }
    }

    return totalHours;
  }

  /**
   * Get all time logs (admin function)
   */
  static async getAllTimeLogs(): Promise<TimeLog[]> {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_LOGS);
    }

    return data || [];
  }
}

export class SalaryService {
  /**
   * Get monthly salary records
   */
  static async getMonthlySalaryHistory(): Promise<MonthlySalary[]> {
    const { data, error } = await supabase
      .from('monthly_salary_history')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_FETCH_SALARY);
    }

    return data || [];
  }

  /**
   * Create or update monthly salary record
   */
  static async updateMonthlySalary(
    userId: string, 
    month: number, 
    year: number, 
    totalHours: number, 
    totalSalary: number
  ): Promise<MonthlySalary> {
    const { data, error } = await supabase
      .from('monthly_salary_history')
      .upsert({
        user_id: userId,
        month,
        year,
        total_hours: totalHours,
        total_salary: totalSalary,
      })
      .select()
      .single();

    if (error) {
      throw new Error(ERROR_MESSAGES.DATA.FAILED_UPDATE);
    }

    return data;
  }
}

export class RealtimeService {
  /**
   * Subscribe to time logs changes
   */
  static subscribeToTimeLogs(callback: (payload: any) => void) {
    const channel = supabase
      .channel(APP_CONFIG.SUBSCRIPTION_CHANNEL)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        callback
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from channel
   */
  static unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  }
}
