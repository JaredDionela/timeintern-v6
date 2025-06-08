import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

// Hardcoded values to get app running
const supabaseUrl = "https://dmhttwzuhamyhldfjkhc.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaHR0d3p1aGFteWhsZGZqa2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMDQzNTAsImV4cCI6MjA2NDg4MDM1MH0.0uMPWncj4pqxNKVctb7XRS1QsaIrr8uTOg5fEbvdxpo"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)