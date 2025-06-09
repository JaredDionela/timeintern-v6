import { supabase } from "@/integrations/supabase/client";

// Utility function to safely check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return false;
    }
    
    // Verify session is still valid
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Session is invalid, clean it up
      await supabase.auth.signOut();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Authentication check failed:', error);
    await supabase.auth.signOut();
    return false;
  }
};

// Utility function to safely get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      await supabase.auth.signOut();
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    await supabase.auth.signOut();
    return null;
  }
};

// Clear all authentication data
export const clearAuthData = () => {
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('supabase.auth.token');
};
