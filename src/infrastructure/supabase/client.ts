import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

function createSupabaseClient() {
  // Direct property access lets Next.js inline these public values into the browser bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
    ...(!key ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in .env.local (or .env) and restart the Next.js dev server.`,
    );
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key, never a secret key.",
    );
  }
  return createBrowserClient<Database>(url, key);
}

let client: ReturnType<typeof createSupabaseClient> | undefined;

// Initialize lazily so importing the module during server rendering does not start a session.
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    client ??= createSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
});
