"use client"

import { useEffect, useMemo, useState } from "react"
import type { Candidate, Job, ParsingJob } from "@/lib/types"
import { getAttribution } from "@/lib/attribution"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { Badge } from "@/components/ui/Badge"
import { AuthStep } from "@/components/apply/AuthStep"
import { ResumeStep } from "@/components/apply/ResumeStep"
import { ProfileStep } from "@/components/apply/ProfileStep"
import { ReviewStep } from "@/components/apply/ReviewStep"
import { ApplySuccess } from "@/components/apply/ApplySuccess"

type Step = "auth" | "resume" | "profile" | "review" | "done"

export function ApplyStepper({ job }: { job: Job }) {
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token

  const [step, setStep] = useState<Step>("auth")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [parsingJob, setParsingJob] = useState<ParsingJob | null>(null)
  const [coverLetter, setCoverLetter] = useState("")

  useEffect(() => {
    if (loading) return
    if (!session) setStep("auth")
    else setStep("resume")
  }, [loading, session])

  const fetchProfile = async () => {
    if (!accessToken) return
    setCandidateLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/profile", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
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

  const needsResume = !candidate?.file_url
  const requiredMissing = !candidate?.current_role || !candidate?.location || !candidate?.total_experience || !candidate?.name

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

  const saveProfile = async (next: Candidate, nextStep: Step) => {
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
      setStep(nextStep)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!accessToken) return
    setBusy(true)
    setError(null)

    try {
      const attr = getAttribution()
      const res = await fetch("/api/candidate/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ jobId: job.id, coverLetter, attribution: attr })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")
      setStep("done")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const steps = useMemo(
    () => [
      { id: "auth", label: "1. Sign in" },
      { id: "resume", label: "2. Resume" },
      { id: "profile", label: "3. Autofill" },
      { id: "review", label: "4. One‑tap apply" }
    ],
    []
  )

  if (step === "done") return <ApplySuccess />

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <Badge key={s.id} className={step === s.id ? "bg-primary/5 border-primary/20 text-foreground" : ""}>
            {s.label}
          </Badge>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      {step === "auth" ? <AuthStep jobId={job.id} onError={setError} /> : null}

      {step === "resume" ? (
        <ResumeStep
          candidate={candidate}
          candidateLoading={candidateLoading}
          busy={busy}
          parsingJob={parsingJob}
          onError={setError}
          onUploadAndParse={uploadAndParse}
          onSkip={() => setStep(requiredMissing ? "profile" : "review")}
        />
      ) : null}

      {step === "profile" ? (
        <ProfileStep
          candidate={candidate}
          setCandidate={(next) => setCandidate(next)}
          busy={busy}
          onBack={() => setStep("resume")}
          onContinue={() => {
            if (!candidate) return
            saveProfile(candidate, "review")
          }}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          job={job}
          candidate={candidate}
          coverLetter={coverLetter}
          setCoverLetter={setCoverLetter}
          busy={busy}
          onBack={() => setStep("profile")}
          onSubmit={submit}
        />
      ) : null}

      {needsResume && step === "review" ? <div className="text-xs text-muted-foreground">Upload a resume before submitting.</div> : null}
      {requiredMissing && step === "review" ? <div className="text-xs text-muted-foreground">Complete required profile fields before submitting.</div> : null}
    </div>
  )
}
