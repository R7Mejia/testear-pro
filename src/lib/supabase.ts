import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_SUPABASE_URL = "https://gmtktqiozkarlgbafwfo.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtdGt0cWlvemthcmxnYmFmd2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTAwMDQsImV4cCI6MjA5Mzg2NjAwNH0.O3oYzByF_wvxR70mgIinDihiV4h5sn8LNZql15KCaR8";

function getRuntimeEnv(name: string) {
  if (typeof process === "undefined") return undefined;
  return process.env?.[name];
}

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? getRuntimeEnv("SUPABASE_URL") ?? DEFAULT_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  getRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ??
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});