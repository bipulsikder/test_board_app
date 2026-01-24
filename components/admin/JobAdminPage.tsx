"use client"

import { useMemo, useState } from "react"
import type { ClientProfile, Job } from "@/lib/types"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

type JobRow = Job & { client_id?: string | null; amount?: string | null; skills_required?: string[] | null }

function toSkills(value: string) {
  const list = value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
  return list.length ? list : null
}

export function JobAdminPage({ jobs, clients }: { jobs: JobRow[]; clients: ClientProfile[] }) {
  const clientsById = useMemo(() => {
    const m = new Map<string, ClientProfile>()
    for (const c of clients) m.set(c.id, c)
    return m
  }, [clients])

  const [rows, setRows] = useState<JobRow[]>(jobs)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (jobId: string) => {
    const row = rows.find((r) => r.id === jobId)
    if (!row) return

    setBusyId(jobId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: row.client_id || null,
          client_name: row.client_id ? (clientsById.get(row.client_id)?.name || null) : row.client_name,
          amount: (row as any).amount || null,
          skills_required: (row as any).skills_required || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setRows((prev) => prev.map((p) => (p.id === jobId ? (data.job as JobRow) : p)))
    } catch (e: any) {
      setError(e.message || "Failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

      <div className="grid gap-3">
        {rows.map((job) => {
          const skillsText = Array.isArray((job as any).skills_required) ? ((job as any).skills_required as string[]).join(", ") : ""
          return (
            <Card key={job.id}>
              <CardBody className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{job.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{job.location || "Remote"}</div>
                  </div>

                  <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
                    <div className="grid gap-2">
                      <div className="text-xs font-medium text-muted-foreground">Client</div>
                      <select
                        value={job.client_id || ""}
                        onChange={(e) => {
                          const v = e.target.value || null
                          setRows((prev) => prev.map((p) => (p.id === job.id ? { ...p, client_id: v } : p)))
                        }}
                        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Unassigned</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs font-medium text-muted-foreground">Amount</div>
                      <Input
                        value={(job as any).amount || ""}
                        onChange={(e) => setRows((prev) => prev.map((p) => (p.id === job.id ? ({ ...p, amount: e.target.value } as any) : p)))}
                        placeholder="$ / hour or salary"
                      />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <div className="text-xs font-medium text-muted-foreground">Skills required (comma separated)</div>
                      <Input
                        defaultValue={skillsText}
                        onBlur={(e) => {
                          const skills = toSkills(e.target.value)
                          setRows((prev) => prev.map((p) => (p.id === job.id ? ({ ...p, skills_required: skills } as any) : p)))
                        }}
                        placeholder="Dispatching, TMS, Warehouse ops"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => save(job.id)} disabled={busyId === job.id}>
                    {busyId === job.id ? <Spinner /> : null}
                    Save
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

