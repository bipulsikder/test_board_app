import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { uploadFileToSupabase } from "@/lib/supabase-storage-utils"
import { parseResume } from "@/lib/resume-parser"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_")
}

function nonEmptyString(v: unknown) {
  if (typeof v !== "string") return null
  const t = v.trim()
  if (!t || t.toLowerCase() === "not specified" || t.toLowerCase() === "unknown") return null
  return t
}

function nonEmptyStringArray(v: unknown) {
  if (!Array.isArray(v)) return null
  const cleaned = v
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.toLowerCase() !== "unknown" && x.toLowerCase() !== "not specified")
  return cleaned.length ? cleaned : null
}

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

function mapToTags(map: Record<string, string>) {
  const out: string[] = []
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue
    out.push(`${k}:${v}`)
  }
  return out
}

function guessLogisticsBackgroundFromKeywords(text: string) {
  const t = String(text || "").toLowerCase()
  if (!t) return null
  const keywords = [
    "logistics",
    "supply chain",
    "supplychain",
    "warehouse",
    "warehousing",
    "dispatch",
    "fleet",
    "transport",
    "transportation",
    "freight",
    "shipment",
    "shipping",
    "delivery",
    "last mile",
    "last-mile",
    "3pl",
    "cold chain",
    "line haul",
    "line-haul",
    "route planning",
    "load planning",
    "tms",
    "wms",
    "inventory",
    "procurement",
    "driver",
    "truck",
    "trucking",
    "carrier",
    "broker",
  ]
  const hit = keywords.some((k) => t.includes(k))
  return hit ? "yes" : null
}

async function inferLogisticsBackground(text: string) {
  const byKeywords = guessLogisticsBackgroundFromKeywords(text)
  if (byKeywords) return { value: byKeywords, source: "keywords" }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { value: "no", source: "default" }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = process.env.GEMINI_CLASSIFIER_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash"
  const model = genAI.getGenerativeModel({ model: modelName })

  const limited = String(text || "").slice(0, 6000)
  const prompt = `Decide if this candidate has logistics/transportation/supply-chain background.

Return ONLY valid JSON with keys:
- logistics_background: "yes" or "no"
- confidence: number 0-1

Candidate resume text:
${limited}`

  const result: any = await model.generateContent(prompt)
  const content = result.response.text()
  const match = content.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : null
  const v = String(parsed?.logistics_background || "").toLowerCase()
  if (v === "yes" || v === "no") return { value: v, source: "gemini", confidence: Number(parsed?.confidence ?? null) }
  return { value: "no", source: "default" }
}

function normalizeJobType(v: unknown) {
  const t = String(v || "").toLowerCase().replace(/\s+/g, " ").trim()
  if (!t) return null
  if (t.includes("full")) return "full_time"
  if (t.includes("part")) return "part_time"
  if (t.includes("contract") || t.includes("freelance")) return "contract"
  return null
}

async function inferCandidatePreferences(text: string) {
  const limited = String(text || "").slice(0, 7000)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = process.env.GEMINI_CLASSIFIER_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash"
  const model = genAI.getGenerativeModel({ model: modelName })

  const prompt = `You are helping a logistics/transportation job platform.

From the resume text, infer candidate job preferences.
Return ONLY valid JSON with keys:
- preferred_roles: array of 1-5 role titles (strings)
- open_job_types: array containing any of "full_time","part_time","contract" (0-3 items)
- preferred_location: string (city/region) or empty string if unknown

Resume text:
${limited}`

  const result: any = await model.generateContent(prompt)
  const content = result.response.text()
  const match = content.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : null

  const roles = Array.isArray(parsed?.preferred_roles)
    ? (parsed.preferred_roles as unknown[]).filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 8)
    : []
  const jobTypesRaw = Array.isArray(parsed?.open_job_types) ? (parsed.open_job_types as unknown[]) : []
  const jobTypes = Array.from(new Set(jobTypesRaw.map(normalizeJobType).filter(Boolean))) as string[]
  const preferred_location = typeof parsed?.preferred_location === "string" ? parsed.preferred_location.trim() : ""

  return {
    preferred_roles: roles.slice(0, 5),
    open_job_types: jobTypes,
    preferred_location
  }
}

