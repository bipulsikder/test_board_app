import { Suspense } from "react"
import { AuthShell } from "@/components/auth/AuthShell"
import { SignupForm } from "@/components/auth/SignupForm"

export default function SignUpPage() {
  return (
    <AuthShell title="Create account" subtitle="Start with email + password or Google.">
      <Suspense fallback={<div className="h-[360px] rounded-2xl border bg-card" />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  )
}

