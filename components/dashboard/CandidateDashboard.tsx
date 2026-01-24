"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Application, Candidate } from "@/lib/types"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { AuthPanel } from "@/components/auth/AuthPanel"
import { ApplicationsList } from "@/components/dashboard/ApplicationsList"
import { ProfileEditor } from "@/components/dashboard/ProfileEditor"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"

export function CandidateDashboard() {
  const router = useRouter()
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token

  const [tab, setTab] = useState<"profile" | "applications">("profile")
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [apps, setApps] = useState<(Application & { job?: { id: string; title: string; location: string | null } })[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = useMemo(() => session?.user.email || "", [session])

  const load = async () => {
    if (!accessToken) return
    setBusy(true)
    setError(null)
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/candidate/profile", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("/api/candidate/applications", { headers: { Authorization: `Bearer ${accessToken}` } })
      ])

      const pJson = await pRes.json()
      const aJson = await aRes.json()

      if (!pRes.ok) throw new Error(pJson.error || "Failed to load profile")
      if (!aRes.ok) throw new Error(aJson.error || "Failed to load applications")

      setCandidate(pJson.candidate)
      setApps(aJson.applications || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    load()
  }, [accessToken])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardBody className="pt-6 text-sm text-white/60">Loading…</CardBody>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mx-auto max-w-md">
          <AuthPanel title="Sign in to open your dashboard" />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Your dashboard</h1>
        <div className="text-sm text-white/60">Signed in as {email}</div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant={tab === "profile" ? "primary" : "secondary"} onClick={() => setTab("profile")}>
          Profile
        </Button>
        <Button variant={tab === "applications" ? "primary" : "secondary"} onClick={() => setTab("applications")}>
          Applications
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/")}>Browse jobs</Button>
          <Button variant="secondary" onClick={load} disabled={busy}>
            {busy ? <Spinner /> : null}
            Refresh
          </Button>
        </div>
      </div>

      {tab === "profile" ? (
        candidate ? (
          <ProfileEditor accessToken={accessToken!} candidate={candidate} onCandidateUpdated={(c) => setCandidate(c)} />
        ) : (
          <Card>
            <CardBody className="pt-6 text-sm text-white/60">No candidate profile found yet. Apply to create one.</CardBody>
          </Card>
        )
      ) : null}

      {tab === "applications" ? <ApplicationsList rows={apps} /> : null}
    </main>
  )
}

