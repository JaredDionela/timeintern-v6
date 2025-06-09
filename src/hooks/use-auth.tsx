import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    // Check for existing session on mount
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any invalid session data
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        } else if (session) {
          // Verify the session is still valid by checking user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error('Session invalid, signing out:', userError);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          } else {
            setSession(session);
            setUser(user);
            setIsAdmin(user?.email?.toLowerCase().includes('admin') || false);
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        // Force sign out on any error
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    getSession();    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          
          // Clear all auth-related storage
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('supabase.auth.token');
        } else if (session) {
          // Verify the session is valid
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
              console.error('Invalid session, signing out:', error);
              await supabase.auth.signOut();
              return;
            }
            
            setSession(session);
            setUser(user);
            setIsAdmin(user?.email?.toLowerCase().includes('admin') || false);
            setLoading(false);

            // Handle session persistence based on localStorage flag
            if (event === 'SIGNED_IN') {
              const rememberMe = localStorage.getItem('rememberMe') === 'true';
              if (rememberMe) {
                // Set session to persist longer
                localStorage.setItem('supabase.auth.token', JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                  user: session.user
                }));
              }
            }
          } catch (error) {
            console.error('Error validating session:', error);
            await supabase.auth.signOut();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      setLoading(true);
      
      // Store remember me preference
      localStorage.setItem('rememberMe', rememberMe.toString());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        localStorage.removeItem('rememberMe');
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      localStorage.removeItem('rememberMe');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear remember me preference
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('supabase.auth.token');
      
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signOut,
  };
};