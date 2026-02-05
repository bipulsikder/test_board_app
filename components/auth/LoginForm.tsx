"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

export function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const returnTo = useMemo(() => search.get("returnTo") || "/jobs", [search])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setError(err.message)
      setBusy(false)
      return
    }
    router.push(returnTo)
    router.refresh()
  }

  const signInGoogle = async () => {
    setBusy(true)
    setError(null)
    const origin = window.location.origin
    const redirectTo = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    if (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

      <div className="grid gap-2">
        <div className="text-sm font-medium">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@domain.com" autoComplete="email" />
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Password</div>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" />
      </div>

      <Button onClick={signIn} disabled={busy || !email.trim() || !password} className="h-12">
        {busy ? <Spinner /> : null}
        Log in
      </Button>

      <div className="text-center text-xs text-muted-foreground">or</div>

      <Button variant="secondary" onClick={signInGoogle} disabled={busy} className="h-12">
        {busy ? <Spinner /> : null}
        Continue with Google
      </Button>

      <div className="text-sm text-muted-foreground">
        New to Truckinzy?{" "}
        <a className="text-foreground underline underline-offset-4" href={`/auth/sign_up?returnTo=${encodeURIComponent(returnTo)}`}>
          Create account
        </a>
      </div>
    </div>
  )
}
