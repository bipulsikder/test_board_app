"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, MapPin, Search } from "lucide-react"
import type { Job } from "@/lib/types"
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

function setParam(params: URLSearchParams, key: string, value: string) {
  if (!value) params.delete(key)
  else params.set(key, value)
}

export function JobsBoard({ jobs }: { jobs: Job[] }) {
  const router = useRouter()
  const search = useSearchParams()
  const q = search.get("q") || ""
  const dept = search.get("dept") || ""
  const loc = search.get("loc") || ""
  const type = search.get("type") || ""

  const [selectedId, setSelectedId] = useState<string>(() => jobs[0]?.id || "")

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) || jobs[0], [jobs, selectedId])

  const onFilter = (next: { q: string; dept: string; loc: string; type: string }) => {
    const params = new URLSearchParams(search.toString())
    setParam(params, "q", next.q.trim())
    setParam(params, "dept", next.dept.trim())
    setParam(params, "loc", next.loc.trim())
    setParam(params, "type", next.type)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-white">Jobs</h1>
          <p className="text-sm text-white/60">Apply once, then one-tap apply to any role.</p>
        </div>

        <Card>
          <CardBody className="pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={q}
                    onChange={(e) => onFilter({ q: e.target.value, dept, loc, type })}
                    placeholder="Search role, keywords"
                    className="pl-9"
                  />
                </div>
              </div>
              <Input value={dept} onChange={(e) => onFilter({ q, dept: e.target.value, loc, type })} placeholder="Industry" />
              <Input value={loc} onChange={(e) => onFilter({ q, dept, loc: e.target.value, type })} placeholder="Location" />
              <select
                value={type}
                onChange={(e) => onFilter({ q, dept, loc, type: e.target.value })}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">Any type</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="grid gap-3">
              {!jobs.length ? (
                <Card>
                  <CardBody className="py-10 text-center text-white/60">No open positions.</CardBody>
                </Card>
              ) : (
                jobs.map((job) => {
                  const active = job.id === selected?.id
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedId(job.id)}
                      className={[
                        "text-left",
                        "rounded-2xl border transition",
                        active ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      ].join(" ")}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{job.title}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {job.department ? <Badge>{job.department}</Badge> : null}
                              {job.type ? <Badge className="text-white/70">{job.type}</Badge> : null}
                            </div>
                          </div>
                          <ArrowRight className={active ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-white/30"} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{job.location || "Remote / flexible"}</span>
                        </div>
                        <div className="mt-3 line-clamp-2 text-sm text-white/60">{job.description || ""}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Job preview</CardTitle>
                  <CardDescription>Open details, then apply in a guided flow.</CardDescription>
                </CardHeader>
                <CardBody>
                  {!selected ? (
                    <div className="text-sm text-white/60">Select a job to preview.</div>
                  ) : (
                    <div className="grid gap-4">
                      <div>
                        <div className="text-lg font-semibold text-white">{selected.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selected.department ? <Badge>{selected.department}</Badge> : null}
                          {selected.type ? <Badge className="text-white/70">{selected.type}</Badge> : null}
                          {selected.industry ? <Badge className="text-white/70">{selected.industry}</Badge> : null}
                        </div>
                      </div>
                      <div className="text-sm text-white/60">{selected.description || ""}</div>
                      <div className="flex gap-2">
                        <Link href={`/jobs/${selected.id}`} className="flex-1">
                          <Button variant="secondary" className="w-full">View details</Button>
                        </Link>
                        <Link href={`/apply/${selected.id}`} className="flex-1">
                          <Button className="w-full">Apply</Button>
                        </Link>
                      </div>
                      <div className="text-xs text-white/40">You can return later to your dashboard to track status.</div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

