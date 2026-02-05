"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import type { Application, Job } from "@/lib/types"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { Spinner } from "@/components/ui/Spinner"

type InviteRow = {
  id: string
  status: string | null
  token: string | null
  sent_at: string | null
  opened_at: string | null
  responded_at: string | null
  applied_at: string | null
  rejected_at: string | null
  created_at: string | null
  jobs?: Pick<Job, "id" | "title" | "location" | "industry" | "sub_category" | "employment_type">
}

type ApplicationRow = Application & { jobs?: Pick<Job, "id" | "title" | "location"> }

type Tab = "invites" | "applications"

export function MyWork() {
  const { session, loading } = useSupabaseSession()
  const accessToken = session?.access_token
  const search = useSearchParams()
  const router = useRouter()

  const tab = useMemo<Tab>(() => {
    const t = (search.get("tab") || "invites").toLowerCase()
    return t === "applications" ? "applications" : "invites"
  }, [search])

  const focusApplicationId = useMemo(() => {
    const v = search.get("applicationId")
    return v ? v.trim() : ""
  }, [search])

  const [busy, setBusy] = useState(false)
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(search.toString())
    params.set("tab", next)
    router.push(`/dashboard/my-work?${params.toString()}`)
  }

  useEffect(() => {
    if (!focusApplicationId) return
    if (tab !== "applications") {
      const params = new URLSearchParams(search.toString())
      params.set("tab", "applications")
      router.replace(`/dashboard/my-work?${params.toString()}`)
    }
  }, [focusApplicationId, router, search, tab])

  useEffect(() => {
    if (loading) return
    if (!accessToken) return

    let active = true
    setBusy(true)
    setError(null)

    const load = async () => {
      try {
        const [invRes, appRes] = await Promise.all([
          fetch("/api/candidate/invites", { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch("/api/candidate/applications", { headers: { Authorization: `Bearer ${accessToken}` } })
        ])

        const inv = await invRes.json().catch(() => null)
        const app = await appRes.json().catch(() => null)
        if (!active) return

        if (invRes.ok) setInvites(inv?.invites || [])
        else setInvites([])

        if (appRes.ok) setApplications(app?.applications || [])
        else setApplications([])

        const errs: string[] = []
        if (!invRes.ok) errs.push(inv?.error || "Failed to load invites")
        if (!appRes.ok) errs.push(app?.error || "Failed to load applications")
        setError(errs.length ? errs.join(" • ") : null)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || "Failed to load")
      } finally {
        if (!active) return
        setBusy(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [accessToken, loading])

  useEffect(() => {
    if (!focusApplicationId) return
    if (busy) return
    if (tab !== "applications") return
    const el = document.getElementById(`application-${focusApplicationId}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [busy, focusApplicationId, tab])

  if (!accessToken) {
    return <div className="rounded-3xl border bg-card p-8">{loading ? <Spinner /> : "Unauthorized"}</div>
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <button
          onClick={() => setTab("invites")}
          className={[
            "px-3 py-2 text-sm font-medium",
            tab === "invites" ? "border-b-2 border-foreground" : "text-muted-foreground"
          ].join(" ")}
        >
          Invites
        </button>
        <button
          onClick={() => setTab("applications")}
          className={[
            "px-3 py-2 text-sm font-medium",
            tab === "applications" ? "border-b-2 border-foreground" : "text-muted-foreground"
          ].join(" ")}
        >
          Applications
        </button>
        <div className="ml-auto text-xs text-muted-foreground">Job Offers • My Jobs • 1:1 Help Offers • Invoices (coming soon)</div>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

      {busy ? (
        <div className="rounded-3xl border bg-card p-8">
          <Spinner />
        </div>
      ) : tab === "invites" ? (
        <div className="rounded-3xl border bg-card p-10">
          {!invites.length ? (
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-[#FCE99A]" />
              <div className="text-lg font-semibold">No invites yet</div>
              <div className="mt-2 text-sm text-muted-foreground">
                When you are invited to submit an application for jobs they will appear here.
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {invites.map((row) => (
                <div key={row.id} className="rounded-3xl border bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{row.jobs?.title || "Invite"}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {row.jobs?.location || "Remote"} {row.jobs?.industry ? `• ${row.jobs.industry}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border bg-card px-3 py-1.5">{row.status || "sent"}</span>
                        {row.opened_at ? <span>Opened</span> : <span>Not opened</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.status !== "rejected" ? (
                        <button
                          className="rounded-full border bg-background px-4 py-2 text-sm hover:bg-accent"
                          onClick={async () => {
                            setBusy(true)
                            setError(null)
                            try {
                              const res = await fetch("/api/candidate/invites", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                                body: JSON.stringify({ inviteId: row.id, action: "reject" })
                              })
                              const data = await res.json().catch(() => null)
                              if (!res.ok) throw new Error(data?.error || "Failed")
                              setInvites((prev) => prev.map((x) => (x.id === row.id ? { ...x, status: "rejected" } : x)))
                            } catch (e: any) {
                              setError(e.message || "Failed")
                            } finally {
                              setBusy(false)
                            }
                          }}
                        >
                          Reject
                        </button>
                      ) : null}
                      {row.token ? (
                        <Link className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href={`/invite/${row.token}`}>
                          Apply
                        </Link>
                      ) : row.jobs?.id ? (
                        <Link className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href={`/jobs/${row.jobs.id}/apply`}>
                          Apply
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border bg-card p-6">
          {!applications.length ? (
            <div className="text-sm text-muted-foreground">No applications yet.</div>
          ) : (
            <div className="grid gap-3">
              {applications.map((row) => (
                <div
                  key={row.id}
                  id={`application-${row.id}`}
                  className={[
                    "rounded-3xl border bg-background p-5",
                    focusApplicationId && row.id === focusApplicationId ? "border-primary/40 bg-primary/5" : ""
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{row.jobs?.title || row.job_id}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {row.applied_at ? new Date(row.applied_at).toLocaleDateString() : ""}
                        {row.jobs?.location ? ` • ${row.jobs.location}` : ""}
                      </div>
                    </div>
                    <div className="rounded-full border bg-card px-3 py-1.5 text-xs">{row.status || "applied"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
