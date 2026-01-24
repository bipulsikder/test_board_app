"use client"

import type { PropsWithChildren } from "react"

export function Modal({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close modal" />
      <div className="relative mx-auto flex min-h-full max-w-3xl items-start p-4 pt-10">
        <div className="w-full max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="text-sm font-semibold">{title}</div>
            <button className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
