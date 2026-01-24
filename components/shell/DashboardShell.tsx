"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Briefcase, ChevronLeft, ChevronRight, LayoutGrid, LogOut, Sparkles, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { WorkAvailabilityModal } from "@/components/dashboard/WorkAvailabilityModal"

type NavItem = { label: string; href: string; active: (p: string) => boolean; comingSoon?: boolean }

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const { session } = useSupabaseSession()

  const [menuOpen, setMenuOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const nav = useMemo<NavItem[]>(
    () => [
      { label: "Jobs", href: "/jobs", active: (p) => p === "/jobs" || p.startsWith("/jobs/") },
      { label: "My work", href: "/dashboard/my-work", active: (p) => p === "/dashboard" || p.startsWith("/dashboard/my-work") },
      { label: "Career help", href: "#", active: () => false, comingSoon: true },
      { label: "Wallet", href: "#", active: () => false, comingSoon: true },
      { label: "Refer and earn", href: "#", active: () => false, comingSoon: true }
    ],
    []
  )

  const initials = useMemo(() => {
    const email = session?.user?.email || ""
    const part = email.split("@")[0] || "U"
    const words = part.replace(/[._-]+/g, " ").split(" ").filter(Boolean)
    const a = (words[0]?.[0] || "U").toUpperCase()
    const b = (words[1]?.[0] || "").toUpperCase()
    return `${a}${b}`.slice(0, 2)
  }, [session?.user?.email])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f6f3ff] pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-16 w-full items-center gap-3 px-6">
          <Link href="/jobs" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10" />
            <div className="text-sm font-semibold">Truckinzy</div>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-2 px-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              AI Resume Builder: Soon
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              AI Resume Checker: Soon
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              AI Cover Letter Generator: Soon
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative h-10 w-10 rounded-full border bg-card text-sm font-semibold"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
            >
              {initials}
            </button>

            {menuOpen ? (
              <div className="absolute right-4 top-16 w-56 rounded-2xl border bg-card p-2 shadow-lg">
                <Link
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-accent"
                  href="/dashboard/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setMenuOpen(false)
                    setAvailabilityOpen(true)
                  }}
                >
                  Work availability
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent"
                  onClick={async () => {
                    setMenuOpen(false)
                    await signOut()
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-6 py-6">
        <aside className="hidden md:block">
          <div
            className={[
              "sticky top-24 rounded-3xl border bg-card p-3 shadow-sm",
              collapsed ? "w-[84px]" : "w-[280px]"
            ].join(" ")}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className={["text-xs font-medium text-muted-foreground", collapsed ? "sr-only" : ""].join(" ")}>Navigation</div>
              <button
                className="rounded-2xl border bg-background p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setCollapsed((v) => !v)}
                aria-label="Toggle sidebar"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
            <nav className="grid gap-1">
              {nav.map((item) => {
                const active = item.active(pathname)
                const disabled = item.comingSoon
                const icon = item.label === "Jobs" ? <Briefcase className="h-4 w-4" /> : item.label === "My work" ? <LayoutGrid className="h-4 w-4" /> : <User className="h-4 w-4" />
                return (
                  <a
                    key={item.label}
                    href={disabled ? "#" : item.href}
                    className={[
                      "flex items-center justify-between rounded-2xl px-3 py-2 text-sm",
                      active ? "bg-accent" : "hover:bg-accent",
                      disabled ? "cursor-not-allowed opacity-60" : ""
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3">
                      {icon}
                      <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                    </span>
                    {item.comingSoon && !collapsed ? <span className="rounded-full border bg-background px-2 py-0.5 text-[10px]">Soon</span> : null}
                  </a>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <WorkAvailabilityModal open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/85 backdrop-blur md:hidden">
        <div className="flex w-full items-center justify-around px-2 py-2">
          <Link
            href="/jobs"
            className={[
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs",
              pathname === "/jobs" || pathname.startsWith("/jobs/") ? "bg-accent" : ""
            ].join(" ")}
          >
            <Briefcase className="h-5 w-5" />
            Jobs
          </Link>
          <Link
            href="/dashboard/my-work?tab=invites"
            className={[
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs",
              pathname.startsWith("/dashboard") ? "bg-accent" : ""
            ].join(" ")}
          >
            <LayoutGrid className="h-5 w-5" />
            My work
          </Link>
          <Link
            href="/dashboard/profile"
            className={[
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs",
              pathname.startsWith("/dashboard/profile") ? "bg-accent" : ""
            ].join(" ")}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>
        </div>
      </nav>
    </div>
  )
}
