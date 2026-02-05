import { JobsBoardClient } from "@/components/jobs/JobsBoardClient"

export const runtime = "nodejs"
export const revalidate = 0

export default async function DashboardJobsPage() {
  return <JobsBoardClient embedded />
}