async function getOrCreateCandidateId(authUserId: string, email: string) {
  const { data: existing, error } = await supabaseAdmin
    .from("candidates")
    .select("id,auth_user_id")
    .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
    .maybeSingle()
  if (error) throw new Error("Failed to load candidate")
  if (existing?.id) {
    if (!existing.auth_user_id) {
      await supabaseAdmin.from("candidates").update({ auth_user_id: authUserId, updated_at: nowIso() }).eq("id", existing.id)
    }
    return existing.id as string
  }

  const baseName = email.split("@")[0]
  const { data: created, error: createErr } = await supabaseAdmin
    .from("candidates")
    .insert({
      auth_user_id: authUserId,
      email,
      name: baseName,
      current_role: "Candidate",
      total_experience: "0",
      location: "Unknown",
      status: "new",
      uploaded_at: nowIso(),
      updated_at: nowIso()
    })
    .select("id")
    .single()

  if (createErr || !created?.id) throw new Error("Failed to create candidate")
  return created.id as string
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthedUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData()
  const file = form.get("resume") as File | null
  if (!file) return NextResponse.json({ error: "Missing resume" }, { status: 400 })

  try {
    const candidateId = await getOrCreateCandidateId(user.id, user.email)
    const filePath = `${candidateId}/${Date.now()}_${sanitizeName(file.name)}`
    const { url: fileUrl, path } = await uploadFileToSupabase(file, filePath)

    const { data: fileRow, error: fileErr } = await supabaseAdmin
      .from("file_storage")
      .insert({
        candidate_id: candidateId,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        original_path: path,
        storage_provider: "supabase",
        created_at: nowIso()
      })
      .select("*")
      .single()

    if (fileErr) return NextResponse.json({ error: "Failed to store file metadata" }, { status: 500 })

    const parsed = await parseResume(file)

    const candidateUpdate: Record<string, unknown> = {
      auth_user_id: user.id,
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type || "application/octet-stream",
      uploaded_at: nowIso(),
      updated_at: nowIso()
    }

    const name = nonEmptyString((parsed as any).name)
    const phone = nonEmptyString((parsed as any).phone)
    const currentRole = nonEmptyString((parsed as any).currentRole)
    const currentCompany = nonEmptyString((parsed as any).currentCompany)
    const location = nonEmptyString((parsed as any).location)
    const totalExperience = nonEmptyString((parsed as any).totalExperience)
    const highestQualification = nonEmptyString((parsed as any).highestQualification)
    const degree = nonEmptyString((parsed as any).degree)
    const specialization = nonEmptyString((parsed as any).specialization)
    const university = nonEmptyString((parsed as any).university)
    const educationYear = nonEmptyString((parsed as any).educationYear)
    const educationPercentage = nonEmptyString((parsed as any).educationPercentage)
    const additionalQualifications = nonEmptyString((parsed as any).additionalQualifications)
    const summary = nonEmptyString((parsed as any).summary)

    const technicalSkills = nonEmptyStringArray((parsed as any).technicalSkills)
    const softSkills = nonEmptyStringArray((parsed as any).softSkills)
    const languagesKnown = nonEmptyStringArray((parsed as any).languagesKnown)
    const certifications = nonEmptyStringArray((parsed as any).certifications)
    const previousCompanies = nonEmptyStringArray((parsed as any).previousCompanies)
    const jobTitles = nonEmptyStringArray((parsed as any).jobTitles)
    const workDuration = nonEmptyStringArray((parsed as any).workDuration)
    const keyAchievements = nonEmptyStringArray((parsed as any).keyAchievements)
    const projects = nonEmptyStringArray((parsed as any).projects)
    const resumeText = nonEmptyString((parsed as any).resumeText)

    if (phone) candidateUpdate.phone = phone
    if (name) candidateUpdate.name = name
    if (currentRole) candidateUpdate.current_role = currentRole
    if (currentCompany) candidateUpdate.current_company = currentCompany
    if (location) candidateUpdate.location = location
    if (totalExperience) candidateUpdate.total_experience = totalExperience
    if (highestQualification) candidateUpdate.highest_qualification = highestQualification
    if (degree) candidateUpdate.degree = degree
    if (specialization) candidateUpdate.specialization = specialization
    if (university) candidateUpdate.university = university
    if (educationYear) candidateUpdate.education_year = educationYear
    if (educationPercentage) candidateUpdate.education_percentage = educationPercentage
    if (additionalQualifications) candidateUpdate.additional_qualifications = additionalQualifications
    if (summary) candidateUpdate.summary = summary
    if (resumeText) candidateUpdate.resume_text = resumeText

    if (technicalSkills) candidateUpdate.technical_skills = technicalSkills
    if (softSkills) candidateUpdate.soft_skills = softSkills
    if (languagesKnown) candidateUpdate.languages_known = languagesKnown
    if (certifications) candidateUpdate.certifications = certifications
    if (previousCompanies) candidateUpdate.previous_companies = previousCompanies
    if (jobTitles) candidateUpdate.job_titles = jobTitles
    if (workDuration) candidateUpdate.work_duration = workDuration
    if (keyAchievements) candidateUpdate.key_achievements = keyAchievements
    if (projects) candidateUpdate.projects = projects

    candidateUpdate.parsing_method = process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENROUTER_API_KEY ? "openrouter" : "basic"

    const { data: existingPrefs } = await supabaseAdmin
      .from("candidates")
      .select("preferred_roles,open_job_types,preferred_location")
      .eq("id", candidateId)
      .maybeSingle()

    try {
      const inferredPrefs = await inferCandidatePreferences(resumeText || "")
      if (inferredPrefs) {
        const hasRoles = Array.isArray((existingPrefs as any)?.preferred_roles) && (existingPrefs as any).preferred_roles.length
        const hasTypes = Array.isArray((existingPrefs as any)?.open_job_types) && (existingPrefs as any).open_job_types.length
        const hasLoc = typeof (existingPrefs as any)?.preferred_location === "string" && (existingPrefs as any).preferred_location.trim()

        if (!hasRoles && inferredPrefs.preferred_roles.length) candidateUpdate.preferred_roles = inferredPrefs.preferred_roles
        if (!hasTypes && inferredPrefs.open_job_types.length) candidateUpdate.open_job_types = inferredPrefs.open_job_types
        if (!hasLoc && inferredPrefs.preferred_location) candidateUpdate.preferred_location = inferredPrefs.preferred_location
      }
    } catch {
      // ignore
    }

    const { data: existingTagsRow } = await supabaseAdmin.from("candidates").select("tags").eq("id", candidateId).maybeSingle()
    const tagsMap = tagsToMap(existingTagsRow?.tags)
    try {
      const inferred = await inferLogisticsBackground(resumeText || "")
      if (!tagsMap.logistics_background) {
        tagsMap.logistics_background = inferred.value
      }
    } catch {
      if (!tagsMap.logistics_background) tagsMap.logistics_background = "no"
    }
    candidateUpdate.tags = mapToTags(tagsMap)

    const { data: updatedCandidate, error: candErr } = await supabaseAdmin
      .from("candidates")
      .update(candidateUpdate)
      .eq("id", candidateId)
      .select("*")
      .single()

    if (candErr) return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 })

    const parsedWorkExperience = Array.isArray((parsed as any).workExperience) ? ((parsed as any).workExperience as any[]) : []
    const parsedEducation = Array.isArray((parsed as any).education) ? ((parsed as any).education as any[]) : []

    if (parsedWorkExperience.length) {
      await supabaseAdmin.from("work_experience").delete().eq("candidate_id", candidateId)

      const rows = parsedWorkExperience
        .map((it) => {
          const company = nonEmptyString(it?.company)
          const role = nonEmptyString(it?.role)
          const duration = nonEmptyString(it?.duration)
          if (!company && !role) return null
          const responsibilities = Array.isArray(it?.responsibilities)
            ? it.responsibilities.map((x: any) => (typeof x === "string" ? x.trim() : "")).filter(Boolean).join("\n")
            : nonEmptyString(it?.responsibilities)
          const achievements = Array.isArray(it?.achievements)
            ? it.achievements.map((x: any) => (typeof x === "string" ? x.trim() : "")).filter(Boolean).join("\n")
            : nonEmptyString(it?.achievements)
          const technologies = nonEmptyStringArray(it?.technologies)
          return {
            candidate_id: candidateId,
            company: company || "Not specified",
            role: role || "Not specified",
            duration: duration || "Not specified",
            location: nonEmptyString(it?.location),
            description: nonEmptyString(it?.description),
            responsibilities: responsibilities,
            achievements: achievements,
            technologies: technologies,
            created_at: nowIso()
          }
        })
        .filter(Boolean) as any[]

      if (rows.length) {
        await supabaseAdmin.from("work_experience").insert(rows)
      }
    }

    if (parsedEducation.length) {
      await supabaseAdmin.from("education").delete().eq("candidate_id", candidateId)

      const rows = parsedEducation
        .map((it) => {
          const degree = nonEmptyString(it?.degree)
          const institution = nonEmptyString(it?.institution) || nonEmptyString(it?.university)
          if (!degree && !institution) return null
          return {
            candidate_id: candidateId,
            degree: degree || "Not specified",
            specialization: nonEmptyString(it?.specialization),
            institution: institution || "Not specified",
            year: nonEmptyString(it?.year) || nonEmptyString(it?.endYear) || nonEmptyString(it?.educationYear),
            percentage: nonEmptyString(it?.percentage),
            description: nonEmptyString(it?.description),
            created_at: nowIso()
          }
        })
        .filter(Boolean) as any[]

      if (rows.length) {
        await supabaseAdmin.from("education").insert(rows)
      }
    }

    const { data: parsingJob, error: pErr } = await supabaseAdmin
      .from("parsing_jobs")
      .insert({
        candidate_id: candidateId,
        file_id: fileRow.id,
        status: "completed",
        parsing_method: (candidateUpdate.parsing_method as string) || "basic",
        started_at: nowIso(),
        completed_at: nowIso(),
        created_at: nowIso()
      })
      .select("*")
      .single()

    if (pErr) return NextResponse.json({ error: "Failed to create parsing job" }, { status: 500 })

    return NextResponse.json({ candidate: updatedCandidate, parsingJob, parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
  }
}
