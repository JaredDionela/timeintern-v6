import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SignUpData, SignInData } from '@/types/auth';
import { AUTH_CONFIG } from '@/constants/auth';
import { 
  isAdminEmail, 
  extractNameFromEmail, 
  validateAdminSignup 
} from '@/utils/auth';

export const useAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createInternProfile = async (userId: string, name: string, email: string, requiredHours: number) => {
    const { error } = await supabase
      .from('intern_profiles')
      .insert([{
        user_id: userId,
        name,
        email,
        required_hours: requiredHours,
      }]);

    if (error) {
      console.error("Profile creation error:", error);
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.PROFILE_CREATION_FAILED);
    }
  };

  const fetchOrCreateInternProfile = async (userId: string, userEmail: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('intern_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error(`Failed to fetch intern profile: ${profileError.message}`);
    }

    if (!profile) {
      await createInternProfile(
        userId,
        extractNameFromEmail(userEmail),
        userEmail,
        AUTH_CONFIG.DEFAULT_REQUIRED_HOURS
      );
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    validateAdminSignup(data.email);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}?${AUTH_CONFIG.VERIFICATION_SUCCESS_PARAM}`,
        data: {
          name: data.name,
          required_hours: data.requiredHours
        }
      }
    });

    if (signUpError) {
      console.error("Signup error:", signUpError);
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.USER_CREATION_FAILED);
    }

    await createInternProfile(
      authData.user.id,
      data.name,
      data.email,
      data.requiredHours
    );

    toast({
      title: "Success",
      description: AUTH_CONFIG.MESSAGES.SUCCESS.SIGNUP,
      duration: 5000,
    });
  };

  const handleSignIn = async (data: SignInData) => {
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        throw new Error(AUTH_CONFIG.MESSAGES.ERROR.EMAIL_NOT_CONFIRMED);
      }
      console.error("Signin error:", signInError);
      throw signInError;
    }

    if (!authData.user) {
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.NO_USER_FOUND);
    }

    if (!authData.user.email_confirmed_at) {
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.EMAIL_VERIFICATION_REQUIRED);
    }

    const userEmail = authData.user.email;
    if (!userEmail) {
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.EMAIL_REQUIRED);
    }

    const isAdminUser = isAdminEmail(userEmail);

    if (isAdminUser && data.isAdmin) {
      navigate(AUTH_CONFIG.ROUTES.ADMIN);
    } else if (!isAdminUser || !data.isAdmin) {
      await fetchOrCreateInternProfile(authData.user.id, userEmail);
      navigate(AUTH_CONFIG.ROUTES.INTERN);
    } else {
      throw new Error(AUTH_CONFIG.MESSAGES.ERROR.INVALID_LOGIN);
    }
  };

  const handleAuth = async (data: SignUpData | SignInData, isSignUp: boolean) => {
    setLoading(true);
    
    try {
      if (isSignUp) {
        await handleSignUp(data as SignUpData);
      } else {
        await handleSignIn(data as SignInData);
      }    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleAuth
  };
};
