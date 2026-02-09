"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"
import { useSupabaseSession } from "@/lib/useSupabaseSession"
import { bearerHeaders } from "@/lib/http"

type Availability = {
  looking_for_work: boolean
  open_job_types: string[]
  available_start_time: string | null
  available_end_time: string | null
  work_timezone: string | null
  preferred_location: string
}

const JOB_TYPES = [
  { id: "full_time", label: "Full time roles" },
  { id: "part_time", label: "Part time roles" },
  { id: "direct_hire", label: "Employee (direct hire) roles" },
  { id: "contract", label: "Contract roles" }
]

const TIME_OPTIONS = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM"
]

const TZ_OPTIONS = [
  "Indian Standard Time (IST), Sri Lanka Time (SLST)",
  "UTC",
  "US Eastern Time (ET)",
  "US Pacific Time (PT)",
  "Europe Central Time (CET)"
]

export function WorkAvailabilityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useSupabaseSession()
  const accessToken = session?.access_token

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<Availability>({
    looking_for_work: true,
    open_job_types: ["full_time", "part_time", "direct_hire"],
    available_start_time: "9:00 AM",
    available_end_time: "5:00 PM",
    work_timezone: TZ_OPTIONS[0],
    preferred_location: ""
  })

  useEffect(() => {
    if (!open) return
    if (!accessToken) return
    setLoading(true)
    setError(null)
    fetch("/api/candidate/availability", { headers: bearerHeaders(accessToken) })
      .then(async (r) => {
        const j = await r.json().catch(() => null)
        if (!r.ok) throw new Error(j?.error || "Failed to load")
        return j?.availability
      })
      .then((av) => {
        if (!av) return
        setData({
          looking_for_work: Boolean(av.looking_for_work),
          open_job_types: Array.isArray(av.open_job_types) ? av.open_job_types : [],
          available_start_time: av.available_start_time || "9:00 AM",
          available_end_time: av.available_end_time || "5:00 PM",
          work_timezone: av.work_timezone || TZ_OPTIONS[0],
          preferred_location: av.preferred_location || ""
        })
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false))
  }, [open, accessToken])

  const toggleJobType = (id: string) => {
    setData((prev) => {
      const set = new Set(prev.open_job_types)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, open_job_types: Array.from(set) }
    })
  }

  const canSave = useMemo(() => {
    if (!data.looking_for_work) return true
    if (!data.open_job_types.length) return false
    if (!data.available_start_time || !data.available_end_time) return false
    if (!data.work_timezone) return false
    return true
  }, [data])

  const save = async () => {
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/candidate/availability", {
        method: "PUT",
        headers: bearerHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify(data)
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || "Failed to save")
      onClose()
    } catch (e: any) {
      setError(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set your work availability">
      <div className="grid gap-4">
        <div className="text-sm text-muted-foreground">
          If you’re looking for work, select the job types and hours you’re open to working, and it’ll appear on your profile.
        </div>

        {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div> : null}

        <label className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
          <div className="text-sm font-medium">I’m looking for work</div>
          <input
            type="checkbox"
            checked={data.looking_for_work}
            onChange={(e) => setData((p) => ({ ...p, looking_for_work: e.target.checked }))}
          />
        </label>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Job types I’m open to:</div>
          <div className="grid gap-2">
            {JOB_TYPES.map((t) => (
              <label key={t.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm">
                <input type="checkbox" checked={data.open_job_types.includes(t.id)} onChange={() => toggleJobType(t.id)} disabled={!data.looking_for_work} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Hours I’m available to work:</div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-sm font-medium">Working hours</div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <select
                value={data.available_start_time || ""}
                onChange={(e) => setData((p) => ({ ...p, available_start_time: e.target.value }))}
                disabled={!data.looking_for_work}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="text-sm text-muted-foreground">to</div>
              <select
                value={data.available_end_time || ""}
                onChange={(e) => setData((p) => ({ ...p, available_end_time: e.target.value }))}
                disabled={!data.looking_for_work}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 text-sm font-medium">Timezone</div>
            <select
              value={data.work_timezone || ""}
              onChange={(e) => setData((p) => ({ ...p, work_timezone: e.target.value }))}
              disabled={!data.looking_for_work}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {TZ_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-muted-foreground">By default, we assume you work in your location’s timezone.</div>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Preferred location</div>
          <input
            value={data.preferred_location}
            onChange={(e) => setData((p) => ({ ...p, preferred_location: e.target.value }))}
            disabled={!data.looking_for_work}
            placeholder="e.g. Ahmedabad, Remote, India"
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <div className="text-xs text-muted-foreground">Used for better job matching and recruiter filters.</div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!accessToken || saving || loading || !canSave}>
            {saving || loading ? <Spinner /> : null}
            Save my availability
          </Button>
        </div>
      </div>
    </Modal>
  )
}
