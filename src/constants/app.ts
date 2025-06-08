// Application constants and configuration
export const APP_CONFIG = {
  // Default values
  DEFAULT_REQUIRED_HOURS: 120,
  DEFAULT_HOURLY_RATE: 15,
  
  // QR Code settings
  QR_CODE_REFRESH_INTERVAL: 5000, // 5 seconds
  QR_CODE_SIZE: '200x200',
  QR_CODE_PREFIX: 'attendance',
  
  // Time settings
  SUBSCRIPTION_CHANNEL: 'time_logs_changes',
  REAL_TIME_EVENTS: ['*'] as const,
  
  // UI settings
  TOAST_DURATION: 5000,
  LOADING_DEBOUNCE: 300,
  
  // Routes
  ROUTES: {
    HOME: '/',
    ADMIN: '/admin',
    INTERN: '/intern',
  } as const,
  
  // Authentication
  AUTH: {
    ADMIN_EMAIL_IDENTIFIER: 'admin',
    EMAIL_REDIRECT_PATH: '?verification=success',
  } as const,
  
  // File export
  EXPORT: {
    CSV_HEADERS: {
      SALARY_HISTORY: ['Month', 'Year', 'Intern Name', 'Total Hours', 'Total Salary'],
      TIME_LOGS: ['Date', 'Time In', 'Time Out', 'Total Hours'],
    },
  } as const,

  // Branding
  COMPANY_NAME: 'Ariva Academy',
  LOGO_PATH: '/app-logo.png',
  LOGO_ALT: 'App Logo',
  APP_TITLE: 'Time Tracker',
} as const;

// Auth Configuration
export const AUTH_CONFIG = {
  EMAIL_REDIRECT_PARAM: 'verification=success',
  ADMIN_EMAIL_IDENTIFIER: 'admin',
  MIN_PASSWORD_LENGTH: 6,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
} as const;

// Auth UI Messages
export const AUTH_MESSAGES = {
  // Form placeholders
  EMAIL_PLACEHOLDER: 'Enter your email',
  PASSWORD_PLACEHOLDER: 'Enter your password',
  CREATE_PASSWORD_PLACEHOLDER: 'Create a password',
  NAME_PLACEHOLDER: 'Enter your full name',
  
  // Button states
  SIGN_IN: 'Sign In',
  SIGN_UP: 'Sign Up',
  SIGNING_IN: 'Signing in...',
  SIGNING_UP: 'Signing up...',
  
  // Tab labels
  SIGNIN_TAB: 'Sign In',
  SIGNUP_TAB: 'Sign Up',
} as const;

// Status enums
export enum InternStatus {
  COMPLETED = 'Completed',
  IN_PROGRESS = 'In Progress',
  NOT_STARTED = 'Not Started'
}

export enum TimeLogStatus {
  SIGNED_IN = 'signed_in',
  SIGNED_OUT = 'signed_out',
  BREAK = 'break'
}

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    NO_USER: 'No user found',
    EMAIL_NOT_CONFIRMED: 'Please check your email to verify your account before signing in.',
    INVALID_ADMIN_SIGNUP: 'Admin emails cannot be used for intern signup',
    INVALID_LOGIN: 'Invalid login attempt',
    FAILED_PROFILE_CREATE: 'Failed to create intern profile. Please contact admin.',
    EMAIL_REQUIRED: 'User email is required to create profile',
  },
  DATA: {
    FAILED_FETCH_PROFILE: 'Failed to fetch intern profile',
    FAILED_FETCH_LOGS: 'Failed to fetch time logs',
    FAILED_FETCH_SALARY: 'Failed to fetch salary history',
    FAILED_UPDATE: 'Failed to update data',
  },
  GENERAL: {
    AUTHENTICATION_FAILED: 'Authentication failed',
    NETWORK_ERROR: 'Network error occurred',
    UNKNOWN_ERROR: 'An unknown error occurred',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    ACCOUNT_CREATED: 'Account created successfully. Please check your email for verification.',
    SIGNED_IN: 'Successfully signed in',
    SIGNED_OUT: 'Successfully signed out',
  },
  TIME_TRACKING: {
    SIGNED_IN: 'Successfully signed in for today',
    SIGNED_OUT: 'Successfully signed out for today',
  },
  DATA: {
    EXPORTED: 'Data exported successfully',
    UPDATED: 'Data updated successfully',
  },
} as const;
