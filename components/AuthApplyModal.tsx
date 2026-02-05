"use client"
import type { Job } from "@/lib/types"
import { ApplyModal } from "@/components/ApplyModal"

export default function AuthApplyModal({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const job = {
    id: jobId,
    title: jobTitle,
    description: null,
    location: null,
    status: "open",
    created_at: null,
    updated_at: null,
    industry: null,
    client_name: null
  } satisfies Job

  return <ApplyModal job={job} />
}
