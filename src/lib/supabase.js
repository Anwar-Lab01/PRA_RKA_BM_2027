import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example to .env and fill in your Supabase URL and anon key.'
  );
}

// Create client even with placeholder values so the app doesn't crash on import.
// Actual API calls will fail gracefully and show error messages in the UI.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
