import type { PropsWithChildren } from "react"

export function AuthShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div className="min-h-[calc(100vh-0px)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#0B1220] via-[#0F1B33] to-[#0B1220] px-10 py-10 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <div className="h-9 w-9 rounded-xl bg-white/10" />
          <span>Truckinzy</span>
        </div>

        <div className="max-w-md">
          <div className="text-4xl font-semibold tracking-tight">Hire and get hired in logistics.</div>
          <div className="mt-3 text-sm text-white/70">
            Create your profile once, apply faster, and track everything from one dashboard.
          </div>

          <div className="mt-8 grid gap-3 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Resume autofill + structured profile</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Invites + application tracking</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Built for drivers, ops, dispatch, warehouse</div>
          </div>
        </div>

        <div className="text-xs text-white/50">© {new Date().getFullYear()} Truckinzy</div>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="text-2xl font-semibold tracking-tight">{title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

