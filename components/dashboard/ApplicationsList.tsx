"use client"

import type { Application, Job } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"

type Row = Application & { job?: Pick<Job, "id" | "title" | "location"> }

export function ApplicationsList({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
        <CardDescription>Track your submissions across roles.</CardDescription>
      </CardHeader>
      <CardBody>
        {!rows.length ? (
          <div className="text-sm text-white/60">No applications yet.</div>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{row.job?.title || row.job_id}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {row.applied_at ? new Date(row.applied_at).toLocaleString() : ""}
                      {row.job?.location ? ` • ${row.job.location}` : ""}
                    </div>
                  </div>
                  <Badge className="text-white/70">{row.status || "applied"}</Badge>
                </div>
                {row.notes ? <div className="mt-2 text-xs text-white/50 line-clamp-2">{row.notes}</div> : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

