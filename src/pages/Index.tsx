import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAuthData } from "@/lib/clearAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [requiredHours, setRequiredHours] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default to true for persistent login
  const [loading, setLoading] = useState(false);
  const [adminLogin, setAdminLogin] = useState(false); // Local admin checkbox state
  const { toast } = useToast();

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      console.log('User already authenticated, redirecting...');
      
      // Add a small delay to prevent redirect loops
      setTimeout(() => {
        if (isAdmin) {
          navigate("/admin");
        } else {
          navigate("/intern");
        }
      }, 100);
    }
  }, [authLoading, user, isAdmin, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Don't allow admin emails to sign up as interns
        if (email.includes('admin')) {
          throw new Error('Admin emails cannot be used for intern signup');
        }

        // Handle sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}?verification=success`,
            data: {
              name: name,
              required_hours: parseInt(requiredHours || "120")
            }
          }
        });

        if (signUpError) {
          console.error("Signup error:", signUpError);
          throw signUpError;
        }

        if (!data.user) {
          throw new Error('Failed to create user');
        }

        // Create intern profile
        const { error: profileError } = await supabase
          .from('intern_profiles')
          .insert([
            {
              user_id: data.user.id,
              name,
              email,
              required_hours: parseInt(requiredHours || "120"),
            }
          ]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw new Error("Failed to create intern profile. Please contact admin.");
        }

        toast({
          title: "Success",
          description: "Account created successfully. Please check your email for verification.",
          duration: 5000,
        });

      } else {
        // Handle sign in using the auth hook
        const { error: signInError } = await signIn(email, password, rememberMe);

        if (signInError) {
          if (signInError.message?.includes('Email not confirmed')) {
            throw new Error('Please check your email to verify your account before signing in.');
          }
          console.error("Signin error:", signInError);
          throw signInError;
        }

        // Get fresh user data after sign in
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('No user found');
        }

        // Determine if user is admin by email (case-insensitive)
        const isAdminUser = currentUser.email?.toLowerCase().includes('admin');

        // Navigate based on user type and admin checkbox
        if (isAdminUser && adminLogin) {
          navigate("/admin");
        } else if (!isAdminUser || !adminLogin) {
          // Check if user has an intern profile
          const { data: profile, error: profileError } = await supabase
            .from('intern_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (profileError) {
            console.error("Profile fetch error:", profileError);
            throw new Error(`Failed to fetch intern profile: ${profileError.message}`);
          }

          if (!profile) {
            // No profile exists, create one
            const { error: createError } = await supabase
              .from('intern_profiles')
              .insert({
                user_id: currentUser.id,
                name: currentUser.email?.split('@')[0] || 'New Intern',
                email: currentUser.email || '',
                required_hours: 120 // Default value
              });

            if (createError) {
              console.error("Profile creation error:", createError);
              throw new Error("Failed to create intern profile. Please contact admin.");
            }
          }

          // Navigate to intern dashboard whether profile existed or was just created
          navigate("/intern");
        } else {
          throw new Error('Invalid login attempt');
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      
      // If it's a 403 or session error, clear auth data
      if (error.message?.includes('403') || error.message?.includes('Forbidden') || error.message?.includes('session')) {
        console.log('Clearing corrupted auth data due to session error');
        clearAllAuthData();
        localStorage.setItem('auth-error', 'true');
      }
      
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Emergency clear function for testing
  const handleClearAuth = () => {
    clearAllAuthData();
    toast({
      title: "Auth Data Cleared",
      description: "All authentication data has been cleared. Please try signing in again.",
    });
    // Reload the page to reset state
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
      
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-56 h-42">
            <img src="/app-logo.png" alt="App Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardDescription className="text-slate-400">
              Ariva Academy
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4" onValueChange={(value) => setIsSignUp(value === 'signup')}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="rememberMe">Remember me</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={adminLogin}
                    onChange={(e) => setAdminLogin(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isAdmin">Login as Admin</Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="required-hours">Required Hours</Label>
                  <Input
                    id="required-hours"
                    type="number"
                    placeholder="Enter required hours"
                    value={requiredHours}
                    onChange={(e) => setRequiredHours(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing up..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          

        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
