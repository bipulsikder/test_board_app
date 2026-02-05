"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Candidate, Job } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { AuthStep } from "@/components/apply/AuthStep"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Briefcase, Building2, Filter, MapPin, Search, SlidersHorizontal } from "lucide-react"

type ClientLite = { id: string; name: string; slug: string | null; logo_url: string | null }

const LOCATION_PRESETS = [
  "Anywhere in India",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
  "Surat",
  "Indore",
  "Lucknow"
]

const SKILL_SUGGESTIONS = [
  "TMS",
  "WMS",
  "Route planning",
  "Load planning",
  "Fleet management",
  "Dispatching",
  "Inventory management",
  "Warehouse operations",
  "Excel",
  "GPS tracking",
  "Compliance",
  "Vendor management",
  "Cold chain"
]

function tagsToMap(tags: unknown) {
  const out: Record<string, string> = {}
  const arr = Array.isArray(tags) ? (tags as unknown[]) : []
  for (const t of arr) {
    if (typeof t !== "string") continue
    const [k, ...rest] = t.split(":")
    if (!k || rest.length === 0) continue
    out[k] = rest.join(":")
  }
  return out
}

function formatEnum(value: unknown) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeText(v: unknown) {
  return String(v || "").trim()
}

function buildSearchParams(input: Record<string, string>) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(input)) {
    const t = normalizeText(v)
    if (!t) continue
    next.set(k, t)
  }
  return next
}

function uniqStrings(list: unknown) {
  const arr = Array.isArray(list) ? list : []
  return Array.from(new Set(arr.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)))
}

function formatRelativeTime(dateString: string | null | undefined) {
  if (!dateString) return ""
  const d = new Date(dateString)
  const t = d.getTime()
  if (!Number.isFinite(t)) return ""

  const now = Date.now()
  const diffMs = now - t
  if (diffMs <= 0) return "just now"

  const diffMin = diffMs / 60000
  if (diffMin < 60) {
    const v = Math.max(1, Math.floor(diffMin))
    return `${v} min ago`
  }

  const diffH = diffMin / 60
  if (diffH < 24) {
    const v = Math.max(1, Math.floor(diffH))
    return `${v} hour${v === 1 ? "" : "s"} ago`
  }

  const diffD = diffH / 24
  if (diffD < 7) {
    const v = Math.max(1, Math.floor(diffD))
    return `${v} day${v === 1 ? "" : "s"} ago`
  }

  if (diffD < 30) {
    const v = Math.max(1, Math.floor(diffD / 7))
    return `${v} week${v === 1 ? "" : "s"} ago`
  }

  if (diffD < 365) {
    const v = Math.max(1, Math.floor(diffD / 30))
    return `${v} month${v === 1 ? "" : "s"} ago`
  }

  const v = Math.max(1, Math.floor(diffD / 365))
  return `${v} year${v === 1 ? "" : "s"} ago`
}

