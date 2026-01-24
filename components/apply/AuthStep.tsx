"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ensureAttributionAccepted } from "@/lib/attribution"
import { Button } from "@/components/ui/Button"
import { Card, CardBody } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

export function AuthStep({ jobId, onError }: { jobId: string; onError: (message: string | null) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const returnTo = useMemo(() => `/apply/${jobId}`, [jobId])

  const signInGoogle = async () => {
    setBusy(true)
    onError(null)
    ensureAttributionAccepted()
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || window.location.origin
    const redirectTo = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    setBusy(false)
  }

  const signInPassword = async () => {
    if (!email.trim() || !password) {
      onError("Enter email and password")
      return
    }
    setBusy(true)
    onError(null)
    ensureAttributionAccepted()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) onError(error.message)
    setBusy(false)
  }

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="grid gap-4">
          <div>
            <div className="text-base font-semibold">Sign in to apply</div>
            <div className="mt-1 text-sm text-muted-foreground">Use Google or email + password.</div>
          </div>

          <Button onClick={signInGoogle} disabled={busy} className="w-full">
            {busy ? <Spinner /> : null}
            Continue with Google
          </Button>

          <div className="grid gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
            <Button variant="secondary" onClick={signInPassword} disabled={busy} className="w-full">
              {busy ? <Spinner /> : null}
              Log in
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            New here?{" "}
            <a className="underline underline-offset-4" href={`/auth/sign_up?returnTo=${encodeURIComponent(returnTo)}`}>
              Create an account
            </a>
            .
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
