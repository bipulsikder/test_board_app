"use client"

type Attribution = {
  id: string
  acceptedAt: string
  referrer: string
  landingPath: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

const STORAGE_KEY = "truckinzy_attribution_v1"

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `attr_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Attribution
  } catch {
    return null
  }
}

export function ensureAttributionAccepted() {
  const now = new Date().toISOString()

  const existing = getAttribution()
  if (existing) return existing

  const url = new URL(window.location.href)

  const attr: Attribution = {
    id: randomId(),
    acceptedAt: now,
    referrer: document.referrer || "",
    landingPath: url.pathname + url.search,
    utm_source: url.searchParams.get("utm_source") || undefined,
    utm_medium: url.searchParams.get("utm_medium") || undefined,
    utm_campaign: url.searchParams.get("utm_campaign") || undefined,
    utm_term: url.searchParams.get("utm_term") || undefined,
    utm_content: url.searchParams.get("utm_content") || undefined
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(attr))
  return attr
}

