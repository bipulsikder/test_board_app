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
    .from("education")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("end_date", { ascending: false })
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
  if (!body.degree || !body.institution) {
    return NextResponse.json({ error: "degree and institution are required" }, { status: 400 })
  }

  const insert = {
    candidate_id: candidateId,
    degree: String(body.degree).trim(),
    institution: String(body.institution).trim(),
    specialization: typeof body.specialization === "string" ? body.specialization : null,
    year: typeof body.year === "string" ? body.year : null,
    percentage: typeof body.percentage === "string" ? body.percentage : null,
    description: typeof body.description === "string" ? body.description : null,
    coursework: typeof body.coursework === "string" ? body.coursework : null,
    projects: typeof body.projects === "string" ? body.projects : null,
    achievements: typeof body.achievements === "string" ? body.achievements : null,
    start_date: typeof body.start_date === "string" ? body.start_date : null,
    end_date: typeof body.end_date === "string" ? body.end_date : null,
    is_highest: Boolean(body.is_highest),
    created_at: nowIso()
  }

  const { data, error } = await supabaseAdmin.from("education").insert(insert).select("*").single()
  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  return NextResponse.json({ item: data })
}

