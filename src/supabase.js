import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ekkadcdrnxbhufndysvn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FkY2RybnhiaHVmbmR5c3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTMzMjQsImV4cCI6MjA2NDYyOTMyNH0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
