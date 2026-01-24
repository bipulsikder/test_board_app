"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { Job } from "@/lib/types"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"
import { Textarea } from "@/components/ui/Input"

export function JobApplyForm({ job }: { job: Job }) {
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token
  const sp = useSearchParams()
  const invite = sp.get("invite")

  const [coverLetter, setCoverLetter] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const returnTo = useMemo(() => {
    const base = `/jobs/${job.id}/apply`
    return invite ? `${base}?invite=${encodeURIComponent(invite)}` : base
  }, [job.id, invite])

  const submit = async () => {
    if (!accessToken) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ jobId: job.id, coverLetter, inviteToken: invite })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")
      setDone(true)
    } catch (e: any) {
      setError(e.message || "Failed to submit")
    } finally {
      setBusy(false)
    }
  }

  if (!accessToken) {
    return (
      <Card>
        <CardBody className="pt-6">
          <div className="grid gap-3">
            <div className="text-base font-semibold">Sign in to apply</div>
            <div className="text-sm text-muted-foreground">Create an account, then complete your profile to submit.</div>
            <div className="flex gap-2">
              <Link className="flex-1" href={`/auth/sign_up?returnTo=${encodeURIComponent(returnTo)}`}>
                <Button className="w-full">Create account</Button>
              </Link>
              <Link className="flex-1" href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
                <Button variant="secondary" className="w-full">Log in</Button>
              </Link>
            </div>
            {loading ? <div className="text-xs text-muted-foreground">Checking session…</div> : null}
          </div>
        </CardBody>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <CardBody className="pt-6">
          <div className="grid gap-3">
            <div className="text-base font-semibold">Application submitted</div>
            <div className="text-sm text-muted-foreground">You can track updates in your dashboard.</div>
            <div className="flex gap-2">
              <Link className="flex-1" href="/dashboard/my-work?tab=applications">
                <Button className="w-full">Open dashboard</Button>
              </Link>
              <Link className="flex-1" href="/jobs">
                <Button variant="secondary" className="w-full">More jobs</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-4">
          <div>
            <div className="text-base font-semibold">Apply</div>
            <div className="mt-1 text-sm text-muted-foreground">Add a quick note (optional) and submit.</div>
          </div>

          {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Cover letter (optional)</div>
            <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Write a short note…" />
          </div>

          <Button onClick={submit} disabled={busy} className="h-12">
            {busy ? <Spinner /> : null}
            Submit application
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
