declare namespace NodeJS {
  interface ProcessEnv {
    /** Inlined into the browser bundle; read with dot access so Next.js can replace it at build time. */
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  }
}
