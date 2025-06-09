// Utility to clear all authentication data - use this if stuck in auth loops
export const clearAllAuthData = () => {
  // Clear all supabase related items from localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('supabase') || key.includes('auth') || key === 'rememberMe') {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage as well
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear specific problematic keys that might cause 403 errors
  localStorage.removeItem('sb-dmhttwzuhamyhldfjkhc-auth-token');
  sessionStorage.removeItem('sb-dmhttwzuhamyhldfjkhc-auth-token');
  
  console.log('All auth data cleared');
};

// Call this on app start if there are persistent auth issues
export const initializeAuthClearance = () => {
  // Check if we're in an error state and need to clear
  const hasAuthError = localStorage.getItem('auth-error') === 'true';
  if (hasAuthError) {
    clearAllAuthData();
    localStorage.removeItem('auth-error');
  }
};
