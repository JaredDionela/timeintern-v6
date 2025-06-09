// Utility to clear all authentication data - use this if stuck in auth loops
export const clearAllAuthData = () => {
  // Clear all supabase related items
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
  
  console.log('All auth data cleared');
};
