import "server-only"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function getAuthedUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  if (!token) return { user: null as null | { id: string; email: string }, token: null as null | string }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user?.email) return { user: null, token: null }

  return { user: { id: data.user.id, email: data.user.email }, token }
}

