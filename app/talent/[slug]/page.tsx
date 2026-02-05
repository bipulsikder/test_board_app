import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { PublicTalentProfileClient } from "@/components/talent/PublicTalentProfileClient"

export const runtime = "nodejs"
export const revalidate = 0

export default async function TalentProfilePage(props: { params: { slug: string } }) {
  const slug = props.params.slug

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("public_profile_slug", slug)
    .eq("public_profile_enabled", true)
    .maybeSingle()

  if (!candidate?.id) notFound()

  const { data: work } = await supabaseAdmin
    .from("work_experience")
    .select("id,company,role,duration,location,description,created_at")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })

  const { data: education } = await supabaseAdmin
    .from("education")
    .select("id,degree,specialization,institution,year,percentage,created_at")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })

  const { email: _email, phone: _phone, auth_user_id: _auth_user_id, ...publicCandidate } = (candidate as any) || {}

  return (
    <PublicTalentProfileClient
      candidate={publicCandidate}
      workItems={(work || []) as any[]}
      educationItems={(education || []) as any[]}
    />
  )
}
