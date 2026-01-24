import type { ButtonHTMLAttributes, PropsWithChildren } from "react"

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger"
    size?: "sm" | "md" | "lg"
  }
>

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:pointer-events-none disabled:opacity-50"

const variants: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary",
  secondary: "border bg-card text-foreground hover:bg-accent",
  ghost: "text-foreground/80 hover:bg-accent",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive"
}

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: Props) {
  return (
    <button {...props} className={[base, variants[variant], sizes[size], className].join(" ")}>
      {children}
    </button>
  )
}
