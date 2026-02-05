import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { Job } from "@/lib/types"

export const runtime = "nodejs"

type ClientLite = { id: string; name: string; slug: string | null; logo_url: string | null }

function normalizeText(v: unknown) {
  return String(v || "").trim()
}

function parseSkillsParam(raw: string) {
  const list = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12)
  return Array.from(new Set(list))
}

function escapeArrayLiteralElement(s: string) {
  const t = s.trim()
  if (!t) return ""
  if (/^[a-zA-Z0-9_+./-]+$/.test(t)) return t
  return `"${t.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`
}

function decodeCursor(raw: string | null) {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, "base64").toString("utf8")
    const parsed = JSON.parse(json)
    const created_at = typeof parsed?.created_at === "string" ? parsed.created_at : null
    const id = typeof parsed?.id === "string" ? parsed.id : null
    if (!created_at || !id) return null
    return { created_at, id }
  } catch {
    return null
  }
}

function encodeCursor(row: { created_at: string | null; id: string }) {
  const payload = { created_at: row.created_at || "", id: row.id }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
}

function buildRoleOr(terms: string[]) {
  const parts: string[] = []
  for (const term of terms) {
    const t = term.trim().replace(/,/g, " ")
    if (!t) continue
    const like = `%${t}%`
    parts.push(`title.ilike.${like}`)
    parts.push(`industry.ilike.${like}`)
    parts.push(`department_category.ilike.${like}`)
    parts.push(`role_category.ilike.${like}`)
    parts.push(`sub_category.ilike.${like}`)
  }
  return parts.length ? parts.join(",") : null
}

function buildTextOr(q: string) {
  const t = q.trim().replace(/,/g, " ")
  if (!t) return null
  const like = `%${t}%`
  return [
    `title.ilike.${like}`,
    `client_name.ilike.${like}`,
    `industry.ilike.${like}`,
    `department_category.ilike.${like}`,
    `role_category.ilike.${like}`,
    `sub_category.ilike.${like}`,
    `city.ilike.${like}`,
    `location.ilike.${like}`
  ].join(",")
}

function applyExperienceFilter(q: any, exp: string) {
  if (exp === "fresher") return q.lte("experience_min_years", 0)
  if (exp === "1_2") return q.lte("experience_min_years", 2).gte("experience_max_years", 1)
  if (exp === "3_5") return q.lte("experience_min_years", 5).gte("experience_max_years", 3)
  if (exp === "5_plus") return q.gte("experience_max_years", 5)
  return q
}

