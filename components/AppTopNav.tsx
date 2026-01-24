"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Briefcase, LayoutDashboard, LogIn, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { Button } from "@/components/ui/Button"

export function AppTopNav() {
  const { session } = useSupabaseSession()
  const pathname = usePathname()
  const router = useRouter()

  const signIn = () => {
    const next = pathname || "/"
    router.push(`/auth?returnTo=${encodeURIComponent(next)}`)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1220]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
            <Briefcase className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-white">Truckinzy ATS</span>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <Link
            href="/"
            className={[
              "rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white",
              pathname === "/" ? "bg-white/5 text-white" : ""
            ].join(" ")}
          >
            Jobs
          </Link>
          <Link
            href="/dashboard"
            className={[
              "rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white",
              pathname?.startsWith("/dashboard") ? "bg-white/5 text-white" : ""
            ].join(" ")}
          >
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/" className="sm:hidden">
            <Button variant="ghost" size="sm" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </Button>
          </Link>
          <Link href="/dashboard" className="sm:hidden">
            <Button variant="ghost" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          {session ? (
            <Button variant="secondary" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={signIn} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

