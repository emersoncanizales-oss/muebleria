import { createClient } from "@supabase/supabase-js";
const config = (import.meta as unknown as { env: Record<string, string> }).env;
export const db =
  config.VITE_SUPABASE_URL && config.VITE_SUPABASE_PUBLISHABLE_KEY
    ? createClient(
        config.VITE_SUPABASE_URL,
        config.VITE_SUPABASE_PUBLISHABLE_KEY,
      )
    : null;
