import { NextRequest, NextResponse } from "next/server"
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
