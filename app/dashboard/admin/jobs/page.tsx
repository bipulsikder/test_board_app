import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { Job } from "@/lib/types"
import { JobAdminPage } from "@/components/admin/JobAdminPage"

export const runtime = "nodejs"
export const revalidate = 0

export default async function AdminJobsPage() {
  const { data: jobs } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="grid gap-2">
      <div className="text-lg font-semibold">Manage jobs</div>
      <div className="text-sm text-muted-foreground">Assign clients and add skills for richer job cards.</div>
      <div className="mt-2">
        <JobAdminPage jobs={(jobs || []) as any as Job[]} clients={[]} />
      </div>
    </div>
  )
}
