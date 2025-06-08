declare module "next-themes" {
  export interface ThemeProviderProps {
    children: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
  }

  export const ThemeProvider: React.FC<ThemeProviderProps>;
  
  export interface UseThemeProps {
    theme?: string;
    setTheme: (theme: string) => void;
    systemTheme?: string;
    themes: string[];
  }
  
  export function useTheme(): UseThemeProps;
}

declare module "sonner" {
  export interface ToasterProps {
    theme?: "light" | "dark" | "system";
    className?: string;
    toastOptions?: {
      classNames?: {
        toast?: string;
        description?: string;
        actionButton?: string;
        cancelButton?: string;
      };
    };
  }

  export const Toaster: React.FC<ToasterProps>;
}
