import "server-only"
import { createClient } from "@supabase/supabase-js"

import { SUPABASE_URL } from "@/lib/supabaseEnv"

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey)
