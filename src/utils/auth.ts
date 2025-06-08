// filepath: src/utils/auth.ts
import { AUTH_CONFIG } from '@/constants/auth';

export const isAdminEmail = (email: string): boolean => {
  return email.toLowerCase().includes(AUTH_CONFIG.ADMIN_EMAIL_PATTERN);
};

export const extractNameFromEmail = (email: string): string => {
  return email.split('@')[0] || 'New Intern';
};

export const validateAdminSignup = (email: string): void => {
  if (isAdminEmail(email)) {
    throw new Error(AUTH_CONFIG.MESSAGES.ERROR.ADMIN_SIGNUP);
  }
};

export const validateRequiredHours = (hours: string): number => {
  const parsed = parseInt(hours);
  return isNaN(parsed) ? AUTH_CONFIG.DEFAULT_REQUIRED_HOURS : parsed;
};
