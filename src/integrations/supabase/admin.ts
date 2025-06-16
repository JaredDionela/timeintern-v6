import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Regular Supabase client (existing)
const supabaseUrl = "https://dmhttwzuhamyhldfjkhc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaHR0d3p1aGFteWhsZGZqa2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMDQzNTAsImV4cCI6MjA2NDg4MDM1MH0.0uMPWncj4pqxNKVctb7XRS1QsaIrr8uTOg5fEbvdxpo"
// Service role key for admin operations - added for direct password reset functionality
// SECURITY NOTE: In production, this should be stored as an environment variable
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaHR0d3p1aGFteWhsZGZqa2hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMwNDM1MCwiZXhwIjoyMDY0ODgwMzUwfQ.axOP14FlwLtc8OrjgkVP2N-PI4Tg8HUJtx_J2RT-WI4";

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
