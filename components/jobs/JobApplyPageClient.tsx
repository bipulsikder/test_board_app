"use client"

import { useMemo, useRef } from "react"
import Link from "next/link"
import type { Job } from "@/lib/types"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { JobApplyForm } from "@/components/jobs/JobApplyForm"

type ClientLite = {
  name: string
  slug: string | null
  logo_url: string | null
  website?: string | null
  company_type?: string | null
  location?: string | null
  open_jobs_count?: number
}

export function JobApplyPageClient({ job, client }: { job: Job & { amount?: string | null; skills_required?: string[] | null; client_id?: string | null; client_name?: string | null }; client: ClientLite | null }) {
  const applyRef = useRef<HTMLDivElement | null>(null)
  const clientName = client?.name || job.client_name || "Client"

  const headerBadges = useMemo(() => {
    const items: string[] = []
    if (job.location) items.push(job.location)
    if (job.type) items.push(job.type)
    if ((job as any).amount) items.push((job as any).amount)
    if (job.salary_range) items.push(job.salary_range)
    if (job.industry) items.push(job.industry)
    return items
  }, [job])

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to jobs
        </Link>
        {client?.slug ? (
          <Link href={`/clients/${client.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            View {clientName}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-3xl border bg-card p-7">
            <div className="flex flex-wrap items-center gap-3">
              {client?.logo_url ? (
                <img alt={clientName} src={client.logo_url} className="h-10 w-10 rounded-2xl border bg-background object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-2xl border bg-background" />
              )}
              <div>
                {client?.slug ? (
                  <Link href={`/clients/${client.slug}`} className="text-sm font-medium hover:underline hover:underline-offset-4">
                    {clientName}
                  </Link>
                ) : (
                  <div className="text-sm font-medium">{clientName}</div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {headerBadges.map((b) => (
                    <Badge key={b}>{b}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <h1 className="mt-5 text-2xl font-semibold sm:text-3xl">{job.title}</h1>
            {job.created_at ? (
              <div className="mt-2 text-sm text-muted-foreground">Posted {new Date(job.created_at).toLocaleDateString()}</div>
            ) : null}
          </div>

          <div className="mt-7 grid gap-6">
            <section className="rounded-3xl border bg-card p-6">
              <h2 className="text-sm font-semibold">About the role</h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.description || ""}</div>
            </section>

            {(job as any).skills_required && Array.isArray((job as any).skills_required) && (job as any).skills_required.length ? (
              <section className="rounded-3xl border bg-card p-6">
                <h2 className="text-sm font-semibold">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {((job as any).skills_required as string[]).map((s) => (
                    <span key={s} className="rounded-full border bg-accent px-3 py-1.5 text-xs">{s}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {job.requirements && job.requirements.length > 0 ? (
              <section className="rounded-3xl border bg-card p-6">
                <h2 className="text-sm font-semibold">Requirements</h2>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/50" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div ref={applyRef} id="apply" className="scroll-mt-24 lg:hidden">
              <JobApplyForm job={job} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="hidden lg:block lg:sticky lg:top-24">
            <div className="grid gap-4">
              <div className="rounded-3xl border bg-card p-7">
                <JobApplyForm job={job} />
              </div>

              <div className="rounded-3xl border bg-card p-7">
                <div className="text-sm font-semibold">More about {clientName}</div>
                <div className="mt-4 flex items-center gap-3">
                  {client?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={clientName} src={client.logo_url} className="h-10 w-10 rounded-2xl border bg-background object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-2xl border bg-background" />
                  )}
                  {client?.slug ? (
                    <a href={`/clients/${client.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline hover:underline-offset-4">
                      {clientName}
                    </a>
                  ) : (
                    <div className="text-sm font-medium">{clientName}</div>
                  )}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  {client?.website ? (
                    <a className="hover:text-foreground hover:underline hover:underline-offset-4" href={client.website} target="_blank" rel="noopener noreferrer">
                      {client.website}
                    </a>
                  ) : null}
                  {client?.company_type ? <div>{client.company_type}</div> : null}
                  {client?.location ? <div>{client.location}</div> : null}
                  {typeof client?.open_jobs_count === "number" && client?.slug ? (
                    <a href={`/clients/${client.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline hover:underline-offset-4">
                      {client.open_jobs_count} open jobs
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/85 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{job.title}</div>
            <div className="truncate text-xs text-muted-foreground">{clientName}</div>
          </div>
          <Button onClick={() => applyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Apply</Button>
        </div>
      </div>
    </div>
  )
}
