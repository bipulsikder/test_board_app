"use client"

import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"

export type DomainOption = { id: string; label: string }
export type ModeOption = { id: string; label: string }
export type CategoryOption = { id: string; label: string }

export function SpecializationStep({
  domain,
  mode,
  categories,
  domains,
  modes,
  modeCategories,
  busy,
  onBack,
  onSetDomain,
  onSetMode,
  onToggleCategory,
  onContinue
}: {
  domain: string
  mode: string
  categories: string[]
  domains: DomainOption[]
  modes: ModeOption[]
  modeCategories: Record<string, CategoryOption[]>
  busy: boolean
  onBack: () => void
  onSetDomain: (v: string) => void
  onSetMode: (v: string) => void
  onToggleCategory: (id: string) => void
  onContinue: () => void
}) {
  const options = mode ? modeCategories[mode] || [] : []

  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="grid gap-5">
        <div>
          <div className="text-base font-semibold">Pick your logistics specialization</div>
          <div className="mt-1 text-sm text-muted-foreground">Select what best describes your work. You can change this later.</div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Domain</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {domains.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSetDomain(d.id)}
                className={[
                  "rounded-2xl border bg-background px-4 py-3 text-left text-sm transition hover:bg-accent",
                  domain === d.id ? "border-primary/40 bg-primary/5" : ""
                ].join(" ")}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Mode</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSetMode(m.id)}
                className={[
                  "rounded-2xl border bg-background px-4 py-3 text-left text-sm transition hover:bg-accent",
                  mode === m.id ? "border-primary/40 bg-primary/5" : ""
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Specialization</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((c) => {
              const active = categories.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCategory(c.id)}
                  className={[
                    "rounded-2xl border bg-background px-4 py-3 text-left text-sm transition hover:bg-accent",
                    active ? "border-primary/40 bg-primary/5" : ""
                  ].join(" ")}
                >
                  {c.label}
                </button>
              )
            })}
            {mode ? null : <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">Choose a mode to see options.</div>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-xl" disabled={busy} onClick={onBack}>
            Back
          </Button>
          <Button className="flex-1 rounded-xl" disabled={busy || !domain || !mode || !categories.length} onClick={onContinue}>
            {busy ? <Spinner /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

