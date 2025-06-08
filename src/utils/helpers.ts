// Utility functions for common operations
import { APP_CONFIG } from '@/constants/app';

/**
 * Format date to YYYY-MM-DD format
 */
export const formatDate = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Format time to HH:MM format
 */
export const formatTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate hours between two time strings
 */
export const calculateHours = (timeIn: string, timeOut: string): number => {
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

/**
 * Calculate salary based on hours worked
 */
export const calculateSalary = (hours: number): number => {
  return hours * APP_CONFIG.DEFAULT_HOURLY_RATE;
};

/**
 * Check if user is admin based on email
 */
export const isAdminUser = (email: string): boolean => {
  return email.toLowerCase().includes(APP_CONFIG.AUTH.ADMIN_EMAIL_IDENTIFIER);
};

/**
 * Generate random ID for QR codes
 */
export const generateQRCodeId = (): string => {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomId = Array.from(randomBytes, byte => 
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `${APP_CONFIG.QR_CODE_PREFIX}-${timestamp}-${randomId}`;
};

/**
 * Generate QR code URL
 */
export const generateQRCodeUrl = (data: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${APP_CONFIG.QR_CODE_SIZE}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
};

/**
 * Format hours to display format (e.g., "2.5 hours")
 */
export const formatHours = (hours: number): string => {
  if (hours === 0) return '0 hours';
  if (hours === 1) return '1 hour';
  return `${hours.toFixed(1)} hours`;
};

/**
 * Calculate completion percentage
 */
export const calculateCompletionPercentage = (completed: number, required: number): number => {
  if (required === 0) return 0;
  return Math.min(Math.round((completed / required) * 100), 100);
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Download CSV file
 */
export const downloadCSV = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Convert array to CSV format
 */
export const arrayToCSV = (headers: string[], data: any[][]): string => {
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const csvRow = row.map(field => {
      // Handle fields that might contain commas or quotes
      if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(',');
    csvRows.push(csvRow);
  }
  
  return csvRows.join('\n');
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};
