import { Suspense } from "react"
import { MyWork } from "@/components/dashboard/MyWork"

export default function MyWorkPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border bg-card p-8">Loading…</div>}>
      <MyWork />
    </Suspense>
  )
}
