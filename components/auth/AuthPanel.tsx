"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ensureAttributionAccepted } from "@/lib/attribution"
import { Button } from "@/components/ui/Button"
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

export function AuthPanel({ title = "Sign in" }: { title?: string }) {
  const search = useSearchParams()
  const returnTo = useMemo(() => search.get("returnTo") || "/dashboard", [search])

  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/dashboard")}`
      : undefined

  const signInGoogle = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    ensureAttributionAccepted()
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo || window.location.href } })
    setBusy(false)
  }

  const sendMagicLink = async () => {
    if (!email.trim()) {
      setError("Enter an email")
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    ensureAttributionAccepted()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo || window.location.href }
    })
    if (err) setError(err.message)
    else setMessage("Magic link sent. Check your inbox.")
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Sign in to apply and track applications.</CardDescription>
      </CardHeader>
      <CardBody className="grid gap-3">
        {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{message}</div> : null}

        <Button onClick={signInGoogle} disabled={busy} className="w-full">
          {busy ? <Spinner /> : null}
          Continue with Google
        </Button>

        <div className="grid gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for magic link" type="email" />
          <Button variant="secondary" onClick={sendMagicLink} disabled={busy} className="w-full">
            {busy ? <Spinner /> : null}
            Send magic link
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
