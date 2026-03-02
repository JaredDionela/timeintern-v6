import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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