import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ekkadcdrnxbhufndysvn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FkY2RybnhiaHVmbmR5c3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Nzc3MjEsImV4cCI6MjA5NjE1MzcyMX0.tcV8tJIJN5uyJy_6bVxb5RMDxb0h3U5ePWQlTIbJ-pk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
