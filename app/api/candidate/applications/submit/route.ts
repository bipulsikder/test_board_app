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

  const baseInsert: any = {
    job_id: body.jobId,
    candidate_id: candidate.id,
    status: "applied",
    notes: notesParts.length ? notesParts.join("\n\n") : null,
    source: "board-app",
    applied_at: nowIso(),
    updated_at: nowIso()
  }

  let insertErr: any = null
  let insertedId: string | null = null
  {
    const { data: inserted, error } = await supabaseAdmin.from("applications").insert(baseInsert).select("id").maybeSingle()
    insertErr = error
    insertedId = (inserted as any)?.id || null
  }

  if (insertErr) {
    if (insertErr.code === "23505") {
      const now = nowIso()
      const { data: existing } = await supabaseAdmin
        .from("applications")
        .select("id, status, source, applied_at")
        .eq("job_id", body.jobId)
        .eq("candidate_id", candidate.id)
        .maybeSingle()

      if (existing?.id) {
        const nextSource =
          existing.source === "database" ? "database > board-app" : existing.source || "board-app"
        await supabaseAdmin
          .from("applications")
          .update({
            source: nextSource,
            applied_at: existing.applied_at || now,
            updated_at: now,
          })
          .eq("id", existing.id)
      }

      if (typeof body.inviteToken === "string" && body.inviteToken) {
        await supabaseAdmin
          .from("job_invites")
          .update({ status: "applied", applied_at: now, responded_at: now, updated_at: now, candidate_id: candidate.id })
          .eq("token", body.inviteToken)
          .eq("job_id", body.jobId)
      }

      return NextResponse.json({ success: true, existed: true, applicationId: existing?.id || null })
    }

    const msg = String(insertErr.message || "")
    const hintsColumnMissing = insertErr.code === "PGRST204" || msg.toLowerCase().includes("column")
    if (hintsColumnMissing) {
      if (msg.toLowerCase().includes("source")) {
        const retryPayload = { ...baseInsert }
        delete retryPayload.source
        const { error: retryErr } = await supabaseAdmin.from("applications").insert(retryPayload)
        if (!retryErr) insertErr = null
        else insertErr = retryErr
      }
      if (insertErr && msg.toLowerCase().includes("updated_at")) {
        const retryPayload = { ...baseInsert }
        delete retryPayload.source
        delete retryPayload.updated_at
        const { error: retryErr } = await supabaseAdmin.from("applications").insert(retryPayload)
        if (!retryErr) insertErr = null
        else insertErr = retryErr
      }
    }
  }

  if (insertErr) {
    console.error("Application submit failed:", insertErr)
    return NextResponse.json({ error: insertErr.message || "Failed to submit application" }, { status: 500 })
  }

  if (typeof body.inviteToken === "string" && body.inviteToken) {
    const now = nowIso()
    const { error: inviteErr } = await supabaseAdmin
      .from("job_invites")
      .update({ status: "applied", applied_at: now, responded_at: now, updated_at: now, candidate_id: candidate.id })
      .eq("token", body.inviteToken)
      .eq("job_id", body.jobId)
    if (inviteErr) console.warn("Failed to update invite status:", inviteErr)
  }

  ;(async () => {
    try {
      const { data: job } = await supabaseAdmin.from("jobs").select("id,title,client_name").eq("id", body.jobId).maybeSingle()
      await supabaseAdmin.from("candidate_notifications").insert({
        candidate_id: candidate.id,
        type: "application_submitted",
        payload: { jobId: body.jobId, title: job?.title || null, company: job?.client_name || null, applicationId: insertedId }
      })
    } catch {
      return
    }
  })()

  return NextResponse.json({ success: true, applicationId: insertedId })
}
