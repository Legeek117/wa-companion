import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from './logger';

let supabaseClientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set. Storage/Auth features requiring Supabase might fail.');
    // Return a dummy client to prevent immediate crashes, but operations will fail
    return createClient('https://dummy.supabase.co', 'dummy-key');
  }

  supabaseClientInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClientInstance;
};
