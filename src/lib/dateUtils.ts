// Utility functions for consistent date handling
export const getLocalDateString = (): string => {
  const now = new Date();
  // Use local timezone to get the correct date
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

export const formatLocalDateTime = (date: Date): string => {
  return date.toLocaleString();
};

export const formatLocalDate = (date: Date): string => {
  return date.toLocaleDateString();
};

// Create a local timestamp that preserves the exact time entered
export const createLocalTimestamp = (dateStr: string, timeStr: string): string => {
  // Instead of converting to UTC, we'll store the time as intended locally
  // Format: YYYY-MM-DD HH:MM:SS (no timezone conversion)
  return `${dateStr} ${timeStr}:00`;
};

// Extract local time string from a timestamp (for editing)
export const extractLocalTime = (timestamp: string): string => {
  // Handle both ISO format and our local format
  if (timestamp.includes('T')) {
    // ISO format - extract time part directly without timezone conversion
    const isoTime = timestamp.split('T')[1];
    if (isoTime) {
      const timeOnly = isoTime.split('.')[0]; // Remove milliseconds if present
      return timeOnly.substring(0, 5); // HH:MM
    }
    return '';
  } else {
    // Our local format - extract time part directly
    const timePart = timestamp.split(' ')[1];
    if (timePart) {
      return timePart.substring(0, 5); // HH:MM
    }
    return '';
  }
};

// Format timestamp for display in local timezone
export const formatLocalTime = (timestamp: string): string => {
  // Handle both ISO format and our local format
  if (timestamp.includes('T')) {
    // ISO format - extract time components directly without timezone conversion
    const isoTime = timestamp.split('T')[1];
    if (isoTime) {
      const timeOnly = isoTime.split('.')[0]; // Remove milliseconds if present
      return timeOnly.substring(0, 5); // HH:MM
    }
    return '';
  } else {
    // Our local format - extract time part directly
    const timePart = timestamp.split(' ')[1];
    if (timePart) {
      return timePart.substring(0, 5); // HH:MM
    }
    return '';
  }
};

// Calculate total hours between two time strings without timezone conversion
export const calculateTotalHours = (timeIn: string, timeOut: string): number => {
  if (!timeIn || !timeOut) return 0;
    // Extract time from both formats (ISO and local)
  const getTimeFromString = (timeStr: string): { hours: number, minutes: number } => {
    if (timeStr.includes('T')) {
      // ISO format - extract time components directly without Date conversion
      const isoTime = timeStr.split('T')[1];
      if (isoTime) {
        const timeOnly = isoTime.split('.')[0]; // Remove milliseconds if present
        const [hours, minutes] = timeOnly.split(':').map(Number);
        return { hours, minutes };
      }
      return { hours: 0, minutes: 0 };
    } else {
      // Local format "YYYY-MM-DD HH:MM:SS" or just "HH:MM"
      const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
      const [hours, minutes] = timePart.split(':').map(Number);
      return { hours, minutes };
    }
  };
  
  const timeInParts = getTimeFromString(timeIn);
  const timeOutParts = getTimeFromString(timeOut);
  
  // Calculate total minutes for each time
  const inTotalMinutes = timeInParts.hours * 60 + timeInParts.minutes;
  let outTotalMinutes = timeOutParts.hours * 60 + timeOutParts.minutes;
  
  // Handle next day scenario (e.g., time_in at 23:00, time_out at 01:00)
  if (outTotalMinutes < inTotalMinutes) {
    outTotalMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  // Calculate difference in hours
  const totalMinutes = outTotalMinutes - inTotalMinutes;
  return totalMinutes / 60;
};
