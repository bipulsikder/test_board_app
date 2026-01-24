import { createSupabaseServerClientReadonly } from "@/lib/supabaseSsr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { Job } from "@/lib/types"
import { PublicJobsPage } from "@/components/public/PublicJobsPage"
import { DashboardShell } from "@/components/shell/DashboardShell"
import { JobCard } from "@/components/jobs/JobCard"
import { Pagination } from "@/components/jobs/Pagination"
import { JobsFilters } from "@/components/jobs/JobsFilters"

export const runtime = "nodejs"
export const revalidate = 0

function parsePage(value: unknown) {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

function parseList(value: unknown) {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap((v) => (typeof v === "string" ? v.split(",") : [])).map((s) => s.trim()).filter(Boolean)
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean)
  return []
}

export default async function JobsPage(props: {
  searchParams?: { page?: string; q?: string; role?: string; skills?: string | string[]; location?: string; jobType?: string }
}) {
  const page = parsePage(props.searchParams?.page)
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const q = (props.searchParams?.q || "").toString().trim()
  const role = (props.searchParams?.role || "").toString().trim()
  const location = (props.searchParams?.location || "").toString().trim()
  const jobType = (props.searchParams?.jobType || "").toString().trim()
  const skills = parseList(props.searchParams?.skills)

  const supabase = createSupabaseServerClientReadonly()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  let query = supabaseAdmin.from("jobs").select("*", { count: "exact" }).eq("status", "open")

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,client_name.ilike.%${q}%`)
  }
  if (role) {
    query = query.or(`department.ilike.%${role}%,industry.ilike.%${role}%`)
  }
  if (location) {
    query = query.ilike("location", `%${location}%`)
  }
  if (jobType) {
    query = query.eq("type", jobType)
  }
  if (skills.length) {
    query = query.contains("skills_required", skills)
  }

  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to)

  const total = count || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const jobs = (data || []) as Job[]

  const clientIds = Array.from(new Set(jobs.map((j: any) => j.client_id).filter((x) => typeof x === "string" && x.length > 0)))
  const { data: clientsData } = clientIds.length
    ? await supabaseAdmin.from("clients").select("id,name,slug,logo_url").in("id", clientIds)
    : { data: [] as any[] }
  const clientsById = new Map<string, any>()
  for (const c of (clientsData || []) as any[]) clientsById.set(c.id, c)

  if (user) {
    return (
      <DashboardShell>
        <div className="grid gap-4">
          <div>
            <div className="text-lg font-semibold">Jobs</div>
            <div className="mt-1 text-sm text-muted-foreground">Browse roles and apply with one tap.</div>
          </div>

          <JobsFilters initial={{ q, role, skills, location, jobType }} />

          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job as any}
                client={(job as any).client_id ? (clientsById.get((job as any).client_id) as any) : null}
                ctaLabel="Apply"
              />
            ))}
          </div>

          <Pagination basePath="/jobs" page={page} totalPages={totalPages} />
        </div>
      </DashboardShell>
    )
  }

  return (
    <PublicJobsPage
      jobs={jobs as any}
      clients={Object.fromEntries(Array.from(clientsById.entries())) as any}
      page={page}
      totalPages={totalPages}
      totalCount={total}
      filters={{ q, role, location, jobType, skills }}
    />
  )
}
