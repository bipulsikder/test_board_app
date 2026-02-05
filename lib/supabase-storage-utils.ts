import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

export async function uploadFileToSupabase(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from("resume-files")
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
  if (error) throw error
  const { data: urlData } = supabaseAdmin.storage.from("resume-files").getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}

export async function uploadAvatarToSupabase(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from("candidate-avatars")
    .upload(fileName, file, { cacheControl: "3600", upsert: false })
  if (error) throw error
  const { data: urlData } = supabaseAdmin.storage.from("candidate-avatars").getPublicUrl(data.path)
  return { url: urlData.publicUrl, path: data.path }
}
