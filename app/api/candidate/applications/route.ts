import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: candidate, error: cErr } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()
  if (cErr) return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })
  if (!candidate?.id) return NextResponse.json({ applications: [] })

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  let query = supabaseAdmin
    .from("applications")
    .select("*, jobs(id,title,location)")
    .eq("candidate_id", candidate.id)

  if (jobId) query = query.eq("job_id", jobId)

  const { data: applications, error: aErr } = await query.order("applied_at", { ascending: false })

  if (aErr) return NextResponse.json({ error: "Failed to load applications" }, { status: 500 })
  return NextResponse.json({ applications: applications || [] })
}
