import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

async function getCandidateId(user: { id: string; email: string }) {
  const { data } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()
  return data?.id as string | undefined
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const candidateId = await getCandidateId({ id: user.id, email: user.email })
  if (!candidateId) return NextResponse.json({ error: "Candidate profile not found" }, { status: 400 })

  const { id } = await params
  const body = (await request.json().catch(() => null)) as any
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const allowed = [
    "degree",
    "institution",
    "specialization",
    "year",
    "percentage",
    "description",
    "coursework",
    "projects",
    "achievements",
    "start_date",
    "end_date",
    "is_highest"
  ]
  const patch: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) patch[k] = body[k]
  }

  const { data, error } = await supabaseAdmin
    .from("education")
    .update(patch)
    .eq("id", id)
    .eq("candidate_id", candidateId)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const candidateId = await getCandidateId({ id: user.id, email: user.email })
  if (!candidateId) return NextResponse.json({ error: "Candidate profile not found" }, { status: 400 })

  const { id } = await params
  const { error } = await supabaseAdmin.from("education").delete().eq("id", id).eq("candidate_id", candidateId)
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

