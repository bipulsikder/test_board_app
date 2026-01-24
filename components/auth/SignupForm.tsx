"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

export function SignupForm() {
  const search = useSearchParams()
  const returnTo = useMemo(() => search.get("returnTo") || "/onboarding", [search])

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const signUp = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)

    const origin = window.location.origin
    const emailRedirectTo = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`

    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo, data: { full_name: fullName.trim() } }
    })

    if (err) {
      setError(err.message)
      setBusy(false)
      return
    }

    setMessage("Check your email to confirm your account. Then you’ll be redirected to continue setup.")
    setBusy(false)
  }

  const signUpGoogle = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
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
      {message ? <div className="rounded-2xl border border-border bg-accent px-4 py-3 text-sm">{message}</div> : null}

      <div className="grid gap-2">
        <div className="text-sm font-medium">Full name</div>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Your name" autoComplete="name" />
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@domain.com" autoComplete="email" />
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Password</div>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Create a password" autoComplete="new-password" />
      </div>

      <Button onClick={signUp} disabled={busy || !fullName.trim() || !email.trim() || password.length < 8} className="h-12">
        {busy ? <Spinner /> : null}
        Continue
      </Button>

      <div className="text-xs text-muted-foreground">Use at least 8 characters.</div>

      <div className="text-center text-xs text-muted-foreground">or</div>

      <Button variant="secondary" onClick={signUpGoogle} disabled={busy} className="h-12">
        {busy ? <Spinner /> : null}
        Continue with Google
      </Button>

      <div className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <a className="text-foreground underline underline-offset-4" href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
          Log in
        </a>
      </div>
    </div>
  )
}
