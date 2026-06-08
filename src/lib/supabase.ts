import { createClient } from '@supabase/supabase-js';

const runtimeConfig = (globalThis as any).__DOORSTEP_CONFIG__ || {};
const supabaseUrl = runtimeConfig.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = runtimeConfig.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
const supabaseSchema = runtimeConfig.VITE_SUPABASE_SCHEMA || (import.meta as any).env?.VITE_SUPABASE_SCHEMA || 'doorstep';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const fallbackSupabaseUrl = 'https://example.supabase.co';
const fallbackSupabaseAnonKey = 'local-development-placeholder-key';

if (!hasSupabaseConfig) {
  console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseAnonKey
);

export const doorstepDb = supabase.schema(supabaseSchema);

export const appUrl = runtimeConfig.VITE_APP_URL || (import.meta as any).env?.VITE_APP_URL || window.location.origin;
