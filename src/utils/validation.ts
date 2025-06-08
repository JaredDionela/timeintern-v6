// Form validation utilities
import { ValidationRule, FormField } from '@/types';
import { isValidEmail, isValidPassword } from './helpers';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a single field based on its validation rules
 */
export const validateField = (
  value: any,
  fieldName: string,
  rules?: ValidationRule
): ValidationError | null => {
  if (!rules) return null;

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return { field: fieldName, message: `${fieldName} is required` };
  }

  // Skip other validations if field is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return { 
        field: fieldName, 
        message: `${fieldName} must be at least ${rules.minLength} characters long` 
      };
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return { 
        field: fieldName, 
        message: `${fieldName} must not exceed ${rules.maxLength} characters` 
      };
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return { 
        field: fieldName, 
        message: `${fieldName} format is invalid` 
      };
    }
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (typeof result === 'string') {
      return { field: fieldName, message: result };
    }
    if (result === false) {
      return { field: fieldName, message: `${fieldName} is invalid` };
    }
  }

  return null;
};

/**
 * Validate an entire form
 */
export const validateForm = (
  data: Record<string, any>,
  fields: FormField[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const error = validateField(data[field.name], field.label, field.validation);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
};

/**
 * Common validation rules
 */
export const ValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (!isValidEmail(value)) {
        return 'Please enter a valid email address';
      }
      return true;
    }
  } as ValidationRule,

  password: {
    required: true,
    minLength: 6,
    custom: (value: string) => {
      const result = isValidPassword(value);
      return result.isValid ? true : result.message || 'Invalid password';
    }
  } as ValidationRule,

  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
    custom: (value: string) => {
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        return 'Name can only contain letters and spaces';
      }
      return true;
    }
  } as ValidationRule,

  requiredHours: {
    required: true,
    custom: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num)) {
        return 'Required hours must be a number';
      }
      if (num < 1) {
        return 'Required hours must be at least 1';
      }
      if (num > 2000) {
        return 'Required hours cannot exceed 2000';
      }
      return true;
    }
  } as ValidationRule,
};

/**
 * Predefined form field configurations
 */
export const FormFields = {
  email: {
    name: 'email',
    label: 'Email',
    type: 'email' as const,
    placeholder: 'Enter your email',
    validation: ValidationRules.email,
  },

  password: {
    name: 'password',
    label: 'Password',
    type: 'password' as const,
    placeholder: 'Enter your password',
    validation: ValidationRules.password,
  },

  name: {
    name: 'name',
    label: 'Full Name',
    type: 'text' as const,
    placeholder: 'Enter your full name',
    validation: ValidationRules.name,
  },

  requiredHours: {
    name: 'requiredHours',
    label: 'Required Hours',
    type: 'number' as const,
    placeholder: 'Enter required hours',
    validation: ValidationRules.requiredHours,
  },

  isAdmin: {
    name: 'isAdmin',
    label: 'Login as Admin',
    type: 'checkbox' as const,
  },
} as const;
