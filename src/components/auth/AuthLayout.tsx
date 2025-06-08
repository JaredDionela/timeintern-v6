import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { APP_CONFIG } from "@/constants/app";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      
      <Card className="w-full max-w-md backdrop-blur-sm relative z-10 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-56 h-42">
            <img 
              src={APP_CONFIG.LOGO_PATH} 
              alt={APP_CONFIG.LOGO_ALT} 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <CardDescription>
              {APP_CONFIG.COMPANY_NAME}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  );
};
