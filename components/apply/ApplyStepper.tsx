"use client"

import { useEffect, useMemo, useState } from "react"
import type { Candidate, Job, ParsingJob } from "@/lib/types"
import { getAttribution } from "@/lib/attribution"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import { AuthStep } from "@/components/apply/AuthStep"
import { ResumeStep } from "@/components/apply/ResumeStep"
import { ProfileStep } from "@/components/apply/ProfileStep"
import { ReviewStep } from "@/components/apply/ReviewStep"
import { ApplySuccess } from "@/components/apply/ApplySuccess"

type Step = "auth" | "resume" | "profile" | "review" | "done"

type Mode = "apply" | "profile"

export function ApplyStepper({
  job,
  mode = "apply",
  returnTo,
  authRequireConsent = true,
  onClose,
}: {
  job?: Job
  mode?: Mode
  returnTo?: string
  authRequireConsent?: boolean
  onClose?: () => void
}) {
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token
  const router = useRouter()

  const [step, setStep] = useState<Step>("auth")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [parsingJob, setParsingJob] = useState<ParsingJob | null>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [applicationId, setApplicationId] = useState<string | null>(null)

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
          current_company: next.current_company,
          total_experience: next.total_experience,
          location: next.location,
          preferred_location: next.preferred_location,
          desired_role: next.desired_role,
          current_salary: next.current_salary,
          expected_salary: next.expected_salary,
          highest_qualification: next.highest_qualification,
          degree: next.degree,
          specialization: next.specialization,
          university: next.university,
          education_year: next.education_year,
          education_percentage: next.education_percentage,
          additional_qualifications: next.additional_qualifications,
          summary: next.summary,
          technical_skills: next.technical_skills,
          soft_skills: next.soft_skills,
          languages_known: next.languages_known,
          certifications: next.certifications,
          preferred_roles: (next as any).preferred_roles,
          open_job_types: (next as any).open_job_types,
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
    if (mode !== "apply") return
    if (!job) return
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
      if (data?.applicationId) setApplicationId(String(data.applicationId))
      setStep("done")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const steps = useMemo(() => {
    if (mode === "profile") {
      return [
        { id: "auth", label: "1. Sign in" },
        { id: "resume", label: "2. Resume" },
        { id: "profile", label: "3. Autofill" },
        { id: "review", label: "4. Finish" }
      ]
    }
    return [
      { id: "auth", label: "1. Sign in" },
      { id: "resume", label: "2. Resume" },
      { id: "profile", label: "3. Autofill" },
      { id: "review", label: "4. One‑tap apply" }
    ]
  }, [mode])

  if (step === "done") return <ApplySuccess applicationId={applicationId} />

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

      {step === "auth" ? (
        <AuthStep
          jobId={job?.id || "__profile__"}
          returnTo={returnTo}
          requireConsent={authRequireConsent}
          title={mode === "profile" ? "Create your profile" : "Upload your CV to apply"}
          description={
            mode === "profile"
              ? "Sign in, upload your resume, and review details in under 2 minutes."
              : "Create your profile once for faster applications to logistics jobs."
          }
          onError={setError}
        />
      ) : null}

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
        mode === "profile" ? (
          <div className="grid gap-4 rounded-2xl border bg-card px-6 pb-6 pt-6">
            <div>
              <div className="text-base font-semibold">Profile ready</div>
              <div className="mt-1 text-sm text-muted-foreground">You can now access your dashboard and apply faster.</div>
            </div>
            {candidate ? (
              <div className="grid gap-2 rounded-2xl border bg-accent p-4">
                <div className="text-sm font-medium">{candidate.name}</div>
                <div className="text-xs text-muted-foreground">{candidate.email}</div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent"
                onClick={() => setStep("profile")}
              >
                Back
              </button>
              <button
                type="button"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (onClose) onClose()
                  router.push("/dashboard")
                }}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        ) : (
          <ReviewStep
            job={job as Job}
            candidate={candidate}
            coverLetter={coverLetter}
            setCoverLetter={setCoverLetter}
            busy={busy}
            onBack={() => setStep("profile")}
            onSubmit={submit}
          />
        )
      ) : null}

      {needsResume && step === "review" ? <div className="text-xs text-muted-foreground">Upload a resume before submitting.</div> : null}
      {requiredMissing && step === "review" ? <div className="text-xs text-muted-foreground">Complete required profile fields before submitting.</div> : null}
    </div>
  )
}
