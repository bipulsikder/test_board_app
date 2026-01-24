import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

async function getCandidateId(user: { id: string; email: string }) {
  const { data } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()
  return data?.id as string | undefined
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const candidateId = await getCandidateId({ id: user.id, email: user.email })
  if (!candidateId) return NextResponse.json({ items: [] })

  const { data, error } = await supabaseAdmin
    .from("work_experience")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const candidateId = await getCandidateId({ id: user.id, email: user.email })
  if (!candidateId) return NextResponse.json({ error: "Candidate profile not found" }, { status: 400 })

  const body = (await request.json().catch(() => null)) as any
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  if (!body.company || !body.role || !body.duration) {
    return NextResponse.json({ error: "company, role, and duration are required" }, { status: 400 })
  }

  const insert = {
    candidate_id: candidateId,
    company: String(body.company).trim(),
    role: String(body.role).trim(),
    duration: String(body.duration).trim(),
    location: typeof body.location === "string" ? body.location : null,
    description: typeof body.description === "string" ? body.description : null,
    responsibilities: typeof body.responsibilities === "string" ? body.responsibilities : null,
    achievements: typeof body.achievements === "string" ? body.achievements : null,
    start_date: typeof body.start_date === "string" ? body.start_date : null,
    end_date: typeof body.end_date === "string" ? body.end_date : null,
    is_current: Boolean(body.is_current),
    technologies: Array.isArray(body.technologies) ? body.technologies : [],
    created_at: nowIso()
  }

  const { data, error } = await supabaseAdmin.from("work_experience").insert(insert).select("*").single()
  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  return NextResponse.json({ item: data })
}

