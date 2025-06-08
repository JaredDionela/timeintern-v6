import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { SignUpData, SignInData } from "@/types/auth";
import { validateRequiredHours } from "@/utils/auth";

const Index = () => {
  const { loading, handleAuth } = useAuth();

  const handleSignUpSubmit = async (data: SignUpData) => {
    const validatedData = {
      ...data,
      requiredHours: validateRequiredHours(data.requiredHours.toString())
    };
    await handleAuth(validatedData, true);
  };

  const handleSignInSubmit = async (data: SignInData) => {
    await handleAuth(data, false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      
      <Card className="w-full max-w-md backdrop-blur-sm relative z-10 shadow-2xl">
        <AuthHeader />
        
        <CardContent>
          <Tabs 
            defaultValue="signin" 
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <SignInForm 
                onSubmit={handleSignInSubmit}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="signup">
              <SignUpForm 
                onSubmit={handleSignUpSubmit}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
