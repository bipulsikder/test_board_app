"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Filters = { q: string; role: string; skills: string[]; location: string; jobType: string }

const ROLE_OPTIONS = [
  "Transportation",
  "Warehousing",
  "Fleet operations",
  "Dispatch",
  "Supply chain",
  "Last-mile",
  "Brokerage",
  "Safety & Compliance",
  "Customer support",
  "Other"
]

const SKILL_OPTIONS = [
  "TMS",
  "Dispatch",
  "Fleet ops",
  "Load planning",
  "Route optimization",
  "Warehouse ops",
  "Inventory",
  "Excel",
  "Customer support",
  "DOT compliance",
  "Safety",
  "Cold chain",
  "3PL",
  "Last-mile"
]

function buildQuery(filters: Filters) {
  const sp = new URLSearchParams()
  if (filters.q.trim()) sp.set("q", filters.q.trim())
  if (filters.role) sp.set("role", filters.role)
  if (filters.skills.length) sp.set("skills", filters.skills.join(","))
  if (filters.location.trim()) sp.set("location", filters.location.trim())
  if (filters.jobType) sp.set("jobType", filters.jobType)
  return sp.toString()
}

export function JobsFilters({ initial }: { initial: Filters }) {
  const router = useRouter()

  const [q, setQ] = useState(initial.q)
  const [roleOpen, setRoleOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [role, setRole] = useState(initial.role)
  const [skills, setSkills] = useState<string[]>(initial.skills)

  const skillsLabel = useMemo(() => {
    if (!skills.length) return "Skills"
    if (skills.length === 1) return skills[0]
    return `${skills[0]} +${skills.length - 1}`
  }, [skills])

  const apply = () => {
    const next = buildQuery({ ...initial, q, role, skills })
    router.push(next ? `/jobs?${next}` : "/jobs")
    setRoleOpen(false)
    setSkillsOpen(false)
  }

  const clear = () => {
    setQ("")
    setRole("")
    setSkills([])
    router.push("/jobs")
    setRoleOpen(false)
    setSkillsOpen(false)
  }

  const toggleSkill = (s: string) => {
    setSkills((prev) => {
      const set = new Set(prev)
      if (set.has(s)) set.delete(s)
      else set.add(s)
      return Array.from(set)
    })
  }

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs"
            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          />
        </div>

        <div className="relative md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setRoleOpen((v) => !v)
              setSkillsOpen(false)
            }}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-sm"
          >
            {role || "Role"}
          </button>

          {roleOpen ? (
            <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border bg-card p-4 shadow-xl">
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(role === r ? "" : r)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs",
                      role === r ? "bg-accent" : "bg-background hover:bg-accent"
                    ].join(" ")}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setRole("")}
                >
                  Clear
                </button>
                <button type="button" className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" onClick={apply}>
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative md:col-span-3">
          <button
            type="button"
            onClick={() => {
              setSkillsOpen((v) => !v)
              setRoleOpen(false)
            }}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-sm"
          >
            {skillsLabel}
          </button>

          {skillsOpen ? (
            <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border bg-card p-4 shadow-xl">
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs",
                      skills.includes(s) ? "bg-accent" : "bg-background hover:bg-accent"
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSkills([])}>
                  Clear
                </button>
                <button type="button" className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" onClick={apply}>
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-3 flex items-center justify-end gap-2">
          <button type="button" className="rounded-full border bg-background px-4 py-2 text-sm hover:bg-accent" onClick={clear}>
            Clear
          </button>
          <button type="button" className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-accent" onClick={apply}>
            Apply filters
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Role • Skills • Location • Commitment • Job type</div>
    </div>
  )
}

