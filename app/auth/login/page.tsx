import { Suspense } from "react"
import { AuthShell } from "@/components/auth/AuthShell"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <AuthShell title="Log in" subtitle="Sign in to apply and manage your profile.">
      <Suspense fallback={<div className="h-[320px] rounded-2xl border bg-card" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}

