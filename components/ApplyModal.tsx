"use client"

import { useEffect, useState } from "react"
import type { Job } from "@/lib/types"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { ApplyStepper } from "@/components/ApplyStepper"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { useRouter } from "next/navigation"

export function ApplyModal({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  const [cookieAccepted, setCookieAccepted] = useState(false)
  const { session } = useSupabaseSession()
  const router = useRouter()

  useEffect(() => {
    const consent = typeof document !== "undefined" ? document.cookie.includes("cookie_consent=true") : false
    setCookieAccepted(consent)
  }, [])

  const start = () => {
    if (!cookieAccepted) {
      document.cookie = "cookie_consent=true; path=/; max-age=31536000"
      setCookieAccepted(true)
    }

    if (!session) {
      router.push(`/auth/sign_up?returnTo=${encodeURIComponent(`/apply/${job.id}`)}`)
      return
    }

    setOpen(true)
  }

  return (
    <div className="grid gap-2">
      <Button onClick={start} className="w-full">
        {session ? "Apply" : "Sign up to apply"}
      </Button>
      {!cookieAccepted ? <div className="text-xs text-muted-foreground">Cookie consent is required to keep you signed in.</div> : null}

      <Modal open={open} onClose={() => setOpen(false)} title={`Apply — ${job.title}`}>
        <ApplyStepper job={job} />
      </Modal>
    </div>
  )
}
