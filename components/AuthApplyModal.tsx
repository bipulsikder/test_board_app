"use client"
import type { Job } from "@/lib/types"
import { ApplyModal } from "@/components/ApplyModal"

export default function AuthApplyModal({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const job = {
    id: jobId,
    title: jobTitle,
    description: null,
    department: null,
    location: null,
    type: null,
    status: "open",
    requirements: null,
    salary_range: null,
    created_at: null,
    updated_at: null,
    industry: null,
    client_name: null,
    experience_min: null,
    experience_max: null
  } satisfies Job

  return <ApplyModal job={job} />
}
