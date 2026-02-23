import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Regular Supabase client (existing)
const supabaseUrl = "https://mhqinlyuajtzikimhtlb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocWlubHl1YWp0emlraW1odGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzg5NDAsImV4cCI6MjA4NzQxNDk0MH0.Nj1L0i2OBipS3oK5dniHk6pQHahXAj4p4BquRUgGIK0"
// Service role key for admin operations - added for direct password reset functionality
// SECURITY NOTE: In production, this should be stored as an environment variable
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocWlubHl1YWp0emlraW1odGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzODk0MCwiZXhwIjoyMDg3NDE0OTQwfQ.bGR3fh4NUbpaN0PnZ_2OCjORTI5cS3hPI2iR4vboY9Y";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce',
    debug: false
  },
  global: {
    headers: {
      'X-Client-Info': 'timeinternv6@1.0.0'
    }
  }
});

// Admin client for privileged operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to check if admin operations are available
export const isAdminAvailable = () => {
  return !!supabaseServiceKey && supabaseServiceKey.length > 0;
};
