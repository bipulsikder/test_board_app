"use client"

import { useMemo, useState } from "react"

export function ExpandableText({ text, collapsedChars = 420 }: { text: string; collapsedChars?: number }) {
  const [open, setOpen] = useState(false)

  const normalized = useMemo(() => (text || "").trim(), [text])
  const needsToggle = normalized.length > collapsedChars

  const shown = useMemo(() => {
    if (!needsToggle) return normalized
    if (open) return normalized
    return `${normalized.slice(0, collapsedChars).trim()}…`
  }, [normalized, needsToggle, open, collapsedChars])

  return (
    <div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{shown}</div>
      {needsToggle ? (
        <button className="mt-3 text-sm font-medium text-foreground underline underline-offset-4" onClick={() => setOpen((v) => !v)}>
          {open ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  )
}

