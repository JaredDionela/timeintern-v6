import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Hardcoded values to get app running
const supabaseUrl = "https://mhqinlyuajtzikimhtlb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocWlubHl1YWp0emlraW1odGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzg5NDAsImV4cCI6MjA4NzQxNDk0MH0.Nj1L0i2OBipS3oK5dniHk6pQHahXAj4p4BquRUgGIK0"

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
  },
  db: {
    schema: 'public'
  }
})
