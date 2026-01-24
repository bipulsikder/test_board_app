import Link from "next/link"
import type { Job } from "@/lib/types"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Clock, MapPin } from "lucide-react"

function isNew(createdAt: string | null) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  const diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

type ClientLite = { name: string; slug: string | null; logo_url: string | null }

export function JobCard({
  job,
  client,
  ctaLabel = "Apply",
  href
}: {
  job: Job
  client?: ClientLite | null
  ctaLabel?: string
  href?: string
}) {
  const tags: { label: string; className?: string }[] = []
  if (job.type) tags.push({ label: job.type })
  if (job.department) tags.push({ label: job.department })
  if (isNew(job.created_at)) tags.push({ label: "New", className: "bg-rose-50 text-rose-700 border-rose-200" })

  const clientName = client?.name || job.client_name || null
  const jobHref = href || `/jobs/${job.id}/apply`

  const skills = Array.isArray((job as any).skills_required) ? (((job as any).skills_required as any[]).filter((s) => typeof s === "string" && s.trim()) as string[]) : []
  const visibleSkills = skills.slice(0, 5)
  const hasMoreSkills = skills.length > 5

  const payLabel = (job as any).amount ? String((job as any).amount) : job.salary_range ? String(job.salary_range) : null

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[56px_1fr_auto] sm:items-start">
        <div className="hidden sm:block">
          {client?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={client?.slug ? `/clients/${client.slug}` : "#"} target="_blank" rel="noopener noreferrer">
              <img alt={clientName || "Client"} src={client.logo_url} className="h-14 w-14 rounded-2xl border bg-background object-cover" />
            </a>
          ) : (
            <div className="h-14 w-14 rounded-2xl border bg-background" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <Badge key={t.label} className={t.className || ""}>
                {t.label}
              </Badge>
            ))}
          </div>

          <div className="mt-3 grid gap-1">
            {clientName ? (
              client?.slug ? (
                <a
                  href={`/clients/${client.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  {clientName}
                </a>
              ) : (
                <div className="truncate text-sm text-muted-foreground">{clientName}</div>
              )
            ) : null}
            <Link href={jobHref} className="truncate text-xl font-semibold tracking-tight hover:underline hover:underline-offset-4">
              {job.title}
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location || "Remote / flexible"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Any time</span>
            </div>
          </div>

          {visibleSkills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleSkills.map((s) => (
                <span key={s} className="rounded-full border bg-accent px-3 py-1.5 text-xs">
                  {s}
                </span>
              ))}
              {hasMoreSkills ? (
                <Link href={jobHref} className="rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
                  +{skills.length - visibleSkills.length} more
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
          {payLabel ? <div className="text-sm font-semibold sm:text-base">{payLabel}</div> : <div />}
          <Link href={jobHref}>
            <Button size="sm">{ctaLabel}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
