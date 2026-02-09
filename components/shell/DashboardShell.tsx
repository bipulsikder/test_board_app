"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Briefcase, ChevronLeft, ChevronRight, LayoutGrid, LogOut, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { bearerHeaders } from "@/lib/http"
import { WorkAvailabilityModal } from "@/components/dashboard/WorkAvailabilityModal"

type NavItem = { label: string; href: string; active: (p: string) => boolean; comingSoon?: boolean }

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const { session } = useSupabaseSession()
  const accessToken = session?.access_token

  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [candidateName, setCandidateName] = useState<string>("")
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifBusy, setNotifBusy] = useState(false)

  const nav = useMemo<NavItem[]>(
    () => [
      { label: "Jobs", href: "/dashboard/jobs", active: (p) => p === "/dashboard" || p === "/dashboard/jobs" || p.startsWith("/dashboard/jobs/") },
      { label: "My work", href: "/dashboard/my-work?tab=invites", active: (p) => p.startsWith("/dashboard/my-work") },
      { label: "Profile", href: "/dashboard/profile", active: (p) => p.startsWith("/dashboard/profile") },
      { label: "Career help", href: "#", active: () => false, comingSoon: true },
      { label: "Wallet", href: "#", active: () => false, comingSoon: true },
      { label: "Refer and earn", href: "#", active: () => false, comingSoon: true }
    ],
    []
  )

  useEffect(() => {
    if (!accessToken) {
      setCandidateName("")
      return
    }
    let active = true
    fetch("/api/candidate/profile", { headers: bearerHeaders(accessToken) })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!active) return
        if (!r.ok) return
        const name = typeof data?.candidate?.name === "string" ? data.candidate.name : ""
        setCandidateName(name)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [accessToken])

  const avatarUrl = useMemo(() => {
    const meta = (session?.user?.user_metadata as any) || {}
    const url = meta.avatar_url || meta.picture || meta.avatar
    return typeof url === "string" ? url : ""
  }, [session?.user?.user_metadata])

  const displayName = useMemo(() => {
    const meta = (session?.user?.user_metadata as any) || {}
    const name = meta.full_name || meta.name
    if (typeof name === "string" && name.trim()) return name.trim()
    if (candidateName.trim()) return candidateName.trim()
    return ""
  }, [candidateName, session?.user?.user_metadata])

  const initials = useMemo(() => {
    const src = displayName || "User"
    const words = src.replace(/[._-]+/g, " ").split(" ").filter(Boolean)
    const a = (words[0]?.[0] || "U").toUpperCase()
    const b = (words[1]?.[0] || "").toUpperCase()
    return `${a}${b}`.slice(0, 2)
  }, [displayName])

  const loadNotifications = useCallback(async () => {
    if (!accessToken) return
    setNotifBusy(true)
    try {
      const res = await fetch("/api/candidate/notifications", { headers: bearerHeaders(accessToken) })
      const data = await res.json().catch(() => null)
      if (!res.ok) return
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : [])
      setUnreadCount(Number(data?.unreadCount || 0) || 0)
    } finally {
      setNotifBusy(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    loadNotifications()
  }, [accessToken, loadNotifications])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/jobs")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f6f3ff] pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-16 w-full items-center gap-3 px-6">
          <Link href="/dashboard/jobs" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10" />
            <div className="text-sm font-semibold">Truckinzy</div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                className="relative h-10 w-10 rounded-full border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setNotifOpen((v) => !v)
                  setMenuOpen(false)
                  if (!notifOpen) loadNotifications()
                }}
                aria-label="Notifications"
              >
                <Bell className="mx-auto h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 top-12 w-[340px] rounded-2xl border bg-card p-2 shadow-lg">
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="text-sm font-semibold">Notifications</div>
                    <button
                      className="rounded-xl px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={async () => {
                        if (!accessToken) return
                        await fetch("/api/candidate/notifications", {
                          method: "POST",
                          headers: bearerHeaders(accessToken, { "Content-Type": "application/json" }),
                          body: JSON.stringify({ action: "mark_all_read" })
                        })
                        await loadNotifications()
                      }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="mt-1 max-h-[360px] overflow-auto">
                    {notifBusy ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground">Loading…</div>
                    ) : notifications.length ? (
                      <div className="grid gap-1">
                        {notifications.map((n: any) => (
                          <button
                            key={String(n.id)}
                            className={[
                              "w-full rounded-xl px-3 py-2 text-left hover:bg-accent",
                              n.is_read ? "" : "bg-primary/5"
                            ].join(" ")}
                            onClick={async () => {
                              if (!accessToken) return
                              await fetch("/api/candidate/notifications", {
                                method: "POST",
                                headers: bearerHeaders(accessToken, { "Content-Type": "application/json" }),
                                body: JSON.stringify({ action: "mark_read", id: n.id })
                              })
                              setNotifOpen(false)
                              await loadNotifications()
                              router.push("/dashboard/profile")
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {n.type === "welcome" ? "Welcome" : n.type === "profile_updated" ? "Profile updated" : "Update"}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {typeof n?.payload?.message === "string"
                                    ? n.payload.message
                                    : Array.isArray(n?.payload?.changed)
                                      ? `Updated: ${n.payload.changed.slice(0, 3).join(", ")}${n.payload.changed.length > 3 ? "…" : ""}`
                                      : "You have a new update."}
                                </div>
                              </div>
                              {!n.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-6 text-sm text-muted-foreground">No notifications yet.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className="relative h-10 w-10 rounded-full border bg-card text-sm font-semibold"
              onClick={() => {
                setMenuOpen((v) => !v)
                setNotifOpen(false)
              }}
              aria-label="Open menu"
            >
              {avatarUrl ? <img className="h-full w-full rounded-full object-cover" alt={displayName || "Avatar"} src={avatarUrl} /> : initials}
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
                <Link
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-accent"
                  href="/onboarding?returnTo=%2Fdashboard%2Fprofile"
                  onClick={() => setMenuOpen(false)}
                >
                  Edit onboarding
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

      <div className="flex w-full">
        <aside
          className={[
            "relative hidden md:block shrink-0 border-r bg-card",
            collapsed ? "w-[72px]" : "w-[240px]"
          ].join(" ")}
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-auto p-3">
            <div className={collapsed ? "flex justify-center" : "flex items-center justify-between"}>
              <div className={["text-xs font-medium text-muted-foreground", collapsed ? "sr-only" : ""].join(" ")}>Navigation</div>
              <button
                className="rounded-xl border bg-background p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setCollapsed((v) => !v)}
                aria-label="Toggle sidebar"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <nav className="mt-3 grid gap-1">
              {nav.map((item) => {
                const active = item.active(pathname)
                const disabled = item.comingSoon
                const icon =
                  item.label === "Jobs" ? (
                    <Briefcase className="h-4 w-4" />
                  ) : item.label === "My work" ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : item.label === "Profile" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )
                return (
                  <a
                    key={item.label}
                    href={disabled ? "#" : item.href}
                    className={[
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
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

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>

      <WorkAvailabilityModal open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/85 backdrop-blur md:hidden">
        <div className="flex w-full items-center justify-around px-2 py-2">
          <Link
            href="/dashboard/jobs"
            className={[
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs",
              pathname === "/dashboard" || pathname.startsWith("/dashboard/jobs") ? "bg-accent" : ""
            ].join(" ")}
          >
            <Briefcase className="h-5 w-5" />
            Jobs
          </Link>
          <Link
            href="/dashboard/my-work?tab=invites"
            className={[
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs",
              pathname.startsWith("/dashboard/my-work") ? "bg-accent" : ""
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
