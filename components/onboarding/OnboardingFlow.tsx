"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import type { Candidate, ParsingJob } from "@/lib/types"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { sanitizeReturnTo } from "@/lib/returnTo"
import { ResumeStep } from "@/components/apply/ResumeStep"
import { ProfileStep } from "@/components/apply/ProfileStep"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"

type Step = "resume" | "profile"

export function OnboardingFlow() {
  const router = useRouter()
  const search = useSearchParams()
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token
  const returnTo = useMemo(() => sanitizeReturnTo(search.get("returnTo"), "/jobs"), [search])

  const [step, setStep] = useState<Step>("resume")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [parsingJob, setParsingJob] = useState<ParsingJob | null>(null)

  const steps = useMemo(() => [
    { id: "resume", label: "1. Resume" },
    { id: "profile", label: "2. Profile" }
  ] as const, [])

  const fetchProfile = async () => {
    if (!accessToken) return
    setCandidateLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load profile")
      setCandidate(data.candidate || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCandidateLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    fetchProfile()
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    if (candidate || candidateLoading) return
    const metaName = (session?.user?.user_metadata as any)?.full_name || (session?.user?.user_metadata as any)?.name
    if (!metaName || typeof metaName !== "string") return

    ;(async () => {
      try {
        const res = await fetch("/api/candidate/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            name: metaName,
            current_role: "Candidate",
            total_experience: "0",
            location: "Unknown"
          })
        })
        const data = await res.json()
        if (res.ok && data?.candidate) setCandidate(data.candidate)
      } catch {
        return
      }
    })()
  }, [accessToken, candidate, candidateLoading, session])

  const uploadAndParse = async (file: File) => {
    if (!accessToken) return
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("resume", file)
      const res = await fetch("/api/candidate/resume/parse", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to parse")
      if (data.candidate) setCandidate(data.candidate)
      if (data.parsingJob) setParsingJob(data.parsingJob)
      setStep("profile")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveProfile = async (next: Candidate) => {
    if (!accessToken) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: next.name,
          phone: next.phone,
          current_role: next.current_role,
          total_experience: next.total_experience,
          location: next.location,
          preferred_location: next.preferred_location,
          desired_role: next.desired_role,
          summary: next.summary,
          tags: next.tags
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setCandidate(data.candidate)
      router.push(returnTo)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!accessToken) {
    return (
      <div className="rounded-3xl border bg-card p-8">
        {loading ? <Spinner /> : <div className="text-sm">Unauthorized</div>}
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Finish setting up your profile</div>
          <div className="mt-1 text-sm text-muted-foreground">Upload a resume to autofill, or continue manually.</div>
          {returnTo.includes("/apply") ? (
            <div className="mt-3 rounded-2xl border bg-accent px-4 py-3 text-sm">
              You’ll return to your application after completing your profile.
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {steps.map((s) => (
            <Badge key={s.id} className={step === s.id ? "bg-primary/5 border-primary/20 text-foreground" : ""}>
              {s.label}
            </Badge>
          ))}
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
              Skip for now
            </Button>
          </div>
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

        {step === "resume" ? (
          <ResumeStep
            candidate={candidate}
            candidateLoading={candidateLoading}
            busy={busy}
            parsingJob={parsingJob}
            onError={setError}
            onUploadAndParse={uploadAndParse}
            onSkip={() => setStep("profile")}
          />
        ) : null}

        {step === "profile" ? (
          <div className="grid gap-4">
            <ProfileStep
              candidate={candidate}
              setCandidate={(next) => setCandidate(next)}
              busy={busy}
              onBack={() => setStep("resume")}
              onContinue={() => {
                if (!candidate) return
                saveProfile(candidate)
              }}
            />
            <div className="rounded-2xl border bg-accent px-4 py-3 text-xs text-muted-foreground">
              Your profile will be used to prefill applications and show invites.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
