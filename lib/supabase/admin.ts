"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Admin / service-role client — bypasses Row Level Security.
 * Only use server-side for operations that need to read/write regardless of
 * the current user (e.g. reading unpublished websites for the preview route).
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
