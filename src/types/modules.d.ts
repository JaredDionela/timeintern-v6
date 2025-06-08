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

declare module "qr-scanner" {
  export interface QrScannerOptions {
    preferredCamera?: "user" | "environment";
    maxScansPerSecond?: number;
    highlightScanRegion?: boolean;
    highlightCodeOutline?: boolean;
    overlay?: HTMLElement;
    returnDetailedScanResult?: boolean;
  }

  export interface ScanResult {
    data: string;
    cornerPoints: Array<{ x: number; y: number }>;
  }

  export default class QrScanner {
    constructor(
      video: HTMLVideoElement,
      onDecodeCallback: (result: ScanResult | string) => void,
      options?: QrScannerOptions
    );

    static hasCamera(): Promise<boolean>;
    static listCameras(doNotRequest?: boolean): Promise<Array<{ id: string; label: string }>>;

    start(): Promise<void>;
    stop(): void;
    destroy(): void;
    pause(): void;
    
    setCamera(cameraId: string): Promise<void>;
    turnFlashOn(): Promise<void>;
    turnFlashOff(): Promise<void>;
    isFlashOn(): boolean;
  }
}
