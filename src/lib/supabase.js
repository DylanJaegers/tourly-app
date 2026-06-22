import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://ivnfkugrcysdallglzak.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bmZrdWdyY3lzZGFsbGdsemFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzU0ODMsImV4cCI6MjA5NTA1MTQ4M30.QJdtBvjn-1HmzAlM_q-xriNJ7LPTQ5BMDKWKDV2i8sE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})