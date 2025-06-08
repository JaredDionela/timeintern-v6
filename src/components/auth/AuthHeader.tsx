import { CardDescription, CardHeader } from "@/components/ui/card";
import { APP_INFO } from "@/constants/auth";

export const AuthHeader = () => {
  return (
    <CardHeader className="text-center space-y-4">
      <div className="mx-auto w-56 h-42">
        <img 
          src={APP_INFO.LOGO_PATH} 
          alt={APP_INFO.LOGO_ALT} 
          className="w-full h-full object-contain" 
        />
      </div>
      <div>
        <CardDescription>
          {APP_INFO.NAME}
        </CardDescription>
      </div>
    </CardHeader>
  );
};
