import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { uploadFileToSupabase } from "@/lib/supabase-storage-utils"
import { parseResume } from "@/lib/resume-parser"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("resume") as File
    const dryRun = (formData.get("dryRun") as string | null) === "true"
    if (!file) return NextResponse.json({ error: "Missing resume" }, { status: 400 })

    if (dryRun) {
      try {
        const parsed = await parseResume(file)
        return NextResponse.json({ success: true, parsed })
      } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to parse resume" }, { status: 422 })
      }
    }
    return NextResponse.json({ error: "Deprecated endpoint. Use /api/candidate/* routes." }, { status: 410 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
