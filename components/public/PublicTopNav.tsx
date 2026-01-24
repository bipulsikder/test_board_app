import Link from "next/link"
import { Button } from "@/components/ui/Button"

export function PublicTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/jobs" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10" />
          <div className="text-sm font-semibold">Truckinzy</div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/jobs" className="hover:text-foreground">
            Jobs
          </Link>
          <Link href="/contact-sales" className="hover:text-foreground">
            Company
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/contact-sales" className="hidden sm:block">
            <Button variant="secondary" size="sm">
              Book Demo
            </Button>
          </Link>
          <Link href="/auth/sign_up">
            <Button size="sm">Talent Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

