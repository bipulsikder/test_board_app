import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("parsing_job_id")
  if (!id) return NextResponse.json({ error: "Missing parsing_job_id" }, { status: 400 })

  const { data: candidate } = await supabaseAdmin.from("candidates").select("id").eq("email", user.email).maybeSingle()
  if (!candidate?.id) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })

  const { data: job, error } = await supabaseAdmin
    .from("parsing_jobs")
    .select("*")
    .eq("id", id)
    .eq("candidate_id", candidate.id)
    .single()

  if (error) return NextResponse.json({ error: "Parsing job not found" }, { status: 404 })
  return NextResponse.json({ parsingJob: job })
}

