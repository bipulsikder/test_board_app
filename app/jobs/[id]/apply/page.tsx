import { notFound, redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClientReadonly } from "@/lib/supabaseSsr"
import type { Job } from "@/lib/types"
import { sanitizeReturnTo } from "@/lib/returnTo"
import { JobApplyPageClient } from "@/components/jobs/JobApplyPageClient"

export const runtime = "nodejs"
export const revalidate = 0

function isProfileComplete(candidate: any) {
  if (!candidate) return false
  const hasBasics = Boolean(candidate.name && candidate.current_role && candidate.location && candidate.total_experience)
  const hasResume = Boolean(candidate.file_url)
  return hasBasics && hasResume
}

export default async function JobApplyPage(props: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await props.params
  const jobApplyPath = `/jobs/${id}/apply`

  const { data: jobRow } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single()
  if (!jobRow) notFound()
  const job = jobRow as Job & { client_id?: string | null; client_name?: string | null; amount?: string | null; skills_required?: string[] | null }

  const supabase = await createSupabaseServerClientReadonly()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("id,name,current_role,location,total_experience,file_url")
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    if (!isProfileComplete(candidate)) {
      const returnTo = sanitizeReturnTo(jobApplyPath, "/jobs")
      redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
    }
  }

  let client: {
    name: string
    slug: string | null
    logo_url: string | null
    website?: string | null
    company_type?: string | null
    location?: string | null
    open_jobs_count?: number
  } | null = null
  if ((job as any).client_id) {
    const { data } = await supabaseAdmin
      .from("clients")
      .select("id,name,slug,logo_url,website,company_type,location")
      .eq("id", (job as any).client_id)
      .maybeSingle()

    if (data?.id) {
      const { count } = await supabaseAdmin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("client_id", data.id)
      client = { ...(data as any), open_jobs_count: count || 0 }
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <JobApplyPageClient job={job} client={client} />
    </main>
  )
}
