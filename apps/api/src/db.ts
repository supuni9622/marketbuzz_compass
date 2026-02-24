import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let client: SupabaseClient | null = null;

export const db = {
  get(): SupabaseClient {
    if (!client) {
      if (!config.supabaseUrl || !config.supabaseKey) {
        throw new Error(
          "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set. Copy .env.example to .env and add your Supabase credentials."
        );
      }
      client = createClient(config.supabaseUrl, config.supabaseKey);
    }
    return client;
  },

  isConfigured(): boolean {
    return Boolean(config.supabaseUrl && config.supabaseKey);
  },

  async close(): Promise<void> {
    client = null;
  },
};