async function runQuery(params: {
  q: string
  location: string
  skills: string[]
  jobType: string
  shift: string
  dept: string
  roleCat: string
  exp: string
  salaryMin: string
  salaryMax: string
  sort: string
  cursor: string | null
  limit: number
  roleTerms: string[]
  useRoleFilter: boolean
}) {
  let query = supabaseAdmin.from("jobs").select("*").eq("status", "open")

  if (params.cursor) {
    const c = decodeCursor(params.cursor)
    if (c) {
      query = query.or(`created_at.lt.${c.created_at},and(created_at.eq.${c.created_at},id.lt.${c.id})`)
    }
  }

  if (params.q) {
    const orText = buildTextOr(params.q)
    if (orText) query = query.or(orText)
  }

  if (params.location) {
    const t = params.location.trim().replace(/,/g, " ")
    if (t) {
      const like = `%${t}%`
      query = query.or(`city.ilike.${like},location.ilike.${like}`)
    }
  }

  if (params.exp && params.exp !== "any") {
    query = applyExperienceFilter(query, params.exp)
  }
  if (params.jobType && params.jobType !== "any") query = query.eq("employment_type", params.jobType)
  if (params.shift && params.shift !== "any") query = query.eq("shift_type", params.shift)
  if (params.dept && params.dept !== "any") query = query.eq("department_category", params.dept)
  if (params.roleCat && params.roleCat !== "any") query = query.eq("role_category", params.roleCat)

  const salMin = params.salaryMin ? Number(params.salaryMin) : null
  const salMax = params.salaryMax ? Number(params.salaryMax) : null
  if (salMin && Number.isFinite(salMin)) query = query.gte("salary_max", salMin)
  if (salMax && Number.isFinite(salMax)) query = query.lte("salary_min", salMax)

  if (params.skills.length) {
    const parts: string[] = []
    for (const s of params.skills) {
      const lit = escapeArrayLiteralElement(s)
      if (!lit) continue
      parts.push(`skills_must_have.cs.{${lit}}`)
      parts.push(`skills_good_to_have.cs.{${lit}}`)
    }
    if (parts.length) query = query.or(parts.join(","))
  }

  if (params.useRoleFilter && params.roleTerms.length) {
    const orRole = buildRoleOr(params.roleTerms)
    if (orRole) query = query.or(orRole)
  }

  query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(params.limit + 1)

  const { data, error } = await query
  if (error) throw new Error("Failed to load jobs")

  const rows = ((data || []) as Job[]).filter(Boolean)
  const hasMore = rows.length > params.limit
  const page = hasMore ? rows.slice(0, params.limit) : rows
  const nextCursor = hasMore ? encodeCursor({ created_at: page[page.length - 1]?.created_at || "", id: String(page[page.length - 1].id) }) : null
  return { page, nextCursor }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const q = normalizeText(sp.get("text") || sp.get("q") || "")
  const location = normalizeText(sp.get("location_name") || sp.get("location") || "")
  const skills = parseSkillsParam(normalizeText(sp.get("skills") || ""))
  const jobType = normalizeText(sp.get("jobType") || "") || "any"
  const shift = normalizeText(sp.get("shift") || "") || "any"
  const dept = normalizeText(sp.get("dept") || "") || "any"
  const roleCat = normalizeText(sp.get("role") || sp.get("roleCat") || "") || "any"
  const exp = normalizeText(sp.get("exp") || sp.get("min_experience") || "") || "any"
  const salaryMin = normalizeText(sp.get("salaryMin") || "")
  const salaryMax = normalizeText(sp.get("salaryMax") || "")
  const sort = normalizeText(sp.get("sort") || "") || "recent"
  const cursor = normalizeText(sp.get("cursor") || "") || null

  const roleTerms = parseSkillsParam(normalizeText(sp.get("role_terms") || ""))
  const useRoleFilter = normalizeText(sp.get("profileRoleFilter") || "") === "1"

  const limit = Math.min(Math.max(Number(sp.get("limit") || 30) || 30, 10), 50)

  try {
    let usedProfileFallback = false
    let result = await runQuery({ q, location, skills, jobType, shift, dept, roleCat, exp, salaryMin, salaryMax, sort, cursor, limit, roleTerms, useRoleFilter })

    if (useRoleFilter && roleTerms.length && !q && !result.page.length) {
      usedProfileFallback = true
      result = await runQuery({ q, location, skills, jobType, shift, dept, roleCat, exp, salaryMin, salaryMax, sort, cursor, limit, roleTerms, useRoleFilter: false })
    }

    const clientIds = Array.from(new Set(result.page.map((j: any) => j.client_id).filter((x) => typeof x === "string" && x.length > 0)))
    const { data: clientsData } = clientIds.length
      ? await supabaseAdmin.from("clients").select("id,name,slug,logo_url").in("id", clientIds)
      : { data: [] as any[] }

    const clientsById: Record<string, ClientLite> = {}
    for (const c of (clientsData || []) as any[]) {
      clientsById[String(c.id)] = {
        id: String(c.id),
        name: String(c.name || ""),
        slug: typeof c.slug === "string" ? c.slug : null,
        logo_url: typeof c.logo_url === "string" ? c.logo_url : null
      }
    }

    return NextResponse.json({ jobs: result.page, clientsById, nextCursor: result.nextCursor, usedProfileFallback })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}

