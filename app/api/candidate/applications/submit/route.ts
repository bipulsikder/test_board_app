import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as any
  if (!body?.jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 })

  const { data: candidate, error: cErr } = await supabaseAdmin
    .from("candidates")
    .select("id,name,current_role,total_experience,location,file_url")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  if (cErr) return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })
  if (!candidate?.id) return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 })

  if (!candidate.file_url) return NextResponse.json({ error: "Resume required" }, { status: 400 })
  if (!candidate.name || !candidate.current_role || !candidate.total_experience || !candidate.location) {
    return NextResponse.json({ error: "Complete required profile fields" }, { status: 400 })
  }

  const notesParts: string[] = []
  if (typeof body.coverLetter === "string" && body.coverLetter.trim()) notesParts.push(body.coverLetter.trim())
  if (body.attribution && typeof body.attribution === "object") {
    try {
      notesParts.push(`attribution:${JSON.stringify(body.attribution)}`)
    } catch {}
  }

  const { error: insertErr } = await supabaseAdmin
    .from("applications")
    .insert({
      job_id: body.jobId,
      candidate_id: candidate.id,
      status: "applied",
      notes: notesParts.length ? notesParts.join("\n\n") : null,
      source: "board-app",
      applied_at: nowIso(),
      updated_at: nowIso()
    })

  if (insertErr) {
    if ((insertErr as any).code === "23505") {
      return NextResponse.json({ error: "You have already applied for this job" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
  }

  if (typeof body.inviteToken === "string" && body.inviteToken) {
    const now = nowIso()
    await supabaseAdmin
      .from("job_invites")
      .update({ status: "applied", applied_at: now, responded_at: now, updated_at: now, candidate_id: candidate.id })
      .eq("token", body.inviteToken)
      .eq("job_id", body.jobId)
  }

  return NextResponse.json({ success: true })
}
