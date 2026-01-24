import { MyWork } from "@/components/dashboard/MyWork"
import { Suspense } from "react"

export default function MyWorkPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border bg-card p-8">Loading…</div>}>
      <MyWork />
    </Suspense>
  )
}
