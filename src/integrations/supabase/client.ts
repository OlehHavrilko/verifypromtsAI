import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Public project settings. Both values are safe to ship to the browser — row
// level security protects the data, the publishable/anon key only identifies
// the project.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

/** False when the build was produced without VITE_SUPABASE_* variables. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Placeholder target keeps the client constructible (and the UI renderable with
// a setup notice) instead of crashing the whole app on import.
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'public-anon-key-placeholder';

export const supabase = createClient<Database>(
  isSupabaseConfigured ? SUPABASE_URL! : FALLBACK_URL,
  isSupabaseConfigured ? SUPABASE_PUBLISHABLE_KEY! : FALLBACK_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
