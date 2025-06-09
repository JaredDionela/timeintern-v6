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
    let mounted = true;

    // Check for existing session on mount
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user && mounted) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(session.user?.email?.toLowerCase().includes('admin') || false);
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          
          // Clear all auth-related storage
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('supabase.auth.token');
        } else if (session?.user) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(session.user?.email?.toLowerCase().includes('admin') || false);
          setLoading(false);

          // Handle session persistence
          if (event === 'SIGNED_IN') {
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            if (rememberMe) {
              localStorage.setItem('supabase.auth.token', JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: session.user
              }));
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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