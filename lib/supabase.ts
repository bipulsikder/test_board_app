import { createBrowserClient } from "@supabase/ssr"

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabaseEnv"

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
