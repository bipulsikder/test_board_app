"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Job } from "@/lib/types"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { bearerHeaders } from "@/lib/http"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Modal } from "@/components/ui/Modal"
import { Spinner } from "@/components/ui/Spinner"
import { ApplyStepper } from "@/components/ApplyStepper"
import { AuthStep } from "@/components/apply/AuthStep"

export function JobApplyForm({ job }: { job: Job }) {
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  const isExternal = String((job as any).apply_type || "in_platform") === "external"
  const externalUrl = String((job as any).external_apply_url || "").trim()

  useEffect(() => {
    const shouldOpen = sp.get("apply") === "1"
    if (shouldOpen) {
      setOpen(true)
      const next = new URLSearchParams(sp.toString())
      next.delete("apply")
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
    }
  }, [pathname, router, sp])

  useEffect(() => {
    if (!accessToken) {
      setApplicationId(null)
      return
    }
    let active = true
    fetch(`/api/candidate/applications?jobId=${encodeURIComponent(job.id)}`, { headers: bearerHeaders(accessToken) })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!active) return
        if (!r.ok) return
        const row = Array.isArray(data?.applications) ? data.applications[0] : null
        setApplicationId(row?.id ? String(row.id) : null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [accessToken, job.id])

  const continueExternal = async () => {
    if (!accessToken) return
    if (!externalUrl) {
      setError("This job does not have a company apply link yet.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/external-apply", {
        method: "POST",
        headers: bearerHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ jobId: job.id, redirectUrl: externalUrl, referrer: document.referrer || null })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to continue")
      window.open(externalUrl, "_blank", "noopener,noreferrer")
      setOpen(false)
    } catch (e: any) {
      setError(e.message || "Failed to continue")
    } finally {
      setBusy(false)
    }
  }

  const ctaLabel = isExternal
    ? "Apply on company site"
    : applicationId
      ? "Applied"
      : session
        ? "Apply"
        : "Upload your CV to apply"

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-3">
          {applicationId ? (
            <div className="grid gap-2">
              <Button variant="secondary" onClick={() => router.push(`/dashboard/my-work?tab=applications&applicationId=${encodeURIComponent(applicationId)}`)} className="w-full h-12">
                View status
              </Button>
              <div className="text-xs text-muted-foreground">You already applied for this job.</div>
            </div>
          ) : (
            <Button onClick={() => setOpen(true)} className="w-full h-12">
            {loading ? <Spinner /> : null}
            {ctaLabel}
            </Button>
          )}
          {!session ? <div className="text-xs text-muted-foreground">Takes less than 2 minutes — resume autofill + one‑tap apply.</div> : null}
        </div>

        <Modal open={open} onClose={() => setOpen(false)} title={isExternal ? `Apply on company site — ${job.title}` : `Apply — ${job.title}`}>
          {error ? <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}
          {isExternal ? (
            session ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border bg-accent p-4 text-sm text-muted-foreground">
                  You’ll be redirected to the company’s official job page to complete your application.
                </div>
                <Button onClick={continueExternal} disabled={busy} className="h-12">
                  {busy ? <Spinner /> : null}
                  Continue to company site
                </Button>
              </div>
            ) : (
              <AuthStep jobId={job.id} returnTo={`/onboarding?returnTo=${encodeURIComponent(`/jobs/${job.id}?apply=1`)}`} onError={setError} />
            )
          ) : applicationId ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border bg-accent p-4 text-sm text-muted-foreground">You already applied for this job.</div>
              <Button
                variant="secondary"
                onClick={() => router.push(`/dashboard/my-work?tab=applications&applicationId=${encodeURIComponent(applicationId)}`)}
                className="h-12"
              >
                View status
              </Button>
            </div>
          ) : (
            <ApplyStepper job={job} />
          )}
        </Modal>
      </CardBody>
    </Card>
  )
}
