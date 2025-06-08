// filepath: src/constants/auth.ts
import appLogo from '@/components/images/app-logo.png';

export const AUTH_CONFIG = {
  DEFAULT_REQUIRED_HOURS: 120,
  ADMIN_EMAIL_PATTERN: 'admin',
  VERIFICATION_SUCCESS_PARAM: 'verification=success',
  ROUTES: {
    ADMIN: '/admin',
    INTERN: '/intern'
  },
  MESSAGES: {
    SUCCESS: {
      SIGNUP: 'Account created successfully. Please check your email for verification.',
      SIGNIN: 'Signed in successfully'
    },
    ERROR: {
      ADMIN_SIGNUP: 'Admin emails cannot be used for intern signup',
      USER_CREATION_FAILED: 'Failed to create user',
      PROFILE_CREATION_FAILED: 'Failed to create intern profile. Please contact admin.',
      EMAIL_NOT_CONFIRMED: 'Please check your email to verify your account before signing in.',
      EMAIL_VERIFICATION_REQUIRED: 'Please verify your email address before signing in.',
      NO_USER_FOUND: 'No user found',
      INVALID_LOGIN: 'Invalid login attempt',
      EMAIL_REQUIRED: 'User email is required to create profile'
    }
  }
} as const;

export const APP_INFO = {
  NAME: 'TimeIntern',
  LOGO_PATH: appLogo,
  LOGO_ALT: 'TimeIntern Logo'
} as const;
