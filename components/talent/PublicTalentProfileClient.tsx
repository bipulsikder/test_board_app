"use client"

import { useMemo } from "react"
import { ProfileBraintrust } from "@/components/dashboard/ProfileBraintrust"

export function PublicTalentProfileClient({
  candidate,
  workItems,
  educationItems
}: {
  candidate: any
  workItems: any[]
  educationItems: any[]
}) {
  const safeCandidate = useMemo(() => {
    return {
      ...candidate,
      email: "",
      phone: null,
      name: typeof candidate?.name === "string" ? candidate.name : "Candidate",
      location: typeof candidate?.location === "string" ? candidate.location : "",
      current_role: typeof candidate?.current_role === "string" ? candidate.current_role : "Candidate",
      total_experience: typeof candidate?.total_experience === "string" ? candidate.total_experience : "0",
      tags: candidate?.tags ?? []
    }
  }, [candidate])

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <ProfileBraintrust
          mode="public"
          candidate={safeCandidate}
          accessToken={undefined}
          onCandidateUpdated={() => {}}
          initialWorkItems={workItems}
          initialEducationItems={educationItems}
        />
      </div>
    </div>
  )
}

