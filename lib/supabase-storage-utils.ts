import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

import { AVATAR_BUCKET, RESUME_BUCKET } from "@/lib/constants/storage"

export async function uploadFileToSupabase(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
  if (error) throw error
  const { data: urlData } = supabaseAdmin.storage.from(RESUME_BUCKET).getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}

export async function uploadAvatarToSupabase(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
  if (error) throw error
  const { data: urlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}
