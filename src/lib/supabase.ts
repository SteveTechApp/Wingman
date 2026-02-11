
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// In Phase 1, we keep it simple (no auth required).
// In dev, if env vars are missing, we still allow the app to boot
// and show a clear console warning.
if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Comparison DB will not work until set.");
}

export const supabase = createClient(url ?? "http://localhost:54321", anon ?? "dev-anon-key");