function formatSalary(job: Job) {
  const min = Number((job as any).salary_min || 0) || 0
  const max = Number((job as any).salary_max || 0) || 0
  if (!min && !max) return "Competitive"
  const f = (n: number) => `₹${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  const range = min && max ? `${f(min)} - ${f(max)}` : min ? f(min) : f(max)
  const suffix = (job as any).salary_type ? ` / ${formatEnum((job as any).salary_type)}` : ""
  return `${range}${suffix}`
}

export function JobsBoardClient({
  jobs = [],
  clientsById = {},
  embedded = false
}: {
  jobs?: Job[]
  clientsById?: Record<string, ClientLite>
  embedded?: boolean
}) {
  const profileRef = useRef<HTMLDivElement | null>(null)
  const { session, loading: sessionLoading } = useSupabaseSession()
  const accessToken = session?.access_token
  const googleAvatarUrl =
    (session as any)?.user?.user_metadata?.avatar_url && typeof (session as any).user.user_metadata.avatar_url === "string"
      ? String((session as any).user.user_metadata.avatar_url)
      : ""
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const restoredRef = useRef(false)

  const scrollKey = useMemo(() => {
    const next = new URLSearchParams(sp.toString())
    next.delete("createProfile")
    next.delete("login")
    next.delete("apply")
    return `jobsScroll:${pathname}?${next.toString()}`
  }, [pathname, sp])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = window.sessionStorage.getItem(scrollKey)
      if (!raw) return
      const y = Number(raw)
      if (!Number.isFinite(y)) return
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "instant" as any })
      })
    } catch {}
  }, [scrollKey])

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)

  const [resultsJobs, setResultsJobs] = useState<Job[]>(jobs)
  const [resultsClientsById, setResultsClientsById] = useState<Record<string, ClientLite>>(clientsById)
  const [resultsNextCursor, setResultsNextCursor] = useState<string | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsLoadingMore, setResultsLoadingMore] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [resultsUsedProfileFallback, setResultsUsedProfileFallback] = useState(false)
  const [resultsLoadedOnce, setResultsLoadedOnce] = useState(false)

  const [draftQ, setDraftQ] = useState("")
  const [draftExperience, setDraftExperience] = useState<string>("any")
  const [draftLocation, setDraftLocation] = useState<string>("")
  const [draftSkills, setDraftSkills] = useState<string[]>([])
  const [draftSkillInput, setDraftSkillInput] = useState("")

  const [draftEmploymentType, setDraftEmploymentType] = useState<string>("any")
  const [draftShiftType, setDraftShiftType] = useState<string>("any")
  const [draftDepartment, setDraftDepartment] = useState<string>("any")
  const [draftRoleCategory, setDraftRoleCategory] = useState<string>("any")
  const [draftSalaryMin, setDraftSalaryMin] = useState<string>("")
  const [draftSalaryMax, setDraftSalaryMax] = useState<string>("")
  const [draftSort, setDraftSort] = useState<string>("recent")

  const [appliedQ, setAppliedQ] = useState("")
  const [appliedExperience, setAppliedExperience] = useState<string>("any")
  const [appliedLocation, setAppliedLocation] = useState<string>("")
  const [appliedSkills, setAppliedSkills] = useState<string[]>([])
  const [appliedEmploymentType, setAppliedEmploymentType] = useState<string>("any")
  const [appliedShiftType, setAppliedShiftType] = useState<string>("any")
  const [appliedDepartment, setAppliedDepartment] = useState<string>("any")
  const [appliedRoleCategory, setAppliedRoleCategory] = useState<string>("any")
  const [appliedSalaryMin, setAppliedSalaryMin] = useState<string>("")
  const [appliedSalaryMax, setAppliedSalaryMax] = useState<string>("")
  const [appliedSort, setAppliedSort] = useState<string>("recent")

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [filterSections, setFilterSections] = useState<Record<string, boolean>>({
    experience: true,
    salary: true,
    work_type: false,
    work_shift: false,
    department: false,
    role: false
  })
  const [mobileFilterSection, setMobileFilterSection] = useState<
    "sort" | "salary" | "experience" | "work_type" | "work_shift" | "department" | "role" | "prefs"
  >("sort")

  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"create" | "login">("create")

  const [profileRoleFilterOn, setProfileRoleFilterOn] = useState(true)

  const [prefsBusy, setPrefsBusy] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  const [prefLocDraft, setPrefLocDraft] = useState("")
  const [prefLocFocused, setPrefLocFocused] = useState(false)

  useEffect(() => {
    const wantsCreate = sp.get("createProfile") === "1"
    const wantsLogin = sp.get("login") === "1"
    if (wantsCreate) {
      setAuthMode("create")
      setAuthOpen(true)
    }
    if (wantsLogin) {
      setAuthMode("login")
      setAuthOpen(true)
    }
  }, [sp])

  useEffect(() => {
    const q = normalizeText(sp.get("text") || sp.get("q") || "")
    const exp = normalizeText(sp.get("exp") || sp.get("min_experience") || "")
    const loc = normalizeText(sp.get("location_name") || sp.get("location") || "")
    const jobType = normalizeText(sp.get("jobType") || "")
    const shift = normalizeText(sp.get("shift") || "")
    const dept = normalizeText(sp.get("dept") || "")
    const roleCat = normalizeText(sp.get("role") || sp.get("roleCat") || "")
    const salMin = normalizeText(sp.get("salaryMin") || "")
    const salMax = normalizeText(sp.get("salaryMax") || "")
    const skillsRaw = normalizeText(sp.get("skills") || "")
    const sortRaw = normalizeText(sp.get("sort") || "")

    const resolvedExp = exp ? exp : "any"
    const resolvedLoc = loc === "Anywhere in India" ? "" : loc

    setAppliedQ(q)
    setAppliedExperience(resolvedExp)
    setAppliedLocation(resolvedLoc)
    setAppliedEmploymentType(jobType || "any")
    setAppliedShiftType(shift || "any")
    setAppliedDepartment(dept || "any")
    setAppliedRoleCategory(roleCat || "any")
    setAppliedSalaryMin(salMin)
    setAppliedSalaryMax(salMax)

    const skills = skillsRaw
      ? Array.from(new Set(skillsRaw.split(",").map((s) => s.trim()).filter(Boolean))).slice(0, 12)
      : []
    setAppliedSkills(skills)

    const defaultSort = session ? "relevant" : "recent"
    const nextSort = sortRaw === "relevant" || sortRaw === "recent" ? sortRaw : defaultSort
    setAppliedSort(nextSort)

    setDraftQ(q)
    setDraftExperience(resolvedExp)
    setDraftLocation(resolvedLoc)
    setDraftEmploymentType(jobType || "any")
    setDraftShiftType(shift || "any")
    setDraftDepartment(dept || "any")
    setDraftRoleCategory(roleCat || "any")
    setDraftSalaryMin(salMin)
    setDraftSalaryMax(salMax)
    setDraftSkills(skills)
    setDraftSort(nextSort)
  }, [session, sp])

  const roleCategoryOptions = useMemo(() => {
    const out = new Set<string>()
    for (const j of resultsJobs) {
      const v = String((j as any).role_category || "").trim()
      if (v) out.add(v)
    }
    return Array.from(out)
  }, [resultsJobs])

  useEffect(() => {
    if (!accessToken) {
      setCandidate(null)
      return
    }
    setCandidateLoading(true)
    fetch("/api/candidate/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!r.ok) return null
        return (data?.candidate || null) as Candidate | null
      })
      .then((c) => setCandidate(c))
      .finally(() => setCandidateLoading(false))
  }, [accessToken])

  useEffect(() => {
    const v = typeof candidate?.preferred_location === "string" ? candidate.preferred_location.trim() : ""
    setPrefLocDraft(v)
  }, [candidate?.preferred_location])

  useEffect(() => {
    const uid = (session as any)?.user?.id ? String((session as any).user.id) : ""
    if (!uid) return
    try {
      const raw = window.localStorage.getItem(`jobsProfileRoleFilterOff:${uid}`)
      if (raw) setProfileRoleFilterOn(false)
    } catch {}
  }, [session])

  const enableProfileRoleFilter = () => {
    const uid = (session as any)?.user?.id ? String((session as any).user.id) : ""
    setProfileRoleFilterOn(true)
    if (!uid) return
    try {
      window.localStorage.removeItem(`jobsProfileRoleFilterOff:${uid}`)
    } catch {}
  }

  const fetchJobsPage = async (opts: { append: boolean; cursor: string | null }) => {
    if (opts.append) setResultsLoadingMore(true)
    else setResultsLoading(true)
    setResultsError(null)
    try {
      const qp = new URLSearchParams()
      if (appliedQ.trim()) qp.set("text", appliedQ.trim())
      if (appliedLocation.trim()) qp.set("location_name", appliedLocation.trim())
      if (appliedSkills.length) qp.set("skills", appliedSkills.join(","))
      if (appliedEmploymentType !== "any") qp.set("jobType", appliedEmploymentType)
      if (appliedShiftType !== "any") qp.set("shift", appliedShiftType)
      if (appliedDepartment !== "any") qp.set("dept", appliedDepartment)
      if (appliedRoleCategory !== "any") qp.set("role", appliedRoleCategory)
      if (appliedExperience !== "any") qp.set("exp", appliedExperience)
      if (appliedSalaryMin) qp.set("salaryMin", appliedSalaryMin)
      if (appliedSalaryMax) qp.set("salaryMax", appliedSalaryMax)
      if (appliedSort) qp.set("sort", appliedSort)

      const profileRoleTerms = Array.from(
        new Set([
          ...uniqStrings((candidate as any)?.preferred_roles),
          ...(typeof candidate?.desired_role === "string" && candidate.desired_role.trim() ? [candidate.desired_role.trim()] : [])
        ])
      ).slice(0, 12)

      if (session && profileRoleFilterOn && profileRoleTerms.length) {
        qp.set("profileRoleFilter", "1")
        qp.set("role_terms", profileRoleTerms.join(","))
      }

      qp.set("limit", "30")
      if (opts.cursor) qp.set("cursor", opts.cursor)

      const res = await fetch(`/api/public/jobs/search?${qp.toString()}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to load jobs")

      const pageJobs = Array.isArray(data?.jobs) ? (data.jobs as Job[]) : ([] as Job[])
      const pageClients = data?.clientsById && typeof data.clientsById === "object" ? (data.clientsById as Record<string, ClientLite>) : {}

      setResultsClientsById((prev) => (opts.append ? { ...prev, ...pageClients } : pageClients))
      setResultsJobs((prev) => (opts.append ? [...prev, ...pageJobs] : pageJobs))
      setResultsNextCursor(typeof data?.nextCursor === "string" ? data.nextCursor : null)
      setResultsUsedProfileFallback(Boolean(data?.usedProfileFallback))
      setResultsLoadedOnce(true)
    } catch (e: any) {
      setResultsError(e?.message || "Failed to load jobs")
      if (!opts.append) {
        setResultsJobs([])
        setResultsClientsById({})
        setResultsNextCursor(null)
      }
    } finally {
      if (opts.append) setResultsLoadingMore(false)
      else setResultsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobsPage({ append: false, cursor: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedQ,
    appliedLocation,
    appliedSkills.join(","),
    appliedEmploymentType,
    appliedShiftType,
    appliedDepartment,
    appliedRoleCategory,
    appliedExperience,
    appliedSalaryMin,
    appliedSalaryMax,
    appliedSort,
    session,
    profileRoleFilterOn,
    candidate?.desired_role || "",
    Array.isArray((candidate as any)?.preferred_roles) ? String(((candidate as any).preferred_roles as unknown[]).join(",")) : "",
    candidate?.updated_at || ""
  ])

  const loadMore = () => {
    if (!resultsNextCursor || resultsLoadingMore) return
    fetchJobsPage({ append: true, cursor: resultsNextCursor })
  }

  const disableProfileRoleFilter = () => {
    const uid = (session as any)?.user?.id ? String((session as any).user.id) : ""
    setProfileRoleFilterOn(false)
    if (!uid) return
    try {
      window.localStorage.setItem(`jobsProfileRoleFilterOff:${uid}`, "1")
    } catch {}
  }

  const explicitPreferredRoles = useMemo(() => {
    return uniqStrings((candidate as any)?.preferred_roles).slice(0, 12)
  }, [candidate])

  const desiredRole = useMemo(() => {
    const desired = typeof candidate?.desired_role === "string" ? candidate.desired_role.trim() : ""
    return desired || ""
  }, [candidate])

  const roleBoostTerms = useMemo(() => {
    return Array.from(new Set([...(explicitPreferredRoles || []), ...(desiredRole ? [desiredRole] : [])])).slice(0, 12)
  }, [desiredRole, explicitPreferredRoles])

  const preferredJobTypes = useMemo(() => {
    return uniqStrings((candidate as any)?.open_job_types)
  }, [candidate])

  const candidateAvatarUrl = useMemo(() => {
    const map = tagsToMap(candidate?.tags)
    return typeof map.avatar_url === "string" ? map.avatar_url : ""
  }, [candidate?.tags])

  const preferredLocation = useMemo(() => {
    const v = typeof candidate?.preferred_location === "string" ? candidate.preferred_location.trim() : ""
    return v || ""
  }, [candidate])

  const suggestedSkills = useMemo(() => {
    const fromProfile = uniqStrings((candidate as any)?.technical_skills)
    return Array.from(new Set([...fromProfile, ...SKILL_SUGGESTIONS])).slice(0, 30)
  }, [candidate])

  const skillTypeahead = useMemo(() => {
    const q = draftSkillInput.trim().toLowerCase()
    if (!q) return [] as string[]
    const taken = new Set(draftSkills.map((s) => s.toLowerCase()))
    return suggestedSkills
      .filter((x) => x.toLowerCase().includes(q) && !taken.has(x.toLowerCase()))
      .slice(0, 10)
  }, [draftSkillInput, draftSkills, suggestedSkills])

  const locationTypeahead = useMemo(() => {
    const q = draftLocation.trim().toLowerCase()
    if (!q) return [] as string[]
    return LOCATION_PRESETS.filter((x) => x.toLowerCase().includes(q)).slice(0, 10)
  }, [draftLocation])

  const prefLocationTypeahead = useMemo(() => {
    const q = prefLocDraft.trim().toLowerCase()
    if (!q) return [] as string[]
    return LOCATION_PRESETS.filter((x) => x.toLowerCase().includes(q)).slice(0, 10)
  }, [prefLocDraft])

  const addDraftSkill = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    setDraftSkills((prev) => Array.from(new Set([...prev, t])).slice(0, 12))
    setDraftSkillInput("")
  }

  const removeDraftSkill = (skill: string) => {
    setDraftSkills((prev) => prev.filter((s) => s !== skill))
  }

  const locationPlaceholder = useMemo(() => {
    if (preferredLocation && preferredLocation !== "Anywhere in India") return preferredLocation
    return "Anywhere in India"
  }, [preferredLocation])

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleModalBusy, setRoleModalBusy] = useState(false)
  const [roleModalError, setRoleModalError] = useState<string | null>(null)
  const [roleModalQuery, setRoleModalQuery] = useState("")
  const [roleModalSelected, setRoleModalSelected] = useState<string[]>([])
  const [roleModalSuggestions, setRoleModalSuggestions] = useState<string[]>([])

  const [skillFocused, setSkillFocused] = useState(false)
  const [locationFocused, setLocationFocused] = useState(false)

  const openRoleModal = async () => {
    if (!session || !accessToken) return
    setRoleModalError(null)
    setRoleModalOpen(true)
    setRoleModalSelected(uniqStrings((candidate as any)?.preferred_roles))
    setRoleModalSuggestions([])
    setRoleModalBusy(true)
    try {
      const res = await fetch("/api/candidate/preferences/suggest", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to load suggestions")
      const list = Array.isArray(data?.suggested_roles)
        ? (data.suggested_roles as unknown[]).filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)
        : []
      setRoleModalSuggestions(Array.from(new Set(list)).slice(0, 24))
    } catch (e: any) {
      setRoleModalError(e?.message || "Failed to load suggestions")
      setRoleModalSuggestions([])
    } finally {
      setRoleModalBusy(false)
    }
  }

  const closeRoleModal = () => {
    setRoleModalOpen(false)
    setRoleModalQuery("")
    setRoleModalError(null)
  }

  const openAuth = (mode: "create" | "login") => {
    setAuthMode(mode)
    setAuthOpen(true)
    const next = new URLSearchParams(sp.toString())
    next.delete("createProfile")
    next.delete("login")
    next.set(mode === "create" ? "createProfile" : "login", "1")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const closeAuth = () => {
    setAuthOpen(false)
    const next = new URLSearchParams(sp.toString())
    next.delete("createProfile")
    next.delete("login")
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setCandidate(null)
  }

  const updateCandidate = async (patch: Partial<Candidate>) => {
    if (!accessToken) return
    setPrefsBusy(true)
    setPrefsError(null)
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(patch)
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      setCandidate((data?.candidate || null) as Candidate | null)
    } catch (e: any) {
      setPrefsError(e.message || "Failed to update")
    } finally {
      setPrefsBusy(false)
    }
  }

  const applyRoleModal = async () => {
    const next = Array.from(new Set(roleModalSelected.map((x) => x.trim()).filter(Boolean))).slice(0, 12)
    await updateCandidate({ preferred_roles: next } as any)
    closeRoleModal()
  }

  const toggleJobType = async (t: string) => {
    const cur = uniqStrings((candidate as any)?.open_job_types)
    const set = new Set(cur)
    if (set.has(t)) set.delete(t)
    else set.add(t)
    await updateCandidate({ open_job_types: Array.from(set) } as any)
  }

  const applySearch = () => {
    const next = buildSearchParams({
      text: draftQ,
      location_name: draftLocation,
      skills: draftSkills.length ? draftSkills.join(",") : "",
      jobType: draftEmploymentType !== "any" ? draftEmploymentType : "",
      shift: draftShiftType !== "any" ? draftShiftType : "",
      dept: draftDepartment !== "any" ? draftDepartment : "",
      exp: draftExperience !== "any" ? draftExperience : "",
      role: draftRoleCategory !== "any" ? draftRoleCategory : "",
      salaryMin: draftSalaryMin,
      salaryMax: draftSalaryMax,
      sort: draftSort,
    })
    if (next.toString()) next.set("search", "true")
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setFiltersOpen(false)
  }

  const applySort = (nextSort: string) => {
    setDraftSort(nextSort)
    const next = buildSearchParams({
      text: draftQ,
      location_name: draftLocation,
      skills: draftSkills.length ? draftSkills.join(",") : "",
      jobType: draftEmploymentType !== "any" ? draftEmploymentType : "",
      shift: draftShiftType !== "any" ? draftShiftType : "",
      dept: draftDepartment !== "any" ? draftDepartment : "",
      exp: draftExperience !== "any" ? draftExperience : "",
      role: draftRoleCategory !== "any" ? draftRoleCategory : "",
      salaryMin: draftSalaryMin,
      salaryMax: draftSalaryMax,
      sort: nextSort,
    })
    if (next.toString()) next.set("search", "true")
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const clearAll = () => {
    setDraftQ("")
    setDraftExperience("any")
    setDraftLocation("")
    setDraftSkills([])
    setDraftSkillInput("")
    setDraftEmploymentType("any")
    setDraftShiftType("any")
    setDraftDepartment("any")
    setDraftRoleCategory("any")
    setDraftSalaryMin("")
    setDraftSalaryMax("")
    setDraftSort(session ? "relevant" : "recent")
    router.push(pathname)
    setFiltersOpen(false)
  }

  const draftHasMeaningfulSearch = Boolean(
    draftQ.trim() ||
      draftLocation.trim() ||
      draftSkills.length ||
      draftExperience !== "any" ||
      draftEmploymentType !== "any" ||
      draftShiftType !== "any" ||
      draftDepartment !== "any" ||
      draftRoleCategory !== "any" ||
      Boolean(draftSalaryMin) ||
      Boolean(draftSalaryMax)
  )

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string }> = []
    if (appliedQ.trim()) chips.push({ key: "text", label: "Search", value: appliedQ.trim() })
    if (appliedExperience !== "any") chips.push({ key: "exp", label: "Experience", value: appliedExperience })
    if (appliedLocation.trim()) chips.push({ key: "location_name", label: "Location", value: appliedLocation.trim() })
    if (appliedSkills.length) chips.push({ key: "skills", label: "Skills", value: appliedSkills.join(", ") })
    if (appliedEmploymentType !== "any") chips.push({ key: "jobType", label: "Job type", value: formatEnum(appliedEmploymentType) })
    if (appliedShiftType !== "any") chips.push({ key: "shift", label: "Shift", value: formatEnum(appliedShiftType) })
    if (appliedDepartment !== "any") chips.push({ key: "dept", label: "Department", value: formatEnum(appliedDepartment) })
    if (appliedRoleCategory !== "any") chips.push({ key: "role", label: "Role", value: formatEnum(appliedRoleCategory) })
    if (appliedSalaryMin || appliedSalaryMax) {
      const lo = appliedSalaryMin ? `₹${appliedSalaryMin}` : "0"
      const hi = appliedSalaryMax ? `₹${appliedSalaryMax}` : "Any"
      chips.push({ key: "salary", label: "Salary", value: `${lo} - ${hi}` })
    }
    if (appliedSort && ((session && appliedSort !== "relevant") || (!session && appliedSort !== "recent"))) {
      chips.push({ key: "sort", label: "Sort", value: appliedSort === "relevant" ? "Relevant" : "Most recent" })
    }
    return chips
  }, [appliedDepartment, appliedEmploymentType, appliedExperience, appliedLocation, appliedQ, appliedRoleCategory, appliedSalaryMax, appliedSalaryMin, appliedShiftType, appliedSkills, appliedSort, session])

  const removeChip = (key: string) => {
    const next = new URLSearchParams(sp.toString())
    if (key === "text") {
      next.delete("text")
      next.delete("q")
    } else if (key === "salary") {
      next.delete("salaryMin")
      next.delete("salaryMax")
    } else if (key === "skills") {
      next.delete("skills")
    } else {
      next.delete(key)
    }
    next.delete("search")
    if (
      next.get("text") ||
      next.get("q") ||
      next.get("exp") ||
      next.get("min_experience") ||
      next.get("location_name") ||
      next.get("location") ||
      next.get("skills") ||
      next.get("jobType") ||
      next.get("shift") ||
      next.get("dept") ||
      next.get("role") ||
      next.get("roleCat") ||
      next.get("salaryMin") ||
      next.get("salaryMax") ||
      next.get("sort")
    ) {
      next.set("search", "true")
    }
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const toggleFilterSection = (id: string) => {
    setFilterSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const FiltersPanel = (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          <span className="text-muted-foreground">({activeChips.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            className="rounded-lg border bg-background px-2 py-1 text-xs text-muted-foreground"
          >
            {filtersCollapsed ? "Show" : "Hide"}
          </button>
          <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-700">
            Clear all
          </button>
        </div>
      </div>

      {activeChips.length ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.slice(0, 6).map((c) => (
            <button
              key={`f:${c.key}:${c.value}`}
              type="button"
              onClick={() => removeChip(c.key)}
              className="inline-flex items-center gap-2 rounded-full border bg-blue-50 px-3 py-1.5 text-xs text-blue-800"
            >
              <span className="max-w-[170px] truncate">{c.value}</span>
              <span>×</span>
            </button>
          ))}
          {activeChips.length > 6 ? <span className="text-xs text-muted-foreground">+{activeChips.length - 6} more</span> : null}
        </div>
      ) : null}

      {filtersCollapsed ? (
        <div className="grid gap-2">
          <Button className="rounded-xl" onClick={applySearch}>
            Apply
          </Button>
        </div>
      ) : (
      <div className="grid gap-2">
        {[{ id: "experience", label: "Experience" },
          { id: "salary", label: "Salary" },
          { id: "work_type", label: "Work type" },
          { id: "work_shift", label: "Work shift" },
          { id: "department", label: "Department" },
          { id: "role", label: "Role" }
        ].map((sec) => (
          <div key={sec.id} className="overflow-hidden rounded-2xl border bg-background">
            <button
              type="button"
              onClick={() => toggleFilterSection(sec.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
            >
              <span>{sec.label}</span>
              <span className="text-muted-foreground">{filterSections[sec.id] ? "˄" : "˅"}</span>
            </button>

            {filterSections[sec.id] ? (
              <div className="border-t px-4 py-4">
                {sec.id === "experience" ? (
                    <select
                      value={draftExperience}
                      onChange={(e) => setDraftExperience(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="any">All</option>
                      <option value="fresher">Fresher</option>
                      <option value="1_2">1-2 years</option>
                      <option value="3_5">3-5 years</option>
                      <option value="5_plus">5+ years</option>
                    </select>
                  ) : null}

                  {sec.id === "salary" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={draftSalaryMin}
                        onChange={(e) => setDraftSalaryMin(e.target.value)}
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Min</option>
                        <option value="10000">₹10k</option>
                        <option value="20000">₹20k</option>
                        <option value="30000">₹30k</option>
                        <option value="40000">₹40k</option>
                        <option value="50000">₹50k</option>
                        <option value="70000">₹70k</option>
                        <option value="100000">₹1L</option>
                      </select>
                      <select
                        value={draftSalaryMax}
                        onChange={(e) => setDraftSalaryMax(e.target.value)}
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Max</option>
                        <option value="20000">₹20k</option>
                        <option value="30000">₹30k</option>
                        <option value="40000">₹40k</option>
                        <option value="50000">₹50k</option>
                        <option value="70000">₹70k</option>
                        <option value="100000">₹1L</option>
                        <option value="150000">₹1.5L</option>
                      </select>
                    </div>
                  ) : null}

                  {sec.id === "work_type" ? (
                    <select
                      value={draftEmploymentType}
                      onChange={(e) => setDraftEmploymentType(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="any">All</option>
                      <option value="full_time">Full time</option>
                      <option value="part_time">Part time</option>
                      <option value="contract">Contract</option>
                    </select>
                  ) : null}

                  {sec.id === "work_shift" ? (
                    <select
                      value={draftShiftType}
                      onChange={(e) => setDraftShiftType(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="any">All</option>
                      <option value="day">Day</option>
                      <option value="night">Night</option>
                      <option value="rotational">Rotational</option>
                    </select>
                  ) : null}

                  {sec.id === "department" ? (
                    <select
                      value={draftDepartment}
                      onChange={(e) => setDraftDepartment(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="any">All</option>
                      <option value="operations">Operations</option>
                      <option value="fleet">Fleet</option>
                      <option value="dispatch">Dispatch</option>
                      <option value="warehouse">Warehouse</option>
                    </select>
                  ) : null}

                  {sec.id === "role" ? (
                    <select
                      value={draftRoleCategory}
                      onChange={(e) => setDraftRoleCategory(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="any">All</option>
                      {roleCategoryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatEnum(opt)}
                        </option>
                      ))}
                    </select>
                  ) : null}
              </div>
            ) : null}
          </div>
        ))}

        <Button className="rounded-xl" onClick={applySearch}>
          Apply
        </Button>
      </div>
      )}
    </div>
  )

  const MobileFiltersPanel = (
    <div className="md:hidden">
      <div className="relative overflow-hidden rounded-3xl border bg-card">
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex h-[70vh]">
          <div className="w-[150px] shrink-0 border-r bg-accent/60 p-2">
            {(
              [
                { id: "sort", label: "Sort by" },
                { id: "salary", label: "Salary" },
                { id: "experience", label: "Experience" },
                { id: "work_type", label: "Work type" },
                { id: "work_shift", label: "Work shift" },
                { id: "department", label: "Department" },
                { id: "role", label: "Role" },
                { id: "prefs", label: "Preferences" }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMobileFilterSection(item.id)}
                className={[
                  "relative w-full rounded-xl px-3 py-3 text-left text-sm",
                  mobileFilterSection === item.id ? "bg-background font-semibold" : "text-muted-foreground"
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute left-0 top-0 h-full w-1 rounded-r-full",
                    mobileFilterSection === item.id ? "bg-emerald-600" : "bg-transparent"
                  ].join(" ")}
                />
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {mobileFilterSection === "sort" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Sort by</div>
                {[...(session ? ([{ id: "relevant", label: "Relevant" }] as const) : []),
                  { id: "recent", label: "Date posted - New to Old" } as const
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftSort(opt.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm"
                  >
                    <span
                      className={[
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        draftSort === opt.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
                      ].join(" ")}
                    >
                      {draftSort === opt.id ? "✓" : ""}
                    </span>
                    <span className={draftSort === opt.id ? "font-semibold" : "text-muted-foreground"}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {mobileFilterSection === "salary" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Salary range (monthly)</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={draftSalaryMin}
                    onChange={(e) => setDraftSalaryMin(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-card px-3 text-sm"
                  >
                    <option value="">Min</option>
                    <option value="10000">₹10k</option>
                    <option value="20000">₹20k</option>
                    <option value="30000">₹30k</option>
                    <option value="40000">₹40k</option>
                    <option value="50000">₹50k</option>
                    <option value="70000">₹70k</option>
                    <option value="100000">₹1L</option>
                  </select>
                  <select
                    value={draftSalaryMax}
                    onChange={(e) => setDraftSalaryMax(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-card px-3 text-sm"
                  >
                    <option value="">Max</option>
                    <option value="20000">₹20k</option>
                    <option value="30000">₹30k</option>
                    <option value="40000">₹40k</option>
                    <option value="50000">₹50k</option>
                    <option value="70000">₹70k</option>
                    <option value="100000">₹1L</option>
                    <option value="150000">₹1.5L</option>
                  </select>
                </div>
              </div>
            ) : null}

            {mobileFilterSection === "experience" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Experience</div>
                {["any", "fresher", "1_2", "3_5", "5_plus"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDraftExperience(v)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm"
                  >
                    <span
                      className={[
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        draftExperience === v ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
                      ].join(" ")}
                    >
                      {draftExperience === v ? "✓" : ""}
                    </span>
                    <span className={draftExperience === v ? "font-semibold" : "text-muted-foreground"}>
                      {v === "any" ? "Any" : v === "fresher" ? "Fresher" : v === "1_2" ? "1-2 years" : v === "3_5" ? "3-5 years" : "5+ years"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {mobileFilterSection === "work_type" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Work type</div>
                {[
                  { id: "any", label: "Any" },
                  { id: "full_time", label: "Full time" },
                  { id: "part_time", label: "Part time" },
                  { id: "contract", label: "Contract" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftEmploymentType(opt.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm"
                  >
                    <span
                      className={[
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        draftEmploymentType === opt.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
                      ].join(" ")}
                    >
                      {draftEmploymentType === opt.id ? "✓" : ""}
                    </span>
                    <span className={draftEmploymentType === opt.id ? "font-semibold" : "text-muted-foreground"}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {mobileFilterSection === "work_shift" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Work shift</div>
                {[
                  { id: "any", label: "Any" },
                  { id: "day", label: "Day" },
                  { id: "night", label: "Night" },
                  { id: "rotational", label: "Rotational" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftShiftType(opt.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm"
                  >
                    <span
                      className={[
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        draftShiftType === opt.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
                      ].join(" ")}
                    >
                      {draftShiftType === opt.id ? "✓" : ""}
                    </span>
                    <span className={draftShiftType === opt.id ? "font-semibold" : "text-muted-foreground"}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {mobileFilterSection === "department" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Department</div>
                {[
                  { id: "any", label: "Any" },
                  { id: "operations", label: "Operations" },
                  { id: "fleet", label: "Fleet" },
                  { id: "dispatch", label: "Dispatch" },
                  { id: "warehouse", label: "Warehouse" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftDepartment(opt.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm"
                  >
                    <span
                      className={[
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        draftDepartment === opt.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
                      ].join(" ")}
                    >
                      {draftDepartment === opt.id ? "✓" : ""}
                    </span>
                    <span className={draftDepartment === opt.id ? "font-semibold" : "text-muted-foreground"}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {mobileFilterSection === "role" ? (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Role category</div>
                <select
                  value={draftRoleCategory}
                  onChange={(e) => setDraftRoleCategory(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value="any">Any</option>
                  {roleCategoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatEnum(opt)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {mobileFilterSection === "prefs" ? (
              <div className="grid gap-4">
                <div className="text-sm font-semibold">Preferences</div>

                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Preferred title/role</div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!session || prefsBusy) return
                        openRoleModal()
                      }}
                      className="text-sm font-semibold text-emerald-700"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(explicitPreferredRoles.length ? explicitPreferredRoles : desiredRole ? [desiredRole] : []).slice(0, 6).map((r) => (
                      <span key={r} className="rounded-full border bg-white px-3 py-1.5 text-xs">
                        {r}
                      </span>
                    ))}
                    {!explicitPreferredRoles.length && !desiredRole ? (
                      <div className="text-sm text-muted-foreground">Add roles to filter jobs based on your profile</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Preferred location</div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!session || prefsBusy) return
                        await updateCandidate({ preferred_location: prefLocDraft.trim() } as any)
                        setPrefLocFocused(false)
                      }}
                      className="text-sm font-semibold text-emerald-700"
                    >
                      Save
                    </button>
                  </div>
                  <div className="relative mt-3">
                    <Input
                      value={prefLocDraft}
                      onChange={(e) => setPrefLocDraft(e.target.value)}
                      onFocus={() => setPrefLocFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setPrefLocFocused(false), 120)
                      }}
                      placeholder="e.g. Delhi NCR"
                    />
                    {prefLocFocused && prefLocDraft.trim() && prefLocationTypeahead.length ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-white shadow-lg">
                        {prefLocationTypeahead.map((opt) => (
                          <button
                            key={`prefLoc:${opt}`}
                            type="button"
                            onClick={() => setPrefLocDraft(opt)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent"
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{opt}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Used as a suggestion; it won’t hide jobs unless you filter by location.</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {activeChips.length ? (
          <div className="border-t bg-emerald-50 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {activeChips.map((c) => (
                <div key={`${c.key}:${c.value}`} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-800">
                  <span className="max-w-[200px] truncate">{c.value}</span>
                  <span className="text-emerald-800">×</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-4">
          <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-700">
            Clear Filters
          </button>
          <button type="button" onClick={applySearch} className="h-12 rounded-2xl bg-emerald-700 px-8 text-sm font-semibold text-white">
            Apply
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#F6F7FB]"}>
      {embedded ? null : (
        <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
          <div className="flex h-16 w-full items-center justify-between px-4">
            <Link href="/jobs" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Truckinzy Jobs</div>
                <div className="text-xs text-muted-foreground truncate">Logistics • Transport • Supply Chain</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <Link href="/dashboard/jobs">
                    <Button variant="secondary" size="sm">Dashboard</Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => openAuth("login")}>Log in</Button>
                  <Button size="sm" onClick={() => openAuth("create")}>Create profile</Button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={(embedded ? "w-full" : "w-full px-4 py-6") + " overflow-x-hidden"}>
        <div className={embedded ? "w-full" : "mx-auto w-full max-w-[1500px]"}>
        <Card className="shadow-sm bg-[#F3F0FF] border-0">
          <CardBody className="pt-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px_240px_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="Search by role, company, skill or department"
                  className="pl-9 h-12 rounded-full bg-white shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch()
                  }}
                />
              </div>

              <div className="grid gap-2">
                <div className="relative">
                  <div className="h-12 rounded-full border border-input bg-white px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
                    <div className="flex flex-wrap items-center gap-2">
                    {draftSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => removeDraftSkill(s)}
                        className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs"
                      >
                        <span className="max-w-[140px] truncate">{s}</span>
                        <span className="text-muted-foreground">×</span>
                      </button>
                    ))}
                    <input
                      value={draftSkillInput}
                      onChange={(e) => setDraftSkillInput(e.target.value)}
                      onFocus={() => setSkillFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setSkillFocused(false), 120)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addDraftSkill(draftSkillInput)
                        }
                      }}
                      placeholder={draftSkills.length ? "Add skill" : "Skills (optional)"}
                      className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    </div>
                  </div>

                  {skillFocused && draftSkillInput.trim() && skillTypeahead.length ? (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-white shadow-lg">
                      {skillTypeahead.map((opt) => (
                        <button
                          key={`skillopt:${opt}`}
                          type="button"
                          onClick={() => addDraftSkill(opt)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent"
                        >
                          <span className="truncate">{opt}</span>
                          <span className="text-xs text-muted-foreground">Add</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                <Input
                  value={draftLocation}
                  onChange={(e) => setDraftLocation(e.target.value)}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setLocationFocused(false), 120)
                  }}
                  placeholder={locationPlaceholder}
                  className="h-12 rounded-full bg-white shadow-sm"
                />

                {locationFocused && draftLocation.trim() && locationTypeahead.length ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-white shadow-lg">
                    {locationTypeahead.map((opt) => (
                      <button
                        key={`locopt:${opt}`}
                        type="button"
                        onClick={() => setDraftLocation(opt)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button
                size="lg"
                variant={draftHasMeaningfulSearch ? "primary" : "secondary"}
                className="rounded-full h-12"
                onClick={applySearch}
              >
                Search jobs
              </Button>
            </div>

          </CardBody>
        </Card>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm sm:text-base font-semibold">Showing {resultsJobs.length} jobs</div>
          <div className="flex items-center gap-2">
            {!session ? (
              <select
                value={draftSort}
                onChange={(e) => applySort(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="recent">Most recent</option>
                
              </select>
            ) : null}
            <div className="lg:hidden">
              <Button variant="secondary" size="sm" onClick={() => setFiltersOpen(true)} className="gap-2 rounded-xl">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
            {activeChips.length ? (
              <Button variant="secondary" size="sm" className="rounded-xl" onClick={clearAll}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>

        {activeChips.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <button
                key={`${c.key}:${c.value}`}
                type="button"
                onClick={() => removeChip(c.key)}
                className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <span className="text-muted-foreground">{c.label}:</span>
                <span className="max-w-[220px] truncate">{c.value}</span>
                <span className="text-muted-foreground">×</span>
              </button>
            ))}
          </div>
        ) : null}

        <div
          className={
            "mt-4 grid min-w-0 grid-cols-1 gap-6 items-start " +
            (session
              ? "lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(240px,320px)]"
              : "lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]")
          }
        >
          <div className="hidden lg:block w-full">
            <div className="sticky top-24">
              <Card>
                <CardBody className="pt-6">{FiltersPanel}</CardBody>
              </Card>
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            {!session ? (
              <Card className="border-dashed">
                <CardBody className="pt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-base font-semibold">Know more about latest logistics jobs</div>
                      <div className="mt-1 text-sm text-muted-foreground">Create a profile to get a tailored feed and easy apply.</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="rounded-xl" onClick={() => openAuth("login")}>
                        Log in
                      </Button>
                      <Button className="rounded-xl" onClick={() => openAuth("create")}>
                        Create profile
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}
            {resultsError ? (
              <Card>
                <CardBody className="pt-6">
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold">Couldn’t load jobs</div>
                    <div className="text-sm text-muted-foreground">{resultsError}</div>
                    <div>
                      <Button variant="secondary" className="rounded-xl" onClick={() => fetchJobsPage({ append: false, cursor: null })}>
                        Retry
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {resultsLoading && !resultsLoadedOnce ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardBody className="pt-6">
                      <div className="grid gap-4 sm:grid-cols-[64px_1fr_auto] sm:items-start">
                        <div className="h-16 w-16 rounded-2xl bg-muted animate-pulse" />
                        <div className="grid gap-3">
                          <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                          <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
                          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                            <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                          </div>
                        </div>
                        <div className="h-9 w-24 rounded-xl bg-muted animate-pulse" />
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : !resultsJobs.length ? (
              <Card>
                <CardBody className="py-10 text-center text-muted-foreground">No jobs match your filters.</CardBody>
              </Card>
            ) : (
              <>
              {resultsJobs.map((job: Job) => {
                const client = (job as any).client_id ? resultsClientsById[String((job as any).client_id)] : null
                const companyName = client?.name || (job as any).client_name || "Company"
                const logoUrl = client?.logo_url || (job as any).company_logo_url || null
                const companyHref = client?.slug ? `/clients/${client.slug}` : null
                const city = String((job as any).city || "").trim()
                const loc = String(job.location || "").trim()
                const place = [city, loc].filter(Boolean).join(", ") || "India"
                const isExternal = String((job as any).apply_type || "in_platform") === "external"

                return (
                  <Card key={job.id} className="rounded-3xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardBody className="py-6">
                      <div className="grid gap-4 sm:grid-cols-[64px_1fr_auto] sm:items-start">
                        <div className="grid gap-2">
                          {companyHref ? (
                            <Link href={companyHref} target="_blank" rel="noopener noreferrer" className="inline-flex">
                              {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logoUrl} alt={companyName} className="h-16 w-16 rounded-2xl border bg-background object-contain p-1" />
                              ) : (
                                <div className="h-16 w-16 rounded-2xl border bg-background flex items-center justify-center text-muted-foreground">
                                  <Building2 className="h-6 w-6" />
                                </div>
                              )}
                            </Link>
                          ) : logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt={companyName} className="h-16 w-16 rounded-2xl border bg-background object-contain p-1" />
                          ) : (
                            <div className="h-16 w-16 rounded-2xl border bg-background flex items-center justify-center text-muted-foreground">
                              <Building2 className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <Link
                            href={`/jobs/${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              try {
                                window.sessionStorage.setItem(scrollKey, String(window.scrollY || 0))
                              } catch {}
                            }}
                            className="block text-base sm:text-lg font-semibold leading-tight hover:underline hover:underline-offset-4"
                          >
                            {job.title}
                          </Link>
                          {companyHref ? (
                            <Link
                              href={companyHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-sm text-muted-foreground truncate hover:text-foreground"
                            >
                              {companyName}
                            </Link>
                          ) : (
                            <div className="mt-1 text-sm text-muted-foreground truncate">{companyName}</div>
                          )}

                          <div className="mt-3 grid gap-2 text-sm">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{place}</span>
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                <span>{(job as any).employment_type ? formatEnum((job as any).employment_type) : "Job"}</span>
                              </span>
                              <span className="font-medium text-foreground">{formatSalary(job)}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(job as any).shift_type ? <Badge>{formatEnum((job as any).shift_type)}</Badge> : null}
                              {(job as any).department_category ? <Badge>{formatEnum((job as any).department_category)}</Badge> : null}
                              {isExternal ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Company site</Badge> : <Badge className="bg-blue-50 text-blue-700 border-blue-200">Easy apply</Badge>}
                            </div>

                            {!session ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => openAuth("login")}>
                                  Log in
                                </Button>
                                <Button size="sm" className="rounded-xl" onClick={() => openAuth("create")}>
                                  Create profile
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <Link
                            href={`/jobs/${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              try {
                                window.sessionStorage.setItem(scrollKey, String(window.scrollY || 0))
                              } catch {}
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Button variant="secondary" size="sm" className="rounded-xl w-full sm:w-auto">
                              View
                            </Button>
                          </Link>
                          <div className="text-xs text-muted-foreground">{formatRelativeTime(job.created_at)}</div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
              {resultsNextCursor ? (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    className="w-full rounded-xl"
                    onClick={loadMore}
                    disabled={resultsLoadingMore}
                  >
                    {resultsLoadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              ) : null}
              </>
            )}
          </div>

          {session ? (
          <div className="grid gap-4 w-full min-w-0 justify-self-end">
            <div className="sticky top-24">
              <Card>
                <CardBody className="pt-6">
                  {session ? (
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border bg-primary/5 flex items-center justify-center font-semibold">
                          {candidateAvatarUrl || googleAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={candidateAvatarUrl || googleAvatarUrl}
                              alt={candidate?.name || "Profile"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{String(candidate?.name || "U").trim().slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{candidate?.name || "Your profile"}</div>
                          <div className="text-xs text-muted-foreground truncate">{candidate?.email || ""}</div>
                        </div>
                        
                      </div>
                      <Link href="/dashboard/profile" className="w-full">
                        <Button variant="secondary" className="w-full rounded-xl">
                          Update profile
                        </Button>
                      </Link>
                      {candidateLoading ? <div className="text-xs text-muted-foreground">Loading profile…</div> : null}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="rounded-2xl border bg-accent p-4">
                        <div className="font-semibold">Know more about latest logistics jobs</div>
                        <div className="mt-1 text-sm text-muted-foreground">Create a profile to get a tailored feed and easy apply.</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="w-full rounded-xl" onClick={() => openAuth("login")}>
                          Log in
                        </Button>
                        <Button className="w-full rounded-xl" onClick={() => openAuth("create")}>
                          Create profile
                        </Button>
                      </div>
                      {sessionLoading ? <div className="text-xs text-muted-foreground">Checking session…</div> : null}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card className="mt-4">
                <CardBody className="pt-6">
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold">Sort by</div>
                    <select
                      value={draftSort}
                      onChange={(e) => applySort(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="relevant">Relevant</option>
                      <option value="recent">Most recent</option>
                    </select>

                    {roleBoostTerms.length ? (
                      <div className="rounded-2xl border bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                          <div className="text-sm font-semibold">Filter jobs using your profile</div>
                          <div className="text-xs text-muted-foreground">Based on your preferred title/role</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => (profileRoleFilterOn ? disableProfileRoleFilter() : enableProfileRoleFilter())}
                            className={
                              "inline-flex h-8 w-14 items-center rounded-full border px-1 transition-colors " +
                              (profileRoleFilterOn ? "bg-emerald-600 border-emerald-600" : "bg-muted border-input")
                            }
                            aria-label="Toggle profile role filtering"
                          >
                            <span
                              className={
                                "h-6 w-6 rounded-full bg-white shadow transition-transform " +
                                (profileRoleFilterOn ? "translate-x-6" : "translate-x-0")
                              }
                            />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {resultsUsedProfileFallback ? (
                      <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No matches for your profile roles. Showing all jobs.
                      </div>
                    ) : null}
                  </div>
                </CardBody>
              </Card>

              <div ref={profileRef} className="mt-4" />

              <Card className="mt-4">
                <CardBody className="pt-6">
                  <div className="grid gap-3">
                    <div>
                      <div className="font-semibold">Edit your preferences</div>
                      <div className="text-xs text-muted-foreground break-words">Your job feed is shown based on these preferences</div>
                    </div>

                    {prefsError ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{prefsError}</div> : null}

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">Preferred title/role</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!session || prefsBusy) return
                            openRoleModal()
                          }}
                          className="text-sm font-semibold text-emerald-700"
                        >
                          Edit
                        </button>
                      </div>

                      {explicitPreferredRoles.length || desiredRole ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!session || prefsBusy) return
                            openRoleModal()
                          }}
                          className="flex flex-wrap gap-2 text-left"
                        >
                          {explicitPreferredRoles.map((r) => (
                            <span key={r} className="rounded-full border bg-background px-3 py-1.5 text-xs">
                              {r}
                            </span>
                          ))}
                          {desiredRole && !explicitPreferredRoles.includes(desiredRole) ? (
                            <span className="rounded-full border bg-primary/10 px-3 py-1.5 text-xs">
                              {desiredRole}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!session || prefsBusy) return
                            openRoleModal()
                          }}
                          className="w-full rounded-2xl border border-dashed bg-background px-4 py-3 text-left text-sm text-muted-foreground"
                        >
                          Add your preferred role titles
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <div className="text-sm font-medium">Job preferences</div>
                      <div className="grid gap-2">
                        {[
                          { id: "full_time", label: "Full time" },
                          { id: "part_time", label: "Part time" },
                          { id: "contract", label: "Contract" }
                        ].map((opt) => {
                          const checked = preferredJobTypes.includes(opt.id)
                          return (
                            <label key={opt.id} className="flex items-center justify-between rounded-2xl border bg-background px-4 py-3 text-sm shadow-sm">
                              <span>{opt.label}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleJobType(opt.id)}
                                disabled={!session || prefsBusy}
                                className="h-4 w-4"
                              />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
          ) : null}
        </div>

        <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
          <div className="md:hidden">{MobileFiltersPanel}</div>
          <div className="hidden md:block">{FiltersPanel}</div>
        </Modal>

        <Modal open={roleModalOpen} onClose={closeRoleModal} title="Preferred title/role">
          <div className="grid gap-4">
            {roleModalError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{roleModalError}</div>
            ) : null}

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Selected</div>
              {roleModalSelected.length ? (
                <div className="flex flex-wrap gap-2">
                  {roleModalSelected.map((r) => (
                    <button
                      key={`sel:${r}`}
                      type="button"
                      onClick={() => setRoleModalSelected((prev) => prev.filter((x) => x !== r))}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-accent"
                      disabled={prefsBusy}
                      title="Remove"
                    >
                      <span className="max-w-[220px] truncate">{r}</span>
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
                  Select one or more roles
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Add role</div>
              <div className="flex gap-2">
                <Input
                  value={roleModalQuery}
                  onChange={(e) => setRoleModalQuery(e.target.value)}
                  placeholder="Type a role (e.g. Fleet Manager)"
                  disabled={prefsBusy}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    const v = roleModalQuery.trim()
                    if (!v) return
                    setRoleModalSelected((prev) => Array.from(new Set([...prev, v])).slice(0, 12))
                    setRoleModalQuery("")
                  }}
                />
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  disabled={prefsBusy || !roleModalQuery.trim()}
                  onClick={() => {
                    const v = roleModalQuery.trim()
                    if (!v) return
                    setRoleModalSelected((prev) => Array.from(new Set([...prev, v])).slice(0, 12))
                    setRoleModalQuery("")
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground">AI suggestions (from your profile)</div>
                {roleModalBusy ? <div className="text-xs text-muted-foreground">Generating…</div> : null}
              </div>
              {roleModalBusy ? (
                <div className="rounded-2xl border bg-violet-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-9 rounded-full bg-violet-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : roleModalSuggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {roleModalSuggestions
                    .filter((x) => (roleModalQuery ? x.toLowerCase().includes(roleModalQuery.toLowerCase()) : true))
                    .slice(0, 24)
                    .map((opt) => {
                      const active = roleModalSelected.includes(opt)
                      return (
                        <button
                          key={`s:${opt}`}
                          type="button"
                          onClick={() => {
                            setRoleModalSelected((prev) => {
                              const set = new Set(prev)
                              if (set.has(opt)) set.delete(opt)
                              else set.add(opt)
                              return Array.from(set).slice(0, 12)
                            })
                          }}
                          className={
                            "rounded-full border px-3 py-1.5 text-xs " +
                            (active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-background text-muted-foreground hover:bg-accent")
                          }
                          disabled={prefsBusy}
                        >
                          {opt}
                        </button>
                      )
                    })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
                  No AI suggestions yet. Type your role above and press Enter.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setRoleModalSelected([])}
                disabled={prefsBusy}
              >
                Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-xl" onClick={closeRoleModal} disabled={prefsBusy}>
                  Cancel
                </Button>
                <Button className="rounded-xl" onClick={applyRoleModal} disabled={prefsBusy}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={authOpen} onClose={closeAuth} title={authMode === "create" ? "Create your profile" : "Log in"}>
          {authMode === "create" ? (
            <AuthStep
              jobId="__create__"
              returnTo={`/onboarding?returnTo=${encodeURIComponent("/dashboard/jobs")}`}
              requireConsent
              title="Create your profile"
              description="Answer a few questions and upload your resume to unlock one‑tap apply."
              onError={() => {}}
            />
          ) : (
            <AuthStep
              jobId="__login__"
              returnTo="/dashboard/jobs"
              requireConsent={false}
              title="Log in"
              description="Continue to your dashboard and saved profile."
              onError={() => {}}
            />
          )}
        </Modal>
        </div>
      </main>
    </div>
  )
}
