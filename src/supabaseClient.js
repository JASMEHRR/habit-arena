// Single shared Supabase client for the whole app.
// Keys come from environment variables (never hardcode them). In Vite,
// only vars prefixed with VITE_ are exposed to the browser. See .env.example.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // A clear message beats a cryptic crash later. Fill in your .env file.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and add your ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).'
  )
}

// Fall back to a syntactically valid placeholder when env vars are missing so
// the app still renders (with a clear console warning) instead of crashing at
// import time. Any real request will simply fail and surface a friendly error.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)
