// filepath: src/types/auth.ts
export interface SignUpData {
  email: string;
  password: string;
  name: string;
  requiredHours: number;
}

export interface SignInData {
  email: string;
  password: string;
  isAdmin: boolean;
}

export interface AuthFormProps {
  onSubmit: (data: SignUpData | SignInData) => Promise<void>;
  loading: boolean;
}

export interface InternProfile {
  user_id: string;
  name: string;
  email: string;
  required_hours: number;
}
