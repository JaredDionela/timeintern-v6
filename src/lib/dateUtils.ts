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
