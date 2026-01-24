export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/10 border-t-foreground/60",
        className
      ].join(" ")}
    />
  )
}
