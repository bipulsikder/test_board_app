import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const revalidate = 0

export default async function TalentProfilePage(props: { params: { slug: string } }) {
  const slug = props.params.slug

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select(
      "id,name,current_role,total_experience,location,summary,linkedin_profile,portfolio_url,github_profile,technical_skills,soft_skills,languages_known,certifications,projects,public_profile_enabled,public_profile_slug"
    )
    .eq("public_profile_slug", slug)
    .eq("public_profile_enabled", true)
    .maybeSingle()

  if (!candidate?.id) notFound()

  const { data: work } = await supabaseAdmin
    .from("work_experience")
    .select("id,company,role,duration,location,description,created_at")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })

  const { data: education } = await supabaseAdmin
    .from("education")
    .select("id,degree,specialization,institution,year,percentage,created_at")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })

  const skills: string[] = [
    ...((candidate.technical_skills as any[]) || []),
    ...((candidate.soft_skills as any[]) || [])
  ].filter((x) => typeof x === "string" && x.trim().length > 0)

  const certifications: string[] = Array.isArray((candidate as any).certifications)
    ? ((candidate as any).certifications as any[]).filter((x) => typeof x === "string" && x.trim())
    : []
  const projectsRaw: any[] = Array.isArray((candidate as any).projects) ? ((candidate as any).projects as any[]) : []
  const projects: { title: string; description?: string; link?: string }[] = projectsRaw
    .map((x) => {
      if (typeof x === "string") return { title: x.trim() }
      if (x && typeof x === "object") {
        const title = typeof x.title === "string" ? x.title.trim() : ""
        if (!title) return null
        return {
          title,
          description: typeof x.description === "string" ? x.description : undefined,
          link: typeof x.link === "string" ? x.link : undefined
        }
      }
      return null
    })
    .filter(Boolean) as any

  return (
    <div>
      <header className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/jobs" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10" />
            <div className="text-sm font-semibold">Truckinzy</div>
          </Link>
          <Link className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href="/jobs">
            View jobs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border bg-card p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{candidate.name}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{candidate.location}</span>
                <span>•</span>
                <span>{candidate.current_role}</span>
                <span>•</span>
                <span>{candidate.total_experience} experience</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {candidate.linkedin_profile ? (
                <a className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href={candidate.linkedin_profile} target="_blank">
                  LinkedIn
                </a>
              ) : null}
              {candidate.portfolio_url ? (
                <a className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href={candidate.portfolio_url} target="_blank">
                  Portfolio
                </a>
              ) : null}
              {candidate.github_profile ? (
                <a className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" href={candidate.github_profile} target="_blank">
                  GitHub
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">About</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {candidate.summary || "No summary provided."}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Work experience</div>
              <div className="mt-4 grid gap-4">
                {(work || []).length ? (
                  (work || []).map((w: any) => (
                    <div key={w.id} className="rounded-2xl border bg-background p-5">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">{w.role} • {w.company}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.duration || ""} {w.location ? `• ${w.location}` : ""}
                        </div>
                        {w.description ? <div className="mt-2 text-sm text-muted-foreground">{w.description}</div> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No work experience added yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Education</div>
              <div className="mt-4 grid gap-4">
                {(education || []).length ? (
                  (education || []).map((e: any) => (
                    <div key={e.id} className="rounded-2xl border bg-background p-5">
                      <div className="text-sm font-semibold">{e.degree} • {e.institution}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {e.specialization ? `${e.specialization} • ` : ""}{e.year || ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No education added yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Skills</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.length ? (
                  skills.slice(0, 30).map((s) => (
                    <span key={s} className="rounded-full border bg-accent px-3 py-1.5 text-xs">
                      {s}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No skills added yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Certifications</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {certifications.length ? (
                  certifications.slice(0, 40).map((c) => (
                    <span key={c} className="rounded-full border bg-background px-3 py-1.5 text-xs">
                      {c}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No certifications added yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Projects</div>
              <div className="mt-4 grid gap-2">
                {projects.length ? (
                  projects.slice(0, 20).map((p) => (
                    <div key={p.title} className="rounded-2xl border bg-background px-4 py-3">
                      <div className="text-sm font-semibold">{p.title}</div>
                      {p.description ? <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</div> : null}
                      {p.link ? (
                        <a className="mt-2 inline-block text-sm text-blue-600 hover:underline" href={p.link} target="_blank" rel="noopener noreferrer">
                          {p.link}
                        </a>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No projects added yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border bg-card p-6">
              <div className="text-sm font-semibold">Share</div>
              <div className="mt-2 text-sm text-muted-foreground">This profile is public.</div>
              <div className="mt-4 rounded-2xl border bg-background px-4 py-3 text-sm">
                /talent/{candidate.public_profile_slug}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
