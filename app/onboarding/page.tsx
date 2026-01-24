import { Suspense } from "react"
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow"

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10">Loading…</div>}>
      <OnboardingFlow />
    </Suspense>
  )
}
