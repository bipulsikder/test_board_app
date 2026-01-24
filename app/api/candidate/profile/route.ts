import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

function normalizeStringArray(v: unknown) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)
  if (typeof v === "string") {
    const out = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    return out
  }
  return null
}

function normalizeProjects(v: unknown) {
  if (Array.isArray(v)) return v
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 50)
}

function randomSuffix(len = 5) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })

  return NextResponse.json({ candidate: data || null })
}

export async function PUT(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as any
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const patch: Record<string, unknown> = {
    updated_at: nowIso()
  }

  const allowed = [
    "name",
    "phone",
    "current_role",
    "current_company",
    "total_experience",
    "location",
    "preferred_location",
    "desired_role",
    "current_salary",
    "expected_salary",
    "notice_period",
    "highest_qualification",
    "degree",
    "specialization",
    "university",
    "education_year",
    "education_percentage",
    "additional_qualifications",
    "summary",
    "linkedin_profile",
    "portfolio_url",
    "github_profile",
    "technical_skills",
    "soft_skills",
    "languages_known",
    "certifications",
    "projects",
    "tags",
    "public_profile_enabled",
    "public_profile_slug"
  ]

  for (const k of allowed) {
    if (k in body) patch[k] = body[k]
  }

  const normalizedArrays: Record<string, string[]> = {}
  for (const k of ["technical_skills", "soft_skills", "languages_known", "certifications"]) {
    if (k in patch) {
      const arr = normalizeStringArray(patch[k])
      if (arr) normalizedArrays[k] = arr
      else normalizedArrays[k] = []
    }
  }
  for (const [k, v] of Object.entries(normalizedArrays)) patch[k] = v

  if ("projects" in patch) {
    const normalized = normalizeProjects(patch.projects)
    patch.projects = normalized ?? []
  }

  const required = ["name", "current_role", "total_experience", "location"]
  for (const k of required) {
    const v = patch[k]
    if (typeof v === "string" && !v.trim()) return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 })
  }

  const { data: existing, error: findErr } = await supabaseAdmin
    .from("candidates")
    .select("id, public_profile_slug")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()
  if (findErr) return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })

  if (patch.public_profile_slug && typeof patch.public_profile_slug === "string") {
    patch.public_profile_slug = slugify(patch.public_profile_slug)
  }

  const wantsPublic = Boolean(patch.public_profile_enabled)
  if (wantsPublic && !patch.public_profile_slug) {
    const base = slugify(typeof patch.name === "string" && patch.name ? patch.name : user.email.split("@")[0])
    patch.public_profile_slug = `${base || "talent"}-${randomSuffix(5)}`
  }

  if (wantsPublic && typeof patch.public_profile_slug === "string" && patch.public_profile_slug) {
    const desired = patch.public_profile_slug
    const { data: clash } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("public_profile_slug", desired)
      .maybeSingle()
    if (clash?.id && clash.id !== existing?.id) {
      patch.public_profile_slug = `${desired}-${randomSuffix(4)}`
    }
  }

  if (existing?.id) {
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("candidates")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single()

    if (updateErr) return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 })
    return NextResponse.json({ candidate: updated })
  }

  const name = typeof patch.name === "string" ? patch.name : user.email.split("@")[0]
  const current_role = typeof patch.current_role === "string" ? patch.current_role : "Candidate"
  const total_experience = typeof patch.total_experience === "string" ? patch.total_experience : "0"
  const location = typeof patch.location === "string" ? patch.location : "Unknown"

  const insertPayload = {
    auth_user_id: user.id,
    email: user.email,
    name,
    current_role,
    total_experience,
    location,
    phone: typeof patch.phone === "string" ? patch.phone : null,
    desired_role: typeof patch.desired_role === "string" ? patch.desired_role : null,
    preferred_location: typeof patch.preferred_location === "string" ? patch.preferred_location : null,
    summary: typeof patch.summary === "string" ? patch.summary : null,
    linkedin_profile: typeof patch.linkedin_profile === "string" ? patch.linkedin_profile : null,
    portfolio_url: typeof patch.portfolio_url === "string" ? patch.portfolio_url : null,
    github_profile: typeof patch.github_profile === "string" ? patch.github_profile : null,
    public_profile_enabled: Boolean(patch.public_profile_enabled),
    public_profile_slug: typeof patch.public_profile_slug === "string" ? (patch.public_profile_slug as string) : null,
    tags: patch.tags ?? null,
    status: "new",
    uploaded_at: nowIso(),
    updated_at: nowIso()
  }

  const { data: created, error: createErr } = await supabaseAdmin
    .from("candidates")
    .insert(insertPayload)
    .select("*")
    .single()
  if (createErr) return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 })

  return NextResponse.json({ candidate: created })
}
