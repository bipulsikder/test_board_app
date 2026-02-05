import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseMiddlewareClient } from "@/lib/supabaseSsr"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createSupabaseMiddlewareClient(request, response)

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const isAuthed = Boolean(user)
  const { pathname, search } = request.nextUrl

  const fullPath = `${pathname}${search}`
  const authRoutes = ["/auth/login", "/auth/sign_up", "/auth/sign-up", "/auth/signup"]
  const protectedPrefixes = ["/dashboard", "/onboarding"]

  if (pathname === "/") {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = isAuthed ? "/dashboard/jobs" : "/auth/login"
    redirectTo.search = isAuthed ? "" : "?returnTo=%2Fjobs"
    return NextResponse.redirect(redirectTo)
  }

  if (authRoutes.includes(pathname) && isAuthed) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = "/dashboard/jobs"
    redirectTo.search = ""
    return NextResponse.redirect(redirectTo)
  }

  if (pathname === "/jobs" && isAuthed) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = "/dashboard/jobs"
    redirectTo.search = ""
    return NextResponse.redirect(redirectTo)
  }

  if (protectedPrefixes.some((p) => pathname.startsWith(p)) && !isAuthed) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = "/auth/login"
    redirectTo.search = `returnTo=${encodeURIComponent(fullPath)}`
    return NextResponse.redirect(redirectTo)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}
