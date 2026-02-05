"use client"

import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"

export type LogisticsConnected = "yes" | "no" | "unknown"

export function IndustryGateStep({
  value,
  busy,
  disabled,
  onChange,
  onContinue,
  onSkip
}: {
  value: LogisticsConnected
  busy: boolean
  disabled: boolean
  onChange: (v: LogisticsConnected) => void
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="grid gap-2">
        <div className="text-base font-semibold">Are you connected to the logistics / transport / supply chain industry?</div>
        <div className="text-sm text-muted-foreground">
          This helps us show you the most relevant jobs. If you’re unsure, you can skip and upload your resume.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            className={[
              "rounded-3xl border bg-background p-5 text-left transition hover:bg-accent",
              value === "yes" ? "border-primary/40 bg-primary/5" : ""
            ].join(" ")}
            onClick={() => onChange("yes")}
            type="button"
            disabled={disabled}
          >
            <div className="text-sm font-semibold">Yes</div>
            <div className="mt-1 text-xs text-muted-foreground">I work in / around logistics or supply chain.</div>
          </button>
          <button
            className={[
              "rounded-3xl border bg-background p-5 text-left transition hover:bg-accent",
              value === "no" ? "border-primary/40 bg-primary/5" : ""
            ].join(" ")}
            onClick={() => onChange("no")}
            type="button"
            disabled={disabled}
          >
            <div className="text-sm font-semibold">No</div>
            <div className="mt-1 text-xs text-muted-foreground">Skip specialization and continue with resume.</div>
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1 rounded-xl" disabled={busy || disabled} onClick={onSkip}>
            Continue without specialization
          </Button>
          <Button className="flex-1 rounded-xl" disabled={busy || disabled || value === "unknown"} onClick={onContinue}>
            {busy ? <Spinner /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

