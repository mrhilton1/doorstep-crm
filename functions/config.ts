export const onRequestGet = async ({ env }: { env: Record<string, string | undefined> }) => {
  const config = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
    VITE_SUPABASE_SCHEMA: env.VITE_SUPABASE_SCHEMA || 'doorstep',
    VITE_APP_URL: env.VITE_APP_URL || env.APP_URL || '',
  };

  return new Response(`window.__DOORSTEP_CONFIG__ = ${JSON.stringify(config)};`, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
