import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { uploadAvatarToSupabase } from "@/lib/supabase-storage-utils"
import { getAuthedUser } from "@/lib/apiServerAuth"

export const runtime = "nodejs"

function nowIso() {
  return new Date().toISOString()
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_")
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
  const file = form.get("avatar") as File | null
  if (!file) return NextResponse.json({ error: "Missing avatar" }, { status: 400 })

  const contentType = String(file.type || "").toLowerCase()
  if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Avatar must be an image" }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Avatar must be <= 5MB" }, { status: 400 })

  try {
    const candidateId = await getOrCreateCandidateId(user.id, user.email)
    const name = typeof (file as any).name === "string" ? String((file as any).name) : "avatar"
    const safeName = sanitizeName(name)
    const filePath = `${candidateId}/${Date.now()}_${safeName}`
    const { url: avatarUrl } = await uploadAvatarToSupabase(file, filePath)

    const { data: current, error: loadErr } = await supabaseAdmin
      .from("candidates")
      .select("id,tags")
      .eq("id", candidateId)
      .single()
    if (loadErr || !current?.id) return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })

    const map = tagsToMap(current.tags)
    map.avatar_url = avatarUrl
    const nextTags = mapToTags(map)

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("candidates")
      .update({ tags: nextTags, updated_at: nowIso() })
      .eq("id", candidateId)
      .select("*")
      .single()
    if (updateErr) return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 })

    return NextResponse.json({ candidate: updated, avatar_url: avatarUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to upload" }, { status: 500 })
  }
}

