import type { HTMLAttributes } from "react"

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center rounded-full border bg-accent px-2.5 py-1 text-xs font-medium text-foreground/80",
        className
      ].join(" ")}
    />
  )
}
